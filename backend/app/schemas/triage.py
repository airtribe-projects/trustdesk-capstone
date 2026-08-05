from pydantic import BaseModel


class TriageResponse(BaseModel):
    id: int
    ticket_id: str
    category: str
    priority: str
    sentiment: str
    escalate: bool
    reason: str

    class Config:
        from_attributes = True