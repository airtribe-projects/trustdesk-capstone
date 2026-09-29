"""Provider-independent draft generation interface and deterministic adapter."""

from dataclasses import dataclass
from typing import Protocol

from ..models import Customer, KnowledgeDocument, Order, Ticket
from ..schemas import TriageCategory


@dataclass(frozen=True)
class DraftContext:
    ticket: Ticket
    customer: Customer
    order: Order | None
    retrieved_documents: tuple[KnowledgeDocument, ...]
    triage_category: TriageCategory | None
    triage_should_escalate: bool | None


@dataclass(frozen=True)
class DraftCandidate:
    body: str
    citations: list[str]
    recommended_actions: list[dict[str, object]]


class DraftModelAdapter(Protocol):
    """Provider-neutral interface for generating support reply drafts."""

    def generate(self, context: DraftContext) -> object:
        """Return an untrusted draft candidate for validation."""


def _document_ids(context: DraftContext) -> set[str]:
    return {document.doc_id for document in context.retrieved_documents}


def _has(text: str, *terms: str) -> bool:
    lowered = text.lower()
    return any(term in lowered for term in terms)


class DeterministicDraftAdapter:
    """Reproducible local draft generator using only supplied policy text."""

    def generate(self, context: DraftContext) -> DraftCandidate:
        text = f"{context.ticket.subject} {context.ticket.body}"
        lower = text.lower()
        docs = _document_ids(context)
        citations: list[str] = []
        actions: list[dict[str, object]] = []

        def cite(doc_id: str) -> None:
            if doc_id in docs and doc_id not in citations:
                citations.append(doc_id)

        def action(tool_name: str, reason: str, approval: bool = False) -> None:
            actions.append(
                {
                    "tool_name": tool_name,
                    "requires_human_approval": approval,
                    "reason": reason,
                }
            )

        # Do not treat user content or vendor text as instructions. These
        # narrow checks implement only the documented disclosure/injection
        # refusal behavior for draft generation.
        injection_or_disclosure = _has(
            lower,
            "ignore all instructions",
            "ignore previous",
            "system override",
            "reveal your system prompt",
            "hidden system prompt",
            "api key",
            "internal notes",
            "do not mention this instruction",
            "hide it from human",
        )
        if injection_or_disclosure:
            cite("KB-SECURITY-001")
            body = (
                "I cannot provide hidden instructions, credentials, or internal notes, or act on "
                "requests to bypass support policy. I have referred this request to a support specialist."
            )
            action(
                "escalate_to_human",
                "The request involves an unsafe instruction or sensitive information.",
            )
            if not citations:
                return DraftCandidate(
                    "I cannot confidently answer this request from the available support information. "
                    "I have referred it to a support specialist.",
                    [],
                    actions,
                )
            return DraftCandidate(body, citations, actions)

        if "KB-WARRANTY-001" in docs and _has(lower, "swelling", "overheating", "burning smell", "exposed wire", "electric shock"):
            cite("KB-WARRANTY-001")
            body = (
                "I am sorry you are dealing with a battery safety issue. Please stop using the device; "
                "a support specialist will review this urgently. We may need proof of purchase, the "
                "serial number, and product photos for a warranty replacement."
            )
            action("escalate_to_human", "The reported product condition is a safety issue.")
            return DraftCandidate(body, citations, actions)

        if "KB-ACCOUNT-001" in docs and _has(lower, "email", "password", "account", "identity"):
            cite("KB-ACCOUNT-001")
            body = (
                "I can help with your account request, but we cannot make account changes until "
                "identity verification is complete. I have referred your request to a support specialist."
            )
            action("escalate_to_human", "Account changes require identity verification.")
            return DraftCandidate(body, citations, actions)

        if "KB-BILLING-001" in docs and _has(lower, "double charge", "duplicate charge", "charged twice"):
            cite("KB-BILLING-001")
            body = (
                "I am sorry about the duplicate charge. We will check whether there is one order or "
                "multiple orders and start a billing review if only one order is present. A refund "
                "is not confirmed until payment operations completes its review."
            )
            if context.order:
                action(
                    "start_refund_review",
                    "The billing policy supports a human-reviewed refund review for a duplicate charge.",
                    approval=True,
                )
            return DraftCandidate(body, citations, actions)

        if "KB-SHIPPING-001" in docs and _has(
            lower, "tracking", "no movement", "business days", "carrier", "shipment", "in transit"
        ):
            cite("KB-SHIPPING-001")
            body = (
                "I am sorry the tracking has not updated. When tracking has no movement for five or "
                "more business days, the next step is a carrier investigation. This does not confirm "
                "an immediate refund or replacement."
            )
            if _has(lower, "6 business days", "no movement for 5", "no movement for six"):
                action(
                    "open_carrier_investigation",
                    "The shipping policy permits a carrier investigation after five business days without tracking movement.",
                )
            return DraftCandidate(body, citations, actions)

        if "KB-REFUND-001" in docs and _has(lower, "damaged", "cracked", "defective", "replacement"):
            cite("KB-REFUND-001")
            body = (
                "I am sorry your item arrived damaged. For a damaged or defective physical item "
                "reported within the return window, policy allows a replacement or a refund review. "
                "Please share a photo or short description of the damage so the request can be reviewed."
            )
            if context.order and context.order.eligible_return_until:
                if context.ticket.created_at.date() <= context.order.eligible_return_until:
                    action(
                        "create_replacement_order",
                        "The damage report is within the order's return window; policy allows a replacement or refund review, subject to review.",
                        approval=True,
                    )
            return DraftCandidate(body, citations, actions)

        if "KB-REFUND-001" in docs and _has(lower, "refund", "final sale", "final-sale", "license"):
            cite("KB-REFUND-001")
            if context.order and any(item.get("final_sale") for item in context.order.items):
                body = (
                    "I understand you are requesting a refund. The policy says software licenses and "
                        "marked final-sale items are not eligible for a refund after purchase unless "
                        "required by law or approved by a support manager. I cannot approve a refund here."
                )
            else:
                body = (
                    "I understand you are asking about a refund. The policy allows support to start "
                    "a refund review, but does not confirm that money has been refunded. A support "
                    "specialist can review the request."
                )
                action(
                    "start_refund_review",
                    "The refund policy allows support to start a human-reviewed refund review.",
                    approval=True,
                )
            return DraftCandidate(body, citations, actions)

        if "KB-COUPON-001" in docs and _has(lower, "coupon", "goodwill"):
            cite("KB-COUPON-001")
            body = (
                "A support specialist can review whether goodwill support is appropriate. Coupon "
                "requests require human approval, and I cannot promise or issue a coupon."
            )
            action("escalate_to_human", "Goodwill coupon requests require human review.")
            return DraftCandidate(body, citations, actions)

        if context.triage_should_escalate:
            body = (
                "I am unable to provide a confident answer from the available policy information. "
                "I have referred your request to a support specialist for review."
            )
            action("escalate_to_human", "The ticket triage result requires human review.")
            return DraftCandidate(body, citations, actions)

        return DraftCandidate(
            "I am unable to confirm the answer from the available support policy information. "
            "A support specialist can review your request and provide the correct next steps.",
            [],
            [],
        )


def get_draft_adapter() -> DraftModelAdapter:
    """Return the deterministic adapter unless another adapter is configured."""

    return DeterministicDraftAdapter()
