from pydantic import BaseModel


class CustomerResponse(BaseModel):
    customer_id: str
    name: str
    email: str
    tier: str
    country: str
    verified: bool

    class Config:
        from_attributes = True