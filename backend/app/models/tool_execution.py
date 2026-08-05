from sqlalchemy import Column, Integer, String, ForeignKey
from app.database.database import Base


class ToolExecution(Base):
    __tablename__ = "tool_executions"

    id = Column(Integer, primary_key=True, index=True)

    ticket_id = Column(
        String,
        ForeignKey("tickets.ticket_id")
    )

    tool_name = Column(String)

    status = Column(
        String,
        default="Pending Approval"
    )

    approved_by = Column(
        String,
        nullable=True
    )

    execution_result = Column(
        String,
        nullable=True
    )

    idempotency_key = Column(
        String,
        unique=True
    )