from app.ai.gemini_client import generate
from app.ai.prompts import REPLY_PROMPT

from app.models.draft_reply import DraftReply
from app.services.guardrail import check_guardrails


def generate_reply(
    ticket,
    customer,
    order,
    triage,
    knowledge_docs,
    db
):

    # Check if draft already exists
    existing = (
        db.query(DraftReply)
        .filter(DraftReply.ticket_id == ticket.ticket_id)
        .first()
    )

    if existing:
        return existing

    docs = "\n\n".join(
        [f"{doc.title}\n{doc.content}" for doc in knowledge_docs]
    )

    prompt = f"""
{REPLY_PROMPT}

Ticket
------
Subject: {ticket.subject}

Body:
{ticket.body}

Customer
--------
Name: {customer.name}
Tier: {customer.tier}
Country: {customer.country}

Order
-----
Status: {order.status}
Payment Status: {order.payment_status}

AI Triage
----------
Category: {triage.category}
Priority: {triage.priority}
Sentiment: {triage.sentiment}
Escalate: {triage.escalate}
Reason: {triage.reason}

Knowledge
---------
{docs}
"""
    safe, reason = check_guardrails(ticket.body)

    if not safe:

        return {

            "subject":"Request Blocked",

            "body":f"This request has been blocked because it violates company policy ({reason})."

        }

    from app.services.logger import log_ai_run

    log_ai_run(

    db=db,

    ticket_id=ticket.ticket_id,

    run_type="draft_reply",

    retrieved_docs=[doc.document_id for doc in knowledge_docs],

    recommended_tool="create_replacement_order",

    guardrail_status="Passed",

    final_status="Completed"
    )

    response = generate(prompt)

    draft = DraftReply(
        ticket_id=ticket.ticket_id,
        reply=response.strip()
    )

    try:
        db.add(draft)
        db.commit()
        db.refresh(draft)
    except Exception:
        db.rollback()
        raise

    return draft