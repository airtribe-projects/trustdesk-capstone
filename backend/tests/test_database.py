from pathlib import Path

from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from app.models import Customer, EvaluationCase, KnowledgeDocument, Order, Ticket, ToolActionCatalog
from app.seed import seed_database


ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"


def test_database_initialization_and_canonical_seed_is_repeatable(tmp_path):
    database_url = f"sqlite:///{tmp_path / 'trustdesk-test.db'}"
    test_engine = create_engine(database_url, connect_args={"check_same_thread": False})

    seed_database(test_engine, DATA_DIR)
    seed_database(test_engine, DATA_DIR)

    with Session(test_engine) as session:
        assert session.scalar(select(func.count()).select_from(Customer)) == 6
        assert session.scalar(select(func.count()).select_from(Order)) == 6
        assert session.scalar(select(func.count()).select_from(Ticket)) == 8
        assert session.scalar(select(func.count()).select_from(KnowledgeDocument)) == 8
        assert session.scalar(select(func.count()).select_from(ToolActionCatalog)) == 6
        assert session.scalar(select(func.count()).select_from(EvaluationCase)) == 8

        customer = session.get(Customer, "cus_1001")
        order = session.get(Order, "ord_5001")
        ticket = session.get(Ticket, "tkt_9001")
        assert customer is not None
        assert order is not None
        assert ticket is not None
        assert order.customer_id == customer.customer_id
        assert ticket.customer_id == customer.customer_id
        assert ticket.order_id == order.order_id
        assert ticket.customer.customer_id == "cus_1001"
        assert ticket.order.order_id == "ord_5001"

        document_ids = set(session.scalars(select(KnowledgeDocument.doc_id)))
        assert {"KB-REFUND-001", "KB-SECURITY-001", "KB-ADVERSARIAL-001"} <= document_ids
