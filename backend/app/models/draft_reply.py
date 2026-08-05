from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey
from app.database.database import Base


class DraftReply(Base):
    __tablename__ = "draft_replies"

    id = Column(Integer, primary_key=True, index=True)

    ticket_id = Column(
        String,
        ForeignKey("tickets.ticket_id"),
        unique=True
    )

    reply = Column(Text)

    status = Column(
        String,
        default="Draft"
    )

    approved = Column(
        Boolean,
        default=False
    )

    approved_by = Column(String, nullable=True)
    review_comment = Column(String, nullable=True)