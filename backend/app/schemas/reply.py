from pydantic import BaseModel

class DraftReplyResponse(BaseModel):
    id: int
    ticket_id: str
    reply: str
    status: str
    approved: bool

    class Config:
        from_attributes = True