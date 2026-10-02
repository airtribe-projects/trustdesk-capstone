"""Pydantic request and response schemas for ticket APIs."""

from datetime import date, datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class CustomerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    customer_id: str
    name: str
    email: str
    tier: str
    country: str
    created_at: date
    verified: bool
    tags: list[str]


class OrderItemResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    sku: str
    name: str
    quantity: int
    category: str
    final_sale: bool


class OrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    order_id: str
    customer_id: str
    status: str
    placed_at: date
    delivered_at: date | None
    eligible_return_until: date | None
    total: int
    currency: str
    payment_status: str
    tracking_number: str | None
    items: list[OrderItemResponse]


class TicketCreateRequest(BaseModel):
    customer_id: str
    order_id: str | None = None
    channel: str = Field(min_length=1)
    subject: str = Field(min_length=1)
    body: str = Field(min_length=1)


class TicketResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ticket_id: str
    customer_id: str
    order_id: str | None
    channel: str
    subject: str
    body: str
    created_at: datetime
    status: str


class TicketContextResponse(BaseModel):
    ticket: TicketResponse
    customer: CustomerResponse
    order: OrderResponse | None


class TicketListResponse(BaseModel):
    items: list[TicketResponse]
    total: int


class KnowledgeSearchResult(BaseModel):
    doc_id: str
    title: str
    snippet: str
    score: int


class KnowledgeSearchResponse(BaseModel):
    query: str
    results: list[KnowledgeSearchResult]


class TriageCategory(str, Enum):
    SHIPPING = "shipping"
    REFUND = "refund"
    WARRANTY = "warranty"
    BILLING = "billing"
    ACCOUNT_SECURITY = "account_security"
    GENERAL = "general"


class TriagePriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TriageSentiment(str, Enum):
    FRUSTRATED = "frustrated"
    NEUTRAL = "neutral"
    WORRIED = "worried"


class TriageResult(BaseModel):
    category: TriageCategory
    priority: TriagePriority
    sentiment: TriageSentiment
    should_escalate: bool
    triage_reason: str = Field(min_length=1)


class TicketTriageResponse(TriageResult):
    ticket_id: str
    reason_summary: str
    run_id: str


class RecommendedAction(BaseModel):
    tool_name: str
    requires_human_approval: bool
    reason: str


class DraftReplyResponse(BaseModel):
    draft_id: str
    ticket_id: str
    status: str
    body: str
    citations: list[str]
    recommended_actions: list[RecommendedAction]
    run_id: str


class ToolActionCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ticket_id: str
    tool_name: str
    payload: dict[str, Any]


class ToolActionDecisionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reviewer_id: str = Field(min_length=1)
    reason: str = Field(min_length=1)


class ToolActionResponse(BaseModel):
    action_id: str
    ticket_id: str
    tool_name: str
    payload: dict[str, Any]
    risk_level: str
    requires_human_approval: bool
    status: str
    idempotency_key: str
    requested_by: str
    created_at: datetime
    updated_at: datetime
    execution_result: dict[str, Any] | None


class ApprovalResponse(BaseModel):
    approval_id: str
    action_id: str
    reviewer_id: str
    decision: str
    reason: str
    created_at: datetime


class ToolActionDetailResponse(ToolActionResponse):
    approvals: list[ApprovalResponse]


class EvalRunRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    case_ids: list[str] | None = None


class EvalRunResponse(BaseModel):
    eval_run_id: str
    started_at: datetime
    completed_at: datetime
    total_cases: int
    metrics: dict[str, Any]
    case_results: list[dict[str, Any]]


class AgentRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    run_id: str
    ticket_id: str
    run_type: str
    status: str
    retrieved_doc_ids: list[str]
    tool_calls: list[dict[str, Any]]
    guardrail_results: dict[str, Any]
    created_at: datetime
