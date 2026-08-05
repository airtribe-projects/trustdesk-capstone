from sqlalchemy import Column, String, Float, ForeignKey, JSON
from app.database.database import Base


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