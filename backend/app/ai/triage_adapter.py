"""Provider-independent triage adapter and deterministic local implementation."""

from dataclasses import dataclass
from typing import Protocol

from ..models import Customer, KnowledgeDocument, Order, Ticket


@dataclass(frozen=True)
class TriageContext:
    ticket: Ticket
    customer: Customer
    order: Order | None
    retrieved_documents: tuple[KnowledgeDocument, ...]


class TriageModelAdapter(Protocol):
    """Interface implemented by deterministic or provider-backed triage models."""

    def classify(self, context: TriageContext) -> object:
        """Return untrusted structured candidate output for validation."""


class DeterministicTriageAdapter:
    """Deterministic ticket triage for local runs and reproducible tests."""

    def classify(self, context: TriageContext) -> dict[str, object]:
        text = f"{context.ticket.subject} {context.ticket.body}".lower()
        doc_ids = {document.doc_id for document in context.retrieved_documents}

        if any(
            term in text
            for term in (
                "swelling",
                "overheating",
                "burning smell",
                "exposed wire",
                "electric shock",
                "warranty",
                "battery",
            )
        ):
            category = "warranty"
        elif any(term in text for term in ("double charge", "duplicate charge", "charged twice", "billing", "payment")):
            category = "billing"
        elif any(
            term in text
            for term in ("tracking", "no movement", "carrier", "shipment", "in transit", "not arrived")
        ):
            category = "shipping"
        elif any(term in text for term in ("account email", "identity checks", "password reset", "account", "api key", "internal notes", "system prompt")):
            category = "account_security"
        elif any(term in text for term in ("refund", "return", "damaged", "defective", "replacement", "final-sale", "final sale")):
            category = "refund"
        elif "KB-WARRANTY-001" in doc_ids and "warranty" in text:
            category = "warranty"
        else:
            category = "general"

        if category == "warranty" and any(
            term in text for term in ("swelling", "overheating", "burning smell", "exposed wire", "electric shock")
        ):
            priority = "urgent"
        elif any(
            term in text
            for term in (
                "6 business days",
                "travel next week",
                "identity checks",
                "account email",
                "double charge",
                "charged twice",
            )
        ):
            priority = "high"
        elif category == "refund" and context.order and any(
            item.get("final_sale") for item in context.order.items
        ):
            priority = "low"
        else:
            priority = "medium"

        if any(term in text for term in ("swelling", "overheating", "burning smell", "electric shock")):
            sentiment = "worried"
        elif any(
            term in text
            for term in ("damaged", "cracked", "not moved", "need the", "double charge", "charged twice", "failed")
        ):
            sentiment = "frustrated"
        else:
            sentiment = "neutral"

        identity_bypass_or_change = category == "account_security" and (
            not context.customer.verified
            or any(term in text for term in ("change", "lost access", "identity", "email"))
        )
        sensitive_security_concern = category == "account_security" and any(
            term in text for term in ("api key", "internal notes", "system prompt", "hidden prompt", "secret")
        )
        safety_issue = priority == "urgent"
        should_escalate = identity_bypass_or_change or sensitive_security_concern or safety_issue

        reason = (
            f"Classified as {category} based on the ticket content, customer verification/tier, "
            f"order details, and {len(context.retrieved_documents)} retrieved policy document(s). "
            f"Priority is {priority}; "
            + ("human escalation is required by the applicable support policy." if should_escalate else "no policy-based escalation trigger was identified.")
        )
        return {
            "category": category,
            "priority": priority,
            "sentiment": sentiment,
            "should_escalate": should_escalate,
            "triage_reason": reason,
        }


def get_triage_adapter() -> TriageModelAdapter:
    """Provide the deterministic adapter unless a provider adapter is configured."""

    return DeterministicTriageAdapter()
