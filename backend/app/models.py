"""SQLAlchemy models for the canonical TrustDesk seed data."""

from datetime import datetime
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    """Base class for all TrustDesk database models."""


class Customer(Base):
    __tablename__ = "customers"

    customer_id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, nullable=False)
    tier: Mapped[str] = mapped_column(String, nullable=False)
    country: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[Date] = mapped_column(Date, nullable=False)
    verified: Mapped[bool] = mapped_column(Boolean, nullable=False)
    tags: Mapped[list[str]] = mapped_column(JSON, nullable=False)

    orders: Mapped[list["Order"]] = relationship(back_populates="customer")
    tickets: Mapped[list["Ticket"]] = relationship(back_populates="customer")


class Order(Base):
    __tablename__ = "orders"

    order_id: Mapped[str] = mapped_column(String, primary_key=True)
    customer_id: Mapped[str] = mapped_column(ForeignKey("customers.customer_id"), nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False)
    placed_at: Mapped[Date] = mapped_column(Date, nullable=False)
    delivered_at: Mapped[Date | None] = mapped_column(Date)
    eligible_return_until: Mapped[Date | None] = mapped_column(Date)
    total: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String, nullable=False)
    payment_status: Mapped[str] = mapped_column(String, nullable=False)
    tracking_number: Mapped[str | None] = mapped_column(String)
    items: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False)

    customer: Mapped[Customer] = relationship(back_populates="orders")
    tickets: Mapped[list["Ticket"]] = relationship(back_populates="order")


class Ticket(Base):
    __tablename__ = "tickets"

    ticket_id: Mapped[str] = mapped_column(String, primary_key=True)
    customer_id: Mapped[str] = mapped_column(ForeignKey("customers.customer_id"), nullable=False)
    order_id: Mapped[str | None] = mapped_column(ForeignKey("orders.order_id"))
    channel: Mapped[str] = mapped_column(String, nullable=False)
    subject: Mapped[str] = mapped_column(String, nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False)

    # These fields are retained for evaluation data only; production logic
    # must not use them as model decisions.
    expected_category: Mapped[str | None] = mapped_column(String)
    expected_priority: Mapped[str | None] = mapped_column(String)
    expected_sentiment: Mapped[str | None] = mapped_column(String)
    expected_escalation: Mapped[bool | None] = mapped_column(Boolean)
    expected_actions: Mapped[list[str]] = mapped_column(JSON, nullable=False)

    category: Mapped[str | None] = mapped_column(String)
    priority: Mapped[str | None] = mapped_column(String)
    sentiment: Mapped[str | None] = mapped_column(String)
    should_escalate: Mapped[bool | None] = mapped_column(Boolean)
    triage_reason: Mapped[str | None] = mapped_column(Text)
    triaged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    customer: Mapped[Customer] = relationship(back_populates="tickets")
    order: Mapped[Order | None] = relationship(back_populates="tickets")
    agent_runs: Mapped[list["AgentRun"]] = relationship(back_populates="ticket")


class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"

    doc_id: Mapped[str] = mapped_column(String, primary_key=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    source_path: Mapped[str] = mapped_column(String, nullable=False)
    version: Mapped[str | None] = mapped_column(String)
    audience: Mapped[str | None] = mapped_column(String)
    ingested_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)


class ToolActionCatalog(Base):
    __tablename__ = "tool_action_catalog"

    tool_name: Mapped[str] = mapped_column(String, primary_key=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    risk_level: Mapped[str] = mapped_column(String, nullable=False)
    requires_human_approval: Mapped[bool] = mapped_column(Boolean, nullable=False)
    allowed_categories: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    required_fields: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)


class EvaluationCase(Base):
    __tablename__ = "eval_cases"

    case_id: Mapped[str] = mapped_column(String, primary_key=True)
    ticket_id: Mapped[str] = mapped_column(ForeignKey("tickets.ticket_id"), nullable=False)
    input: Mapped[str] = mapped_column(Text, nullable=False)
    expected: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)

    ticket: Mapped[Ticket] = relationship()


class DraftReply(Base):
    __tablename__ = "draft_replies"

    draft_id: Mapped[str] = mapped_column(String, primary_key=True)
    ticket_id: Mapped[str] = mapped_column(ForeignKey("tickets.ticket_id"), nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    citations: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    recommended_actions: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    ticket: Mapped[Ticket] = relationship()


class ToolActionRequest(Base):
    __tablename__ = "tool_action_requests"
    __table_args__ = (
        UniqueConstraint("tool_name", "idempotency_key", name="uq_tool_action_idempotency"),
    )

    action_id: Mapped[str] = mapped_column(String, primary_key=True)
    ticket_id: Mapped[str] = mapped_column(ForeignKey("tickets.ticket_id"), nullable=False)
    tool_name: Mapped[str] = mapped_column(
        ForeignKey("tool_action_catalog.tool_name"), nullable=False
    )
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    risk_level: Mapped[str] = mapped_column(String, nullable=False)
    requires_human_approval: Mapped[bool] = mapped_column(Boolean, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String, nullable=False)
    requested_by: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    execution_result: Mapped[dict[str, Any] | None] = mapped_column(JSON)

    ticket: Mapped[Ticket] = relationship()
    approvals: Mapped[list["Approval"]] = relationship(back_populates="action")


class Approval(Base):
    __tablename__ = "approvals"
    __table_args__ = (UniqueConstraint("action_id", name="uq_approval_action"),)

    approval_id: Mapped[str] = mapped_column(String, primary_key=True)
    action_id: Mapped[str] = mapped_column(
        ForeignKey("tool_action_requests.action_id"), nullable=False
    )
    reviewer_id: Mapped[str] = mapped_column(String, nullable=False)
    decision: Mapped[str] = mapped_column(String, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    action: Mapped[ToolActionRequest] = relationship(back_populates="approvals")


class AgentRun(Base):
    __tablename__ = "agent_runs"

    run_id: Mapped[str] = mapped_column(String, primary_key=True)
    ticket_id: Mapped[str] = mapped_column(ForeignKey("tickets.ticket_id"), nullable=False)
    run_type: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False)
    retrieved_doc_ids: Mapped[list[str]] = mapped_column("retrieved_doc_ids_json", JSON, nullable=False)
    tool_calls: Mapped[list[dict[str, Any]]] = mapped_column("tool_calls_json", JSON, nullable=False)
    guardrail_results: Mapped[dict[str, Any]] = mapped_column("guardrail_results_json", JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.current_timestamp()
    )

    ticket: Mapped[Ticket] = relationship(back_populates="agent_runs")
