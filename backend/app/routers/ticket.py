from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.ticket import Ticket
from app.schemas.ticket import TicketResponse

from app.models.customer import Customer
from app.models.order import Order
from app.schemas.context import TicketContextResponse

router = APIRouter(
    prefix="/tickets",
    tags=["Tickets"]
)


@router.get("/", response_model=list[TicketResponse])
def get_tickets(db: Session = Depends(get_db)):
    """
    Get all tickets
    """
    return db.query(Ticket).all()


@router.get("/{ticket_id}", response_model=TicketResponse)
def get_ticket(ticket_id: str, db: Session = Depends(get_db)):
    """
    Get a single ticket by Ticket ID
    """
    ticket = db.query(Ticket).filter(
        Ticket.ticket_id == ticket_id
    ).first()

    if not ticket:
        raise HTTPException(
            status_code=404,
            detail="Ticket not found"
        )

    return ticket

@router.get(
    "/{ticket_id}/context",
    response_model=TicketContextResponse
)
def get_ticket_context(
    ticket_id: str,
    db: Session = Depends(get_db)
):

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

    customer = (
        db.query(Customer)
        .filter(Customer.customer_id == ticket.customer_id)
        .first()
    )

    if not customer:
        raise HTTPException(
            status_code=404,
            detail="Customer not found"
        )

    order = (
        db.query(Order)
        .filter(Order.order_id == ticket.order_id)
        .first()
    )

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )

    return {
        "ticket": ticket,
        "customer": customer,
        "order": order
    }