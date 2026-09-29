"""Draft generation, citation validation, and persistence."""

import re
from dataclasses import asdict
from datetime import datetime, timezone
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, ValidationError, field_validator
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, joinedload

from ..ai.draft_adapter import (
    DraftCandidate,
    DraftContext,
    DraftModelAdapter,
    DeterministicDraftAdapter,
)
from ..models import AgentRun, DraftReply, KnowledgeDocument, Ticket
from ..schemas import RecommendedAction, TriageCategory
from .retrieval import search_knowledge_documents


class DraftTicketNotFoundError(Exception):
    """Raised when a draft is requested for an unknown ticket."""


class DraftRetrievalError(Exception):
    """Raised when required knowledge retrieval fails."""


class DraftGenerationError(Exception):
    """Raised when draft generation or validation fails."""


class CitationValidationError(DraftGenerationError):
    """Raised when a draft citation is malformed, unknown, or not retrieved."""


class ValidatedDraft(BaseModel):
    model_config = ConfigDict(extra="forbid")

    body: str
    citations: list[str]
    recommended_actions: list[RecommendedAction]

    @field_validator("body")
    @classmethod
    def body_must_not_be_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Draft body must not be empty")
        return value


_CITATION_PATTERN = re.compile(r"^KB-[A-Z]+-\d{3}$")


def validate_citations(
    session: Session,
    citations: list[str],
    retrieved_doc_ids: set[str],
) -> None:
    """Ensure citations are canonical, exist, and were retrieved for this run."""

    for citation in citations:
        if not _CITATION_PATTERN.fullmatch(citation):
            raise CitationValidationError(f"Invalid knowledge document citation: {citation}")
        if citation not in retrieved_doc_ids:
            raise CitationValidationError(f"Citation was not retrieved for this draft: {citation}")
        if session.get(KnowledgeDocument, citation) is None:
            raise CitationValidationError(f"Knowledge document does not exist: {citation}")


def _triage_category(ticket: Ticket) -> TriageCategory | None:
    if ticket.category is None:
        return None
    try:
        return TriageCategory(ticket.category)
    except ValueError:
        return None


def generate_draft(
    session: Session,
    ticket_id: str,
    adapter: DraftModelAdapter | None = None,
) -> tuple[DraftReply, str]:
    """Generate and persist a cited, policy-grounded customer reply draft."""

    ticket = session.scalar(
        select(Ticket)
        .options(joinedload(Ticket.customer), joinedload(Ticket.order))
        .where(Ticket.ticket_id == ticket_id)
    )
    if ticket is None:
        raise DraftTicketNotFoundError(ticket_id)

    try:
        retrieval_results = search_knowledge_documents(
            session,
            f"{ticket.subject} {ticket.body}",
            top_k=3,
        )
        retrieved_doc_ids = [result.doc_id for result in retrieval_results]
        retrieved_documents = tuple(
            session.scalars(
                select(KnowledgeDocument).where(KnowledgeDocument.doc_id.in_(retrieved_doc_ids))
            ).all()
        ) if retrieved_doc_ids else ()
    except SQLAlchemyError as exc:
        raise DraftRetrievalError("Knowledge retrieval failed") from exc

    context = DraftContext(
        ticket=ticket,
        customer=ticket.customer,
        order=ticket.order,
        retrieved_documents=retrieved_documents,
        triage_category=_triage_category(ticket),
        triage_should_escalate=ticket.should_escalate,
    )
    try:
        candidate = (adapter or DeterministicDraftAdapter()).generate(context)
        draft = ValidatedDraft.model_validate(
            asdict(candidate) if isinstance(candidate, DraftCandidate) else candidate
        )
        validate_citations(session, draft.citations, set(retrieved_doc_ids))
    except CitationValidationError:
        raise
    except (ValidationError, TypeError, AttributeError) as exc:
        raise DraftGenerationError("Draft adapter returned invalid output") from exc

    draft_id = f"draft_{uuid4().hex}"
    run_id = f"run_{uuid4().hex}"
    created_at = datetime.now(timezone.utc)
    draft_row = DraftReply(
        draft_id=draft_id,
        ticket_id=ticket.ticket_id,
        status="generated",
        body=draft.body,
        citations=draft.citations,
        recommended_actions=[action.model_dump() for action in draft.recommended_actions],
        created_at=created_at,
    )
    trace = AgentRun(
        run_id=run_id,
        ticket_id=ticket.ticket_id,
        run_type="draft_reply",
        status="completed",
        retrieved_doc_ids=retrieved_doc_ids,
        tool_calls=[action.model_dump() for action in draft.recommended_actions],
        guardrail_results={"evidence_sufficient": bool(draft.citations)},
        created_at=created_at,
    )
    session.add_all([draft_row, trace])
    try:
        session.commit()
    except SQLAlchemyError as exc:
        session.rollback()
        raise DraftGenerationError("Draft could not be persisted") from exc
    session.refresh(draft_row)
    return draft_row, run_id
