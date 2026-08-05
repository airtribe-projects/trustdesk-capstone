from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.customer import Customer
from app.schemas.customer import CustomerResponse

router = APIRouter(
    prefix="/customers",
    tags=["Customers"]
)


@router.get("/", response_model=list[CustomerResponse])
def get_customers(db: Session = Depends(get_db)):
    return db.query(Customer).all()


@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(customer_id: str, db: Session = Depends(get_db)):
    return db.query(Customer).filter(
        Customer.customer_id == customer_id
    ).first()