"""Authenticated endpoints for running and retrieving evaluations."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..ai.draft_adapter import DraftModelAdapter, get_draft_adapter
from ..ai.triage_adapter import TriageModelAdapter, get_triage_adapter
from ..auth import require_api_token
from ..database import get_db
from ..models import EvalRun
from ..schemas import EvalRunRequest, EvalRunResponse
from ..services.evaluation import (
    EvaluationDataError,
    EvaluationSelectionError,
    get_evaluation,
    run_evaluation,
)


router = APIRouter(
    prefix="/eval-runs",
    tags=["evaluations"],
    dependencies=[Depends(require_api_token)],
)


def _response(run: EvalRun) -> EvalRunResponse:
    return EvalRunResponse(
        eval_run_id=run.eval_run_id,
        started_at=run.started_at,
        completed_at=run.completed_at,
        total_cases=run.total_cases,
        metrics=run.metrics,
        case_results=run.case_results,
    )


@router.post("", response_model=EvalRunResponse, status_code=status.HTTP_201_CREATED)
def create_evaluation_run(
    payload: EvalRunRequest | None = None,
    session: Session = Depends(get_db),
    triage_adapter: TriageModelAdapter = Depends(get_triage_adapter),
    draft_adapter: DraftModelAdapter = Depends(get_draft_adapter),
) -> EvalRunResponse:
    """Run all canonical cases or the requested subset and persist the report."""

    try:
        run = run_evaluation(
            session,
            payload.case_ids if payload else None,
            triage_adapter,
            draft_adapter,
        )
    except EvaluationSelectionError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(exc),
        ) from exc
    except EvaluationDataError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
    return _response(run)


@router.get("/{eval_run_id}", response_model=EvalRunResponse)
def fetch_evaluation_run(
    eval_run_id: str,
    session: Session = Depends(get_db),
) -> EvalRunResponse:
    run = get_evaluation(session, eval_run_id)
    if run is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evaluation run '{eval_run_id}' not found",
        )
    return _response(run)
