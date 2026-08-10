from sqlalchemy import Column, Integer, String, Text
from app.database.database import Base


class AIRun(Base):
    __tablename__ = "ai_runs"

    id = Column(Integer, primary_key=True, index=True)

    ticket_id = Column(String)

    run_type = Column(String)
    # triage or draft_reply

    retrieved_docs = Column(Text)
    # Store as comma-separated IDs

    recommended_tool = Column(String)

    guardrail_status = Column(String)

    final_status = Column(String)