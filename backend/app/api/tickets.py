"""Ticket and linked customer/order context endpoints."""

from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from ..auth import require_api_token
from ..database import get_db
from ..models import Customer, Order, Ticket
from ..schemas import (
    CustomerResponse,
    OrderResponse,
    TicketContextResponse,
    TicketCreateRequest,
    TicketListResponse,
    TicketTriageResponse,
    TicketResponse,
)
from ..ai.triage_adapter import TriageModelAdapter, get_triage_adapter
from ..services.triage import (
    InvalidTriageOutputError,
    RetrievalFailureError,
    TicketNotFoundError,
    TriageAdapterError,
    triage_ticket,
)


router = APIRouter(
    prefix="/tickets",
    tags=["tickets"],
    dependencies=[Depends(require_api_token)],
)


def _get_ticket(session: Session, ticket_id: str) -> Ticket:
    ticket = session.scalar(
        select(Ticket)
        .options(joinedload(Ticket.customer), joinedload(Ticket.order))
        .where(Ticket.ticket_id == ticket_id)
    )
    if ticket is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticket '{ticket_id}' not found",
        )
    return ticket


@router.get("", response_model=TicketListResponse)
def list_tickets(session: Session = Depends(get_db)) -> TicketListResponse:
    """Return all persisted tickets from the canonical database."""

    tickets = session.scalars(select(Ticket).order_by(Ticket.ticket_id)).all()
    total = session.scalar(select(func.count()).select_from(Ticket)) or 0
    return TicketListResponse(items=tickets, total=total)


@router.get("/{ticket_id}", response_model=TicketResponse)
def get_ticket(ticket_id: str, session: Session = Depends(get_db)) -> Ticket:
    """Return one ticket by its stable ticket ID."""

    return _get_ticket(session, ticket_id)


@router.get("/{ticket_id}/context", response_model=TicketContextResponse)
def get_ticket_context(ticket_id: str, session: Session = Depends(get_db)) -> TicketContextResponse:
    """Return a ticket and its linked customer and optional order context."""

    ticket = _get_ticket(session, ticket_id)
    return TicketContextResponse(
        ticket=ticket,
        customer=CustomerResponse.model_validate(ticket.customer),
        order=OrderResponse.model_validate(ticket.order) if ticket.order else None,
    )


@router.post("", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
def create_ticket(
    payload: TicketCreateRequest,
    session: Session = Depends(get_db),
) -> Ticket:
    """Persist a new customer support ticket without AI decision fields."""

    customer = session.get(Customer, payload.customer_id)
    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Customer '{payload.customer_id}' not found",
        )

    if payload.order_id is not None:
        order = session.get(Order, payload.order_id)
        if order is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Order '{payload.order_id}' not found",
            )
        if order.customer_id != payload.customer_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Order does not belong to the specified customer",
            )

    ticket = Ticket(
        ticket_id=f"tkt_{uuid4().hex}",
        customer_id=payload.customer_id,
        order_id=payload.order_id,
        channel=payload.channel,
        subject=payload.subject,
        body=payload.body,
        created_at=datetime.now(timezone.utc),
        status="open",
        expected_actions=[],
    )
    session.add(ticket)
    session.commit()
    session.refresh(ticket)
    return ticket


@router.post("/{ticket_id}/triage", response_model=TicketTriageResponse)
def run_ticket_triage(
    ticket_id: str,
    session: Session = Depends(get_db),
    adapter: TriageModelAdapter = Depends(get_triage_adapter),
) -> TicketTriageResponse:
    """Classify and persist a ticket's triage result."""

    try:
        result, run_id = triage_ticket(session, ticket_id, adapter)
    except TicketNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticket '{ticket_id}' not found",
        ) from exc
    except RetrievalFailureError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Knowledge retrieval is unavailable",
        ) from exc
    except TriageAdapterError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Triage adapter is unavailable",
        ) from exc
    except InvalidTriageOutputError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Triage adapter returned invalid output",
        ) from exc

    return TicketTriageResponse(
        ticket_id=ticket_id,
        category=result.category,
        priority=result.priority,
        sentiment=result.sentiment,
        should_escalate=result.should_escalate,
        triage_reason=result.triage_reason,
        reason_summary=result.triage_reason,
        run_id=run_id,
    )
