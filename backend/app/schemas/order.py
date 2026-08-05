from pydantic import BaseModel


class OrderResponse(BaseModel):
    order_id: str
    customer_id: str
    status: str
    placed_at: str | None
    delivered_at: str | None
    eligible_return_until: str | None
    total: float
    currency: str
    payment_status: str
    tracking_number: str | None
    items: list

    class Config:
        from_attributes = True