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
