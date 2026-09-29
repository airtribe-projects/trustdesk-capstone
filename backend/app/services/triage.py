"""Ticket triage orchestration, validation, and persistence."""

from datetime import datetime, timezone
from uuid import uuid4

from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, joinedload

from ..ai.triage_adapter import DeterministicTriageAdapter, TriageContext, TriageModelAdapter
from ..models import AgentRun, KnowledgeDocument, Ticket
from ..schemas import TriageResult
from .retrieval import search_knowledge_documents


class TicketNotFoundError(Exception):
    """Raised when a requested ticket does not exist."""


class RetrievalFailureError(Exception):
    """Raised when required policy context cannot be retrieved."""


class InvalidTriageOutputError(Exception):
    """Raised when the configured model adapter returns invalid values."""


class TriageAdapterError(Exception):
    """Raised when a model adapter cannot produce a triage result."""


def triage_ticket(
    session: Session,
    ticket_id: str,
    adapter: TriageModelAdapter | None = None,
) -> tuple[TriageResult, str]:
    """Triage one ticket and persist its structured result and minimal trace."""

    ticket = session.scalar(
        select(Ticket)
        .options(joinedload(Ticket.customer), joinedload(Ticket.order))
        .where(Ticket.ticket_id == ticket_id)
    )
    if ticket is None:
        raise TicketNotFoundError(ticket_id)

    query = f"{ticket.subject} {ticket.body}"
    try:
        retrieval_results = search_knowledge_documents(session, query, top_k=3)
        retrieved_ids = [result.doc_id for result in retrieval_results]
        documents = tuple(
            session.scalars(
                select(KnowledgeDocument).where(KnowledgeDocument.doc_id.in_(retrieved_ids))
            ).all()
        ) if retrieved_ids else ()
    except SQLAlchemyError as exc:
        raise RetrievalFailureError("Knowledge retrieval failed") from exc

    context = TriageContext(
        ticket=ticket,
        customer=ticket.customer,
        order=ticket.order,
        retrieved_documents=documents,
    )
    selected_adapter = adapter or DeterministicTriageAdapter()
    try:
        candidate = selected_adapter.classify(context)
    except TriageAdapterError:
        raise
    try:
        result = TriageResult.model_validate(candidate)
    except (ValidationError, TypeError) as exc:
        raise InvalidTriageOutputError("Triage adapter returned invalid structured output") from exc

    run_id = f"run_{uuid4().hex}"
    now = datetime.now(timezone.utc)
    ticket.category = result.category.value
    ticket.priority = result.priority.value
    ticket.sentiment = result.sentiment.value
    ticket.should_escalate = result.should_escalate
    ticket.triage_reason = result.triage_reason
    ticket.triaged_at = now
    session.add(
        AgentRun(
            run_id=run_id,
            ticket_id=ticket.ticket_id,
            run_type="triage",
            status="completed",
            retrieved_doc_ids=retrieved_ids,
            tool_calls=[],
            guardrail_results={},
            created_at=now,
        )
    )
    session.commit()
    return result, run_id
