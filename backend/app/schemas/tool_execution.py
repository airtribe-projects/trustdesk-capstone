from pydantic import BaseModel


class ToolRequest(BaseModel):
    ticket_id: str
    tool_name: str


class ToolExecutionResponse(BaseModel):
    id: int
    ticket_id: str
    tool_name: str
    status: str
    approved_by: str | None
    execution_result: str | None
    idempotency_key: str

    class Config:
        from_attributes = True

class ToolApprovalRequest(BaseModel):
    approved_by: str        