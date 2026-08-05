from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from app.database.database import Base


class TriageResult(Base):
    __tablename__ = "triage_results"

    id = Column(Integer, primary_key=True, index=True)

    ticket_id = Column(
        String,
        ForeignKey("tickets.ticket_id"),
        unique=True
    )

    category = Column(String)

    priority = Column(String)

    sentiment = Column(String)

    escalate = Column(Boolean)

    reason = Column(String)