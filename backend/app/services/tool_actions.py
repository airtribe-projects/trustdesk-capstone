"""Catalog validation and approval-gated tool action lifecycle."""

import calendar
from datetime import date, datetime, timezone
from typing import Any, Protocol
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session, joinedload

from ..models import (
    Approval,
    Customer,
    KnowledgeDocument,
    Order,
    Ticket,
    ToolActionCatalog,
    ToolActionRequest,
)


class ToolActionError(Exception):
    """Base class for expected tool-action errors."""


class ActionNotFoundError(ToolActionError):
    pass


class ActionValidationError(ToolActionError):
    pass


class ActionConflictError(ToolActionError):
    pass


class ActionNotImplementedError(ToolActionError):
    pass


class ToolActionExecutor(Protocol):
    def execute(self, ticket: Ticket, payload: dict[str, Any]) -> dict[str, Any]:
        """Execute one explicitly supported catalog action."""


class LocalReplacementOrderExecutor:
    """Deterministic demo executor; does not call an external order system."""

    def execute(self, ticket: Ticket, payload: dict[str, Any]) -> dict[str, Any]:
        return {
            "operation": "create_replacement_order",
            "status": "simulated",
            "source_order_id": payload["order_id"],
            "sku": payload["sku"],
            "ticket_id": ticket.ticket_id,
            "message": "Replacement-order operation simulated; no external order system was called.",
        }


