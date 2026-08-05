from pydantic import BaseModel

from app.schemas.customer import CustomerResponse
from app.schemas.order import OrderResponse
from app.schemas.ticket import TicketResponse


class TicketContextResponse(BaseModel):
    ticket: TicketResponse
    customer: CustomerResponse
    order: OrderResponse