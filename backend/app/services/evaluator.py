import json
import os

from sqlalchemy.orm import Session

from app.models.ticket import Ticket
from app.services.retriever import search_documents
from app.services.triage_service import triage_ticket


BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.dirname(__file__)
    )
)

EVAL_FILE = os.path.join(
    BASE_DIR,
    "data",
    "eval_cases.jsonl"
)


def run_evaluation(db: Session):

    passed = 0
    failed = 0

    results = []

    with open(EVAL_FILE, "r", encoding="utf-8") as file:

        for line in file:

            case = json.loads(line)

            ticket = (
                db.query(Ticket)
                .filter(
                    Ticket.ticket_id == case["ticket_id"]
                )
                .first()
            )

            if not ticket:
                continue

            knowledge = search_documents(
                ticket.subject + " " + ticket.body,
                db
            )

            # Fetch customer and order here exactly
            # like your triage endpoint.

            # Reuse your existing service
            ai_result = ...

            expected = case["expected"]

            match = (
                ai_result["category"].lower()
                ==
                expected["category"].lower()
            )

            if match:
                passed += 1
            else:
                failed += 1

            results.append({

                "ticket": ticket.ticket_id,

                "expected": expected["category"],

                "actual": ai_result["category"],

                "passed": match

            })

    accuracy = (
        passed
        /
        (passed + failed)
        * 100
    ) if (passed + failed) else 0

    return {

        "total_cases": passed + failed,

        "passed": passed,

        "failed": failed,

        "accuracy": round(accuracy, 2),

        "details": results

    }