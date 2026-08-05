from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.schemas.document import DocumentResponse
from app.services.retriever import search_documents

router = APIRouter(
    prefix="/knowledge",
    tags=["Knowledge Base"]
)


@router.get("/search", response_model=list[DocumentResponse])
def search_knowledge(q: str, db: Session = Depends(get_db)):
    return search_documents(q, db)