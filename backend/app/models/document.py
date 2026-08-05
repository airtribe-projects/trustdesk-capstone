from sqlalchemy import Column, String, Text
from app.database.database import Base


class Document(Base):
    __tablename__ = "documents"

    document_id = Column(
        String,
        primary_key=True,
        index=True
    )

    title = Column(String)

    category = Column(String)

    content = Column(Text)