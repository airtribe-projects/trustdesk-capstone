import os
import json

from app.database.database import SessionLocal

from app.models.customer import Customer
from app.models.order import Order
from app.models.ticket import Ticket
from app.models.tool_action import ToolAction
from app.models.document import Document
from app.models.draft_reply import DraftReply
from app.models.triage_result import TriageResult

db = SessionLocal()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

DATA_DIR = os.path.join(BASE_DIR, "data")

def clear_database():
    db.query(Ticket).delete()
    db.query(Order).delete()
    db.query(Customer).delete()
    db.query(ToolAction).delete()
    db.query(Document).delete()
    db.query(DraftReply).delete()
    db.query(TriageResult).delete()

    db.commit()

    print("Database Cleared")

def load_json(filename):
    path = os.path.join(DATA_DIR, filename)

    with open(path, "r", encoding="utf-8") as file:
        return json.load(file)


def seed_customers():

    customers = load_json("customers.json")

    for customer in customers:

        db.add(

            Customer(

                customer_id=customer["customer_id"],

                name=customer["name"],

                email=customer["email"],

                tier=customer["tier"],

                country=customer["country"],

                created_at=customer["created_at"],

                verified=customer["verified"],

                tags=customer["tags"]

            )

        )

    db.commit()

    print(f"Inserted {len(customers)} customers")



def seed_orders():

    orders = load_json("orders.json")

    for order in orders:

        db.add(

            Order(

                order_id=order["order_id"],

                customer_id=order["customer_id"],

                status=order["status"],

                placed_at=order["placed_at"],

                delivered_at=order["delivered_at"],

                eligible_return_until=order["eligible_return_until"],

                total=order["total"],

                currency=order["currency"],

                payment_status=order["payment_status"],

                tracking_number=order["tracking_number"],

                items=order["items"]

            )

        )

    db.commit()

    print("Orders Seeded")



def seed_tickets():

    tickets = load_json("tickets.json")

    for ticket in tickets:

        db.add(

            Ticket(

                ticket_id=ticket["ticket_id"],

                customer_id=ticket["customer_id"],

                order_id=ticket["order_id"],

                channel=ticket["channel"],

                subject=ticket["subject"],

                body=ticket["body"],

                created_at=ticket["created_at"],

                status=ticket["status"]

            )

        )

    db.commit()

    print("Tickets Seeded")


def seed_tool_actions():

    actions = load_json("tool_actions.json")

    for action in actions:

        db.add(

            ToolAction(

                tool_name=action["tool_name"],

                description=action["description"],

                risk_level=action["risk_level"],

                requires_human_approval=action["requires_human_approval"],

                allowed_categories=action["allowed_categories"],

                required_fields=action["required_fields"]

            )

        )

    db.commit()

    print("Tool Actions Seeded")




def seed_documents():

    kb_path = os.path.join(DATA_DIR, "knowledge_base")

    for file in os.listdir(kb_path):

        if file.endswith(".md"):

            with open(

                os.path.join(kb_path, file),

                "r",

                encoding="utf-8"

            ) as f:

                content = f.read()

            db.add(

                Document(

                    document_id=file.replace(".md", ""),

                    title=file.replace(".md", "").replace("_", " ").title(),

                    category = file.replace(".md", ""),

                    content=content

                )

            )

    db.commit()

    print("Knowledge Base Seeded")        



if __name__ == "__main__":

    try:

        clear_database()

        seed_customers()
        seed_orders()
        seed_tickets()
        seed_tool_actions()
        seed_documents()

        print("Database Seeding Completed Successfully")

    except Exception as e:

        db.rollback()

        print(f"Error: {e}")

    finally:

        db.close()
