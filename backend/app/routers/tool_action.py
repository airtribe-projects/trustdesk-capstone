import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.database import get_db

from app.models.tool_execution import ToolExecution

from app.schemas.tool_execution import (
    ToolRequest,
    ToolExecutionResponse
)

from app.schemas.tool_execution import ToolApprovalRequest
from fastapi import HTTPException


router = APIRouter(
    prefix="/tool-actions",
    tags=["Tool Actions"]
)


@router.post(
    "/request",
    response_model=ToolExecutionResponse
)
def request_tool_action(
    request: ToolRequest,
    db: Session = Depends(get_db)
):

    execution = ToolExecution(

        ticket_id=request.ticket_id,

        tool_name=request.tool_name,

        status="Pending Approval",

        idempotency_key=str(uuid.uuid4())

    )

    db.add(execution)

    db.commit()

    db.refresh(execution)

    return execution



@router.post("/{execution_id}/approve")
def approve_tool_action(
    execution_id: int,
    request: ToolApprovalRequest,
    db: Session = Depends(get_db)
):

    execution = (
        db.query(ToolExecution)
        .filter(ToolExecution.id == execution_id)
        .first()
    )

    if not execution:
        raise HTTPException(
            status_code=404,
            detail="Tool action not found"
        )

    if execution.status != "Pending Approval":
        raise HTTPException(
            status_code=400,
            detail="This tool action cannot be approved."
        )

    execution.status = "Approved"
    execution.approved_by = request.approved_by

    db.commit()
    db.refresh(execution)

    return {
        "message": "Tool action approved successfully.",
        "tool_action": execution
    }


@router.post("/{execution_id}/execute")
def execute_tool_action(
    execution_id: int,
    db: Session = Depends(get_db)
):

    execution = (
        db.query(ToolExecution)
        .filter(ToolExecution.id == execution_id)
        .first()
    )

    if not execution:
        raise HTTPException(
            status_code=404,
            detail="Tool action not found"
        )

    if execution.status != "Approved":
        raise HTTPException(
            status_code=400,
            detail="Tool action must be approved before execution."
        )

    # Simulate execution
    execution.status = "Completed"
    execution.execution_result = (
        f"{execution.tool_name} executed successfully."
    )

    db.commit()
    db.refresh(execution)

    return {
        "message": "Tool action executed successfully.",
        "tool_action": execution
    }