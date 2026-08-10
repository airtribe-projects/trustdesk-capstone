import json

from app.ai.gemini_client import generate
from app.ai.prompts import TRIAGE_PROMPT
from app.models.triage_result import TriageResult
from app.services.guardrail import check_guardrails


def triage_ticket(
    ticket,
    customer,
    order,
    knowledge_docs,
    db
):
    existing = (
        db.query(TriageResult)
        .filter(TriageResult.ticket_id == ticket.ticket_id)
        .first()
    )

    if existing:
        return existing
    docs = "\n\n".join(
        [f"{doc.title}\n{doc.content}" for doc in knowledge_docs]
    )

    prompt = f"""
{TRIAGE_PROMPT}

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

Knowledge
---------
{docs}
"""
    safe, reason = check_guardrails(ticket.body)

    if not safe:

        return {

            "ticket_id": ticket.ticket_id,

            "category": "Unsafe",

            "priority": "High",

            "sentiment": "Neutral",

            "escalate": True,

            "reason": f"Blocked by guardrail: {reason}"

        }

    from app.services.logger import log_ai_run

    log_ai_run(

    db=db,

    ticket_id=ticket.ticket_id,

    run_type="triage",

    retrieved_docs=[doc.document_id for doc in knowledge_docs],

    recommended_tool="create_replacement_order",

    guardrail_status="Passed",

    final_status="Completed"
    )


    response = generate(prompt)

    cleaned = response.replace("```json", "").replace("```", "").strip()

    result = json.loads(cleaned)

    triage = TriageResult(
    ticket_id=ticket.ticket_id,
    category=result["category"],
    priority=result["priority"],
    sentiment=result["sentiment"],
    escalate=result["escalate"],
    reason=result["reason"]
    )

    try:
        db.add(triage)
        db.commit()
        db.refresh(triage)
    except:
        db.rollback()
        raise

    return triage