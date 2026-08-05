from sqlalchemy import Column, String, Text, ForeignKey
from app.database.database import Base


class Ticket(Base):
    __tablename__ = "tickets"

    ticket_id = Column(
        String,
        primary_key=True,
        index=True
    )

    customer_id = Column(
        String,
        ForeignKey("customers.customer_id")
    )

    order_id = Column(
        String,
        ForeignKey("orders.order_id")
    )

    channel = Column(String)

    subject = Column(String)

    body = Column(Text)

    created_at = Column(String)

    status = Column(String)