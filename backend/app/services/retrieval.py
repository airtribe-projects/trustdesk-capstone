"""Keyword-based knowledge document retrieval."""

import re
from dataclasses import dataclass

from sqlalchemy.orm import Session

from ..models import KnowledgeDocument
from ..repositories.knowledge_documents import list_knowledge_documents


STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "but", "by", "can", "do",
    "for", "from", "has", "have", "i", "if", "in", "is", "it", "me",
    "my", "no", "not", "of", "on", "or", "our", "please", "the", "this",
    "to", "was", "with", "you", "your",
}


@dataclass(frozen=True)
class SearchResult:
    """A ranked document excerpt; document text remains retrieved data."""

    doc_id: str
    title: str
    snippet: str
    score: int


def _tokens(text: str) -> set[str]:
    return {
        token
        for token in re.findall(r"[a-z0-9_]+", text.lower())
        if token not in STOPWORDS and len(token) > 2
    }


def _snippet(document: KnowledgeDocument, query_tokens: set[str]) -> str:
    for line in document.content.splitlines():
        stripped = line.strip()
        lower = stripped.lower()
        if (
            not stripped
            or stripped.startswith("#")
            or lower.startswith(("doc id:", "audience:", "version:"))
        ):
            continue
        if query_tokens & _tokens(stripped):
            return stripped[:300]

    text = " ".join(line.strip() for line in document.content.splitlines() if line.strip())
    return text[:300]


def search_knowledge_documents(
    session: Session,
    query: str,
    top_k: int = 3,
) -> list[SearchResult]:
    """Rank knowledge documents using deterministic keyword overlap.

    Title matches receive extra weight so a policy document can rank above an
    unrelated document that merely mentions the same term. No document text
    is interpreted or executed by the retrieval service.
    """

    query_tokens = _tokens(query)
    if not query_tokens:
        return []

    ranked: list[tuple[int, KnowledgeDocument]] = []
    for document in list_knowledge_documents(session):
        title_matches = len(query_tokens & _tokens(document.title))
        document_matches = len(
            query_tokens
            & _tokens(f"{document.doc_id} {document.content}")
        )
        score = title_matches * 2 + document_matches
        if score:
            ranked.append((score, document))

    ranked.sort(key=lambda item: (-item[0], item[1].doc_id))
    return [
        SearchResult(
            doc_id=document.doc_id,
            title=document.title,
            snippet=_snippet(document, query_tokens),
            score=score,
        )
        for score, document in ranked[:top_k]
    ]
