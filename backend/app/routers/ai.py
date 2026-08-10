from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.ticket import Ticket
from app.models.customer import Customer
from app.models.order import Order

from app.services.retriever import search_documents
from app.services.triage_service import triage_ticket
from app.schemas.triage import TriageResponse

router = APIRouter(
    prefix="/ai",
    tags=["AI"]
)


@router.post("/tickets/{ticket_id}/triage",
            response_model=TriageResponse)
def triage(ticket_id: str, db: Session = Depends(get_db)):
    # Fetch ticket
    ticket = db.query(Ticket).filter(
        Ticket.ticket_id == ticket_id
    ).first()

    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # Fetch customer
    customer = db.query(Customer).filter(
        Customer.customer_id == ticket.customer_id
    ).first()

    # Fetch order
    order = db.query(Order).filter(
        Order.order_id == ticket.order_id
    ).first()

    # Retrieve knowledge
    query = f"{ticket.subject} {ticket.body}"
    knowledge_docs = search_documents(query, db)

    # AI triage
    result = triage_ticket(
        ticket,
        customer,
        order,
        knowledge_docs,
        db
    )

    return result