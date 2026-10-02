from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.database import get_db
from app.main import app
from app.seed import seed_database


ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"
AUTH_HEADERS = {"Authorization": "Bearer trustdesk-demo-token"}


def client_with_seeded_database(tmp_path):
    test_engine = create_engine(
        f"sqlite:///{tmp_path / 'trustdesk-api.db'}",
        connect_args={"check_same_thread": False},
    )
    seed_database(test_engine, DATA_DIR)

    def override_get_db():
        with Session(test_engine) as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app)


def test_ticket_list_returns_seeded_tickets(tmp_path):
    with client_with_seeded_database(tmp_path) as client:
        response = client.get("/tickets", headers=AUTH_HEADERS)

    assert response.status_code == 200
    assert response.json()["total"] == 8
    assert len(response.json()["items"]) == 8
    assert response.json()["items"][0]["ticket_id"] == "tkt_9001"
    app.dependency_overrides.clear()


def test_ticket_detail_returns_existing_ticket(tmp_path):
    with client_with_seeded_database(tmp_path) as client:
        response = client.get("/tickets/tkt_9001", headers=AUTH_HEADERS)

    assert response.status_code == 200
    assert response.json()["ticket_id"] == "tkt_9001"
    assert response.json()["customer_id"] == "cus_1001"
    assert response.json()["order_id"] == "ord_5001"
    app.dependency_overrides.clear()


def test_ticket_detail_returns_404_for_unknown_ticket(tmp_path):
    with client_with_seeded_database(tmp_path) as client:
        response = client.get("/tickets/unknown", headers=AUTH_HEADERS)

    assert response.status_code == 404
    app.dependency_overrides.clear()


def test_ticket_context_returns_customer_and_order(tmp_path):
    with client_with_seeded_database(tmp_path) as client:
        response = client.get("/tickets/tkt_9001/context", headers=AUTH_HEADERS)

    assert response.status_code == 200
    body = response.json()
    assert body["customer"]["customer_id"] == "cus_1001"
    assert body["order"]["order_id"] == "ord_5001"
    assert body["order"]["customer_id"] == "cus_1001"
    app.dependency_overrides.clear()


def test_create_ticket_validates_references_and_persists_ticket(tmp_path):
    with client_with_seeded_database(tmp_path) as client:
        response = client.post(
            "/tickets",
            headers=AUTH_HEADERS,
            json={
                "customer_id": "cus_1002",
                "order_id": None,
                "channel": "email",
                "subject": "New support request",
                "body": "Please help with my account.",
            },
        )
        invalid_customer = client.post(
            "/tickets",
            headers=AUTH_HEADERS,
            json={
                "customer_id": "missing",
                "channel": "email",
                "subject": "Invalid",
                "body": "Invalid customer.",
            },
        )

    assert response.status_code == 201
    assert response.json()["customer_id"] == "cus_1002"
    assert response.json()["order_id"] is None
    assert "expected_category" not in response.json()
    assert invalid_customer.status_code == 400
    app.dependency_overrides.clear()


def test_protected_ticket_endpoint_requires_bearer_token(tmp_path):
    with client_with_seeded_database(tmp_path) as client:
        response = client.get("/tickets")

    assert response.status_code == 401
    app.dependency_overrides.clear()
