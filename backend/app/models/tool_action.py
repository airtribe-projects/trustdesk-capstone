from sqlalchemy import Column, String, Text, Boolean, JSON
from app.database.database import Base


class ToolAction(Base):
    __tablename__ = "tool_actions"

    tool_name = Column(
        String,
        primary_key=True,
        index=True
    )

    description = Column(Text)

    risk_level = Column(String)

    requires_human_approval = Column(Boolean)

    allowed_categories = Column(JSON)

    required_fields = Column(JSON)