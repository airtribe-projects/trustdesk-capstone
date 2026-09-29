"""Authenticated endpoints for requesting and reviewing tool actions."""

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from ..auth import require_api_token
from ..database import get_db
from ..schemas import (
    ApprovalResponse,
    ToolActionCreateRequest,
    ToolActionDecisionRequest,
    ToolActionDetailResponse,
    ToolActionResponse,
)
from ..services.tool_actions import (
    ActionConflictError,
    ActionNotFoundError,
    ActionNotImplementedError,
    ActionValidationError,
    create_action,
    decide_action,
    execute_action,
    get_action,
)


router = APIRouter(
    prefix="/tool-actions",
    tags=["tool-actions"],
    dependencies=[Depends(require_api_token)],
)


def _action_response(action, *, include_approvals: bool = False):
    fields = {
        "action_id": action.action_id,
        "ticket_id": action.ticket_id,
        "tool_name": action.tool_name,
        "payload": action.payload,
        "risk_level": action.risk_level,
        "requires_human_approval": action.requires_human_approval,
        "status": action.status,
        "idempotency_key": action.idempotency_key,
        "requested_by": action.requested_by,
        "created_at": action.created_at,
        "updated_at": action.updated_at,
        "execution_result": action.execution_result,
    }
    if not include_approvals:
        return ToolActionResponse(**fields)
    return ToolActionDetailResponse(
        **fields,
        approvals=[
            ApprovalResponse(
                approval_id=approval.approval_id,
                action_id=approval.action_id,
                reviewer_id=approval.reviewer_id,
                decision=approval.decision,
                reason=approval.reason,
                created_at=approval.created_at,
            )
            for approval in action.approvals
        ],
    )


def _raise_action_error(exc: Exception) -> None:
    if isinstance(exc, ActionNotFoundError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    if isinstance(exc, ActionValidationError):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)) from exc
    if isinstance(exc, ActionConflictError):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    if isinstance(exc, ActionNotImplementedError):
        raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=str(exc)) from exc
    raise exc


@router.post("", response_model=ToolActionResponse)
def request_tool_action(
    payload: ToolActionCreateRequest,
    response: Response,
    session: Session = Depends(get_db),
) -> ToolActionResponse:
    """Create a validated action request, or return its idempotent duplicate."""

    try:
        action, created = create_action(
            session,
            payload.ticket_id,
            payload.tool_name,
            payload.payload,
        )
    except (ActionNotFoundError, ActionValidationError, ActionConflictError, ActionNotImplementedError) as exc:
        _raise_action_error(exc)
    response.status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
    return _action_response(action)


@router.get("/{action_id}", response_model=ToolActionDetailResponse)
def fetch_tool_action(
    action_id: str,
    session: Session = Depends(get_db),
) -> ToolActionDetailResponse:
    try:
        action = get_action(session, action_id)
    except ActionNotFoundError as exc:
        _raise_action_error(exc)
    return _action_response(action, include_approvals=True)


@router.post("/{action_id}/approve", response_model=ToolActionDetailResponse)
def approve_tool_action(
    action_id: str,
    payload: ToolActionDecisionRequest,
    session: Session = Depends(get_db),
) -> ToolActionDetailResponse:
    try:
        action = decide_action(
            session,
            action_id,
            payload.reviewer_id.strip(),
            payload.reason.strip(),
            "approved",
        )
    except (ActionNotFoundError, ActionValidationError, ActionConflictError) as exc:
        _raise_action_error(exc)
    return _action_response(action, include_approvals=True)


@router.post("/{action_id}/reject", response_model=ToolActionDetailResponse)
def reject_tool_action(
    action_id: str,
    payload: ToolActionDecisionRequest,
    session: Session = Depends(get_db),
) -> ToolActionDetailResponse:
    try:
        action = decide_action(
            session,
            action_id,
            payload.reviewer_id.strip(),
            payload.reason.strip(),
            "rejected",
        )
    except (ActionNotFoundError, ActionValidationError, ActionConflictError) as exc:
        _raise_action_error(exc)
    return _action_response(action, include_approvals=True)


@router.post("/{action_id}/execute", response_model=ToolActionResponse)
def execute_tool_action(
    action_id: str,
    session: Session = Depends(get_db),
) -> ToolActionResponse:
    try:
        action = execute_action(session, action_id)
    except (
        ActionNotFoundError,
        ActionValidationError,
        ActionConflictError,
        ActionNotImplementedError,
    ) as exc:
        _raise_action_error(exc)
    return _action_response(action)
