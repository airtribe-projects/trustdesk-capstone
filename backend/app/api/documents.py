"""Knowledge document search endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..auth import require_api_token
from ..database import get_db
from ..schemas import KnowledgeSearchResponse, KnowledgeSearchResult
from ..services.retrieval import search_knowledge_documents


router = APIRouter(
    prefix="/documents",
    tags=["documents"],
    dependencies=[Depends(require_api_token)],
)


@router.get("/search", response_model=KnowledgeSearchResponse)
def search_documents(
    q: str = Query(min_length=1),
    top_k: int = Query(default=3, ge=1),
    session: Session = Depends(get_db),
) -> KnowledgeSearchResponse:
    """Return ranked keyword matches from the seeded knowledge documents."""

    query = q.strip()
    if not query:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Query must not be empty",
        )

    results = search_knowledge_documents(session, query, top_k)
    return KnowledgeSearchResponse(
        query=query,
        results=[
            KnowledgeSearchResult(
                doc_id=result.doc_id,
                title=result.title,
                snippet=result.snippet,
                score=result.score,
            )
            for result in results
        ],
    )
