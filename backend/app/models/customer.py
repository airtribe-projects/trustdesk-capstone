from sqlalchemy import Column, String, Boolean, JSON
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