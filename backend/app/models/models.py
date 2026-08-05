from sqlalchemy import (
    Column,
    String,
    Boolean,
    JSON
)
from app.database.database import Base

class Customer(Base):
    __tablename__ = "customers"

    customer_id = Column(String, primary_key=True, index=True)

    name = Column(String, nullable=False)

    email = Column(String, nullable=False)

    tier = Column(String)

    country = Column(String)

    created_at = Column(String)

    verified = Column(Boolean)

    tags = Column(JSON)


from sqlalchemy import Float, ForeignKey

class Order(Base):
    __tablename__ = "orders"

    order_id = Column(String, primary_key=True, index=True)

    customer_id = Column(
        String,
        ForeignKey("customers.customer_id")
    )

    status = Column(String)

    placed_at = Column(String)

    delivered_at = Column(String)

    eligible_return_until = Column(String)

    total = Column(Float)

    currency = Column(String)

    payment_status = Column(String)

    tracking_number = Column(String)

    items = Column(JSON)    

from sqlalchemy import Text

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



class Document(Base):

    __tablename__ = "documents"

    document_id = Column(
        String,
        primary_key=True,
        index=True
    )

    title = Column(String)

    content = Column(Text)

    category = Column(String)        


class ToolAction(Base):

    __tablename__ = "tool_actions"

    tool_name = Column(
        String,
        primary_key=True
    )

    description = Column(Text)

    risk_level = Column(String)

    requires_human_approval = Column(Boolean)

    allowed_categories = Column(JSON)

    required_fields = Column(JSON)


    