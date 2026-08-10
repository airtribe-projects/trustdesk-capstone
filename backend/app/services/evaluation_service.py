import json
import os

from sqlalchemy.orm import Session

from app.models.ticket import Ticket
from app.models.customer import Customer
from app.models.order import Order

from app.services.retriever import search_documents
from app.services.triage_service import triage_ticket

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.dirname(
            os.path.dirname(__file__)
        )
    )
)
EVAL_FILE = os.path.join(BASE_DIR, "data", "eval_cases.jsonl")


def run_evaluation(db: Session):

    results = []

    passed = 0
    failed = 0

    with open(EVAL_FILE, "r", encoding="utf-8") as file:


        for line in file:

            line = line.strip()

            if not line:
                continue

            case = json.loads(line)    

            ticket = (
                db.query(Ticket)
                .filter(Ticket.ticket_id == case["ticket_id"])
                .first()
            )

            if not ticket:
                continue

            customer = (
                db.query(Customer)
                .filter(Customer.customer_id == ticket.customer_id)
                .first()
            )

            order = (
                db.query(Order)
                .filter(Order.order_id == ticket.order_id)
                .first()
            )

            knowledge = search_documents(
                ticket.subject + " " + ticket.body,
                db
            )

            ai_result = triage_ticket(
                ticket,
                customer,
                order,
                knowledge,
                db
            )

            expected = case["expected"]["category"]

            if isinstance(ai_result, dict):
                predicted = ai_result["category"]
            else:
                predicted = ai_result.category

            success = (
                expected.lower() ==
                predicted.lower()
            )

            if success:
                passed += 1
            else:
                failed += 1

            results.append({

                "ticket_id": ticket.ticket_id,

                "expected_category": expected,

                "predicted_category": predicted,

                "passed": success

            })

    accuracy = (
        passed /
        (passed + failed)
        * 100
    ) if (passed + failed) else 0

    return {

        "total_cases": passed + failed,

        "passed": passed,

        "failed": failed,

        "accuracy": round(accuracy, 2),

        "results": results

    }