def _add_months(value: date, months: int) -> date:
    month_index = value.month - 1 + months
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    day = min(value.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def _required_payload_fields(
    catalog: ToolActionCatalog,
    payload: dict[str, Any],
) -> None:
    unexpected = set(payload) - set(catalog.required_fields)
    if unexpected:
        raise ActionValidationError(
            f"Unexpected payload fields: {', '.join(sorted(unexpected))}"
        )
    missing = [
        field
        for field in catalog.required_fields
        if field not in payload or payload[field] is None or payload[field] == ""
    ]
    if missing:
        raise ActionValidationError(
            f"Missing required payload fields: {', '.join(missing)}"
        )

    maximum = catalog.metadata_json.get("max_amount_inr")
    if maximum is not None and "amount" in payload:
        amount = payload["amount"]
        if not isinstance(amount, (int, float)) or isinstance(amount, bool) or amount <= 0:
            raise ActionValidationError("Payload amount must be a positive number")
        if amount > maximum:
            raise ActionValidationError(
                f"Amount exceeds the catalog limit of INR {maximum}"
            )


def _replacement_policy_check(
    session: Session,
    ticket: Ticket,
    customer: Customer,
    order: Order | None,
    payload: dict[str, Any],
) -> None:
    for field in ("order_id", "sku", "reason", "idempotency_key"):
        value = payload.get(field)
        if not isinstance(value, str) or not value.strip():
            raise ActionValidationError(f"Payload field '{field}' must be a non-empty string")
    if order is None or ticket.order_id != order.order_id:
        raise ActionValidationError("Replacement action requires the ticket's linked order")
    if order.customer_id != customer.customer_id or ticket.customer_id != customer.customer_id:
        raise ActionValidationError("Order does not belong to the ticket customer")

    item = next((item for item in order.items if item.get("sku") == payload["sku"]), None)
    if item is None:
        raise ActionValidationError("SKU is not part of the linked order")
    if item.get("final_sale") or item.get("category") == "software":
        raise ActionValidationError("The ordered item is not eligible for replacement")

    ticket_text = f"{ticket.subject} {ticket.body}".lower()
    safety_terms = ("swelling", "overheating", "burning smell", "exposed wire", "electric shock")
    if any(term in ticket_text for term in safety_terms):
        raise ActionValidationError(
            "Product safety issues must be escalated rather than replaced directly"
        )

    if ticket.category == "refund":
        policy = session.get(KnowledgeDocument, "KB-REFUND-001")
        damage_terms = ("damage", "damaged", "cracked", "defective", "broken")
        if policy is None or not any(term in ticket_text for term in damage_terms):
            raise ActionValidationError(
                "Refund-category replacement requires a supported damaged or defective item report"
            )
        if order.eligible_return_until is None or ticket.created_at.date() > order.eligible_return_until:
            raise ActionValidationError("Ticket was reported outside the return window")
        return

    if ticket.category == "warranty":
        policy = session.get(KnowledgeDocument, "KB-WARRANTY-001")
        if policy is None or order.delivered_at is None:
            raise ActionValidationError("Warranty policy or delivery date is unavailable")
        if item.get("category") in {"software"} or item.get("final_sale"):
            raise ActionValidationError("Item is not covered by the warranty policy")
        if item.get("category") == "accessory" and order.total < 3000:
            raise ActionValidationError("This accessory is excluded from the warranty extension")
        warranty_months = 12 + (6 if customer.tier.lower() == "gold" else 0)
        warranty_until = _add_months(order.delivered_at, warranty_months)
        if ticket.created_at.date() > warranty_until:
            raise ActionValidationError("Ticket was reported outside the warranty period")
        return

    raise ActionValidationError("Ticket category does not support replacement policy")


def _action_for_key(
    session: Session,
    tool_name: str,
    idempotency_key: str,
) -> ToolActionRequest | None:
    return session.scalar(
        select(ToolActionRequest).where(
            ToolActionRequest.tool_name == tool_name,
            ToolActionRequest.idempotency_key == idempotency_key,
        )
    )


def create_action(
    session: Session,
    ticket_id: str,
    tool_name: str,
    payload: dict[str, Any],
) -> tuple[ToolActionRequest, bool]:
    """Validate and persist one catalog-backed action request."""

    ticket = session.scalar(
        select(Ticket)
        .options(joinedload(Ticket.customer), joinedload(Ticket.order))
        .where(Ticket.ticket_id == ticket_id)
    )
    if ticket is None:
        raise ActionNotFoundError(f"Ticket '{ticket_id}' not found")

    catalog = session.get(ToolActionCatalog, tool_name)
    if catalog is None:
        raise ActionValidationError(f"Unknown tool '{tool_name}'")

    key = payload.get("idempotency_key")
    if not isinstance(key, str) or not key.strip():
        raise ActionValidationError("Payload must include a non-empty idempotency_key")
    key = key.strip()

    existing = _action_for_key(session, tool_name, key)
    if existing is not None:
        if existing.ticket_id != ticket_id or existing.payload != payload:
            raise ActionConflictError(
                "Idempotency key already exists for a different action request"
            )
        return existing, False

    if not ticket.category:
        raise ActionConflictError("Ticket must be triaged before requesting a tool action")
    if ticket.category not in catalog.allowed_categories:
        raise ActionValidationError(
            f"Tool '{tool_name}' is not allowed for category '{ticket.category}'"
        )
    _required_payload_fields(catalog, payload)

    if tool_name != "create_replacement_order":
        raise ActionNotImplementedError(
            f"Tool '{tool_name}' is catalogued but not implemented for execution"
        )
    _replacement_policy_check(session, ticket, ticket.customer, ticket.order, payload)

    now = datetime.now(timezone.utc)
    action = ToolActionRequest(
        action_id=f"action_{uuid4().hex}",
        ticket_id=ticket.ticket_id,
        tool_name=catalog.tool_name,
        payload=payload,
        risk_level=catalog.risk_level,
        requires_human_approval=catalog.requires_human_approval,
        status="approval_required" if catalog.requires_human_approval else "requested",
        idempotency_key=key,
        requested_by="support_agent",
        created_at=now,
        updated_at=now,
    )
    session.add(action)
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        existing = _action_for_key(session, tool_name, key)
        if existing is None:
            raise ActionConflictError("Action could not be created due to a uniqueness conflict") from exc
        if existing.ticket_id != ticket_id or existing.payload != payload:
            raise ActionConflictError(
                "Idempotency key already exists for a different action request"
            ) from exc
        return existing, False
    except SQLAlchemyError:
        session.rollback()
        raise
    session.refresh(action)
    return action, True


def _get_action(session: Session, action_id: str) -> ToolActionRequest:
    action = session.scalar(
        select(ToolActionRequest)
        .options(joinedload(ToolActionRequest.approvals))
        .where(ToolActionRequest.action_id == action_id)
    )
    if action is None:
        raise ActionNotFoundError(f"Action '{action_id}' not found")
    return action


def decide_action(
    session: Session,
    action_id: str,
    reviewer_id: str,
    reason: str,
    decision: str,
) -> ToolActionRequest:
    action = _get_action(session, action_id)
    if action.status != "approval_required" or not action.requires_human_approval:
        raise ActionConflictError("Action is not awaiting human approval")
    if decision not in {"approved", "rejected"}:
        raise ActionValidationError("Approval decision must be approved or rejected")
    if not reviewer_id.strip() or not reason.strip():
        raise ActionValidationError("Reviewer and decision reason are required")

    now = datetime.now(timezone.utc)
    session.add(
        Approval(
            approval_id=f"approval_{uuid4().hex}",
            action_id=action.action_id,
            reviewer_id=reviewer_id,
            decision=decision,
            reason=reason,
            created_at=now,
        )
    )
    action.status = decision
    action.updated_at = now
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise ActionConflictError("An approval decision already exists for this action") from exc
    session.refresh(action)
    return action


def execute_action(
    session: Session,
    action_id: str,
    executor: ToolActionExecutor | None = None,
) -> ToolActionRequest:
    action = _get_action(session, action_id)
    if action.status == "executed":
        return action
    if action.status == "rejected":
        raise ActionConflictError("Rejected actions cannot be executed")
    if action.requires_human_approval:
        approved = any(approval.decision == "approved" for approval in action.approvals)
        if action.status != "approved" or not approved:
            raise ActionConflictError("Action requires explicit human approval before execution")
    elif action.status != "requested":
        raise ActionConflictError(f"Action in status '{action.status}' cannot be executed")

    if action.tool_name != "create_replacement_order":
        raise ActionNotImplementedError(
            f"Tool '{action.tool_name}' is catalogued but not implemented for execution"
        )

    ticket = session.scalar(
        select(Ticket)
        .options(joinedload(Ticket.customer), joinedload(Ticket.order))
        .where(Ticket.ticket_id == action.ticket_id)
    )
    if ticket is None:
        raise ActionNotFoundError(f"Ticket '{action.ticket_id}' not found")
    catalog = session.get(ToolActionCatalog, action.tool_name)
    if catalog is None:
        raise ActionValidationError("Tool is no longer present in the catalog")
    _required_payload_fields(catalog, action.payload)
    if ticket.category not in catalog.allowed_categories:
        raise ActionValidationError("Tool is no longer allowed for the ticket category")
    _replacement_policy_check(session, ticket, ticket.customer, ticket.order, action.payload)

    result = (executor or LocalReplacementOrderExecutor()).execute(ticket, action.payload)
    now = datetime.now(timezone.utc)
    action.status = "executed"
    action.execution_result = result
    action.updated_at = now
    session.commit()
    session.refresh(action)
    return action


def get_action(session: Session, action_id: str) -> ToolActionRequest:
    return _get_action(session, action_id)
