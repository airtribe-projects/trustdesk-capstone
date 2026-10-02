"""Persistence queries for knowledge documents."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import KnowledgeDocument


def list_knowledge_documents(session: Session) -> list[KnowledgeDocument]:
    """Load documents in a stable order for deterministic keyword ranking."""

    return list(
        session.scalars(
            select(KnowledgeDocument).order_by(KnowledgeDocument.doc_id)
        ).all()
    )
