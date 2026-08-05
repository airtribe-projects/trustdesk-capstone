from pydantic import BaseModel


class TicketResponse(BaseModel):
    ticket_id: str
    customer_id: str
    order_id: str
    channel: str
    subject: str
    body: str
    created_at: str
    status: str

    class Config:
        from_attributes = True