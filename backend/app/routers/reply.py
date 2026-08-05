from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_db

from app.models.ticket import Ticket
from app.models.customer import Customer
from app.models.order import Order
from app.models.triage_result import TriageResult

from app.schemas.reply import DraftReplyResponse
from app.schemas.review import ApproveRequest
from app.models.draft_reply import DraftReply

from app.schemas.review import RejectRequest

from app.services.retriever import search_documents
from app.services.reply_service import generate_reply

router = APIRouter(
    prefix="/reply",
    tags=["AI Reply"]
)

@router.post(
    "/tickets/{ticket_id}/reply",
    response_model=DraftReplyResponse
)
def create_reply(ticket_id: str, db: Session = Depends(get_db)):

    # Fetch ticket
    ticket = (
        db.query(Ticket)
        .filter(Ticket.ticket_id == ticket_id)
        .first()
    )

    if not ticket:
        raise HTTPException(
            status_code=404,
            detail="Ticket not found"
        )

    # Fetch customer
    customer = (
        db.query(Customer)
        .filter(Customer.customer_id == ticket.customer_id)
        .first()
    )

    # Fetch order
    order = (
        db.query(Order)
        .filter(Order.order_id == ticket.order_id)
        .first()
    )

    # Fetch triage result
    triage = (
        db.query(TriageResult)
        .filter(TriageResult.ticket_id == ticket.ticket_id)
        .first()
    )

    if not triage:
        raise HTTPException(
            status_code=400,
            detail="Run AI triage first."
        )

    # Retrieve knowledge
    query = f"{ticket.subject} {ticket.body}"

    knowledge_docs = search_documents(query, db)

    # Generate reply
    return generate_reply(
        ticket,
        customer,
        order,
        triage,
        knowledge_docs,
        db
    )

@router.post("/{ticket_id}/approve")
def approve_reply(
    ticket_id: str,
    request: ApproveRequest,
    db: Session = Depends(get_db)
):

    draft = (
        db.query(DraftReply)
        .filter(DraftReply.ticket_id == ticket_id)
        .first()
    )

    if not draft:
        raise HTTPException(
            status_code=404,
            detail="Draft reply not found"
        )

    draft.status = "Approved"
    draft.approved = True
    draft.approved_by = request.approved_by

    db.commit()
    db.refresh(draft)

    return {
        "message": "Reply approved successfully.",
        "draft": draft
    }


@router.post("/{ticket_id}/reject")
def reject_reply(
    ticket_id: str,
    request: RejectRequest,
    db: Session = Depends(get_db)
):

    draft = (
        db.query(DraftReply)
        .filter(DraftReply.ticket_id == ticket_id)
        .first()
    )

    if not draft:
        raise HTTPException(
            status_code=404,
            detail="Draft reply not found"
        )

    draft.status = "Rejected"
    draft.approved = False
    draft.review_comment = request.review_comment

    db.commit()
    db.refresh(draft)

    return {
        "message": "Reply rejected.",
        "draft": draft
    }

@router.get("/{ticket_id}")
def get_reply(
    ticket_id: str,
    db: Session = Depends(get_db)
):

    draft = (
        db.query(DraftReply)
        .filter(DraftReply.ticket_id == ticket_id)
        .first()
    )

    if not draft:
        raise HTTPException(
            status_code=404,
            detail="Draft reply not found"
        )

    return draft