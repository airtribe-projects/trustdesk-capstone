"""Authenticated endpoint for fetching persisted agent-run traces."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth import require_api_token
from ..database import get_db
from ..models import AgentRun
from ..schemas import AgentRunResponse


router = APIRouter(
    prefix="/agent-runs",
    tags=["agent-runs"],
    dependencies=[Depends(require_api_token)],
)


@router.get("/{run_id}", response_model=AgentRunResponse)
def fetch_agent_run(
    run_id: str,
    session: Session = Depends(get_db),
) -> AgentRun:
    """Return an existing trace without triggering or changing an agent run."""

    run = session.get(AgentRun, run_id)
    if run is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent run '{run_id}' not found",
        )
    return run
