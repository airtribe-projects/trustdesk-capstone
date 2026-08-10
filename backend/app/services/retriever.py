from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.document import Document


def search_documents(query: str, db: Session):
    """
    Search knowledge base documents by keyword.
    """

    documents = (
        db.query(Document)
        .filter(
            or_(
                Document.title.ilike(f"%{query}%"),
                Document.content.ilike(f"%{query}%")
            )
        )
        .all()
    )

    return documents