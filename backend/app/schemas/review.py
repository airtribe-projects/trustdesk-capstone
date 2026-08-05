from pydantic import BaseModel


class ApproveRequest(BaseModel):
    approved_by: str


class RejectRequest(BaseModel):
    review_comment: str