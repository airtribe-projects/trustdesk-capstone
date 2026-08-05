from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.order import Order
from app.schemas.order import OrderResponse

router = APIRouter(
    prefix="/orders",
    tags=["Orders"]
)


@router.get("/", response_model=list[OrderResponse])
def get_orders(db: Session = Depends(get_db)):
    """
    Get all orders
    """
    return db.query(Order).all()


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(order_id: str, db: Session = Depends(get_db)):
    """
    Get a single order by Order ID
    """
    order = db.query(Order).filter(
        Order.order_id == order_id
    ).first()

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )

    return order