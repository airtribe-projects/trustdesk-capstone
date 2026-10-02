"""Draft-reply generation endpoint."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..ai.draft_adapter import DraftModelAdapter, get_draft_adapter
from ..auth import require_api_token
from ..database import get_db
from ..schemas import DraftReplyResponse, RecommendedAction
from ..services.drafts import (
    CitationValidationError,
    DraftGenerationError,
    DraftRetrievalError,
    DraftTicketNotFoundError,
    generate_draft,
)


router = APIRouter(
    prefix="/tickets",
    tags=["drafts"],
    dependencies=[Depends(require_api_token)],
)


@router.post("/{ticket_id}/draft-reply", response_model=DraftReplyResponse)
def create_draft_reply(
    ticket_id: str,
    session: Session = Depends(get_db),
    adapter: DraftModelAdapter = Depends(get_draft_adapter),
) -> DraftReplyResponse:
    """Generate and store a grounded draft reply for an existing ticket."""

    try:
        draft, run_id = generate_draft(session, ticket_id, adapter)
    except DraftTicketNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticket '{ticket_id}' not found",
        ) from exc
    except DraftRetrievalError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Knowledge retrieval is unavailable",
        ) from exc
    except CitationValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc
    except DraftGenerationError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    return DraftReplyResponse(
        draft_id=draft.draft_id,
        ticket_id=draft.ticket_id,
        status=draft.status,
        body=draft.body,
        citations=draft.citations,
        recommended_actions=[
            RecommendedAction.model_validate(action)
            for action in draft.recommended_actions
        ],
        run_id=run_id,
    )
