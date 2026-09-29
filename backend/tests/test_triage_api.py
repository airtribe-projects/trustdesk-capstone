from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from app.ai.triage_adapter import get_triage_adapter
from app.database import get_db
from app.main import app
from app.models import AgentRun, Ticket
from app.seed import seed_database


ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"
AUTH_HEADERS = {"Authorization": "Bearer trustdesk-demo-token"}


def client_with_seeded_database(tmp_path):
    test_engine = create_engine(
        f"sqlite:///{tmp_path / 'trustdesk-triage.db'}",
        connect_args={"check_same_thread": False},
    )
    seed_database(test_engine, DATA_DIR)

    def override_get_db():
        with Session(test_engine) as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app), test_engine


def test_triage_persists_validated_result_and_minimal_trace(tmp_path):
    client, test_engine = client_with_seeded_database(tmp_path)
    with client:
        response = client.post("/tickets/tkt_9001/triage", headers=AUTH_HEADERS)

    assert response.status_code == 200
    body = response.json()
    assert body["ticket_id"] == "tkt_9001"
    assert body["category"] == "refund"
    assert body["priority"] == "medium"
    assert body["sentiment"] == "frustrated"
    assert body["should_escalate"] is False
    assert body["triage_reason"]
    assert body["reason_summary"] == body["triage_reason"]
    assert body["run_id"].startswith("run_")

    with Session(test_engine) as session:
        ticket = session.get(Ticket, "tkt_9001")
        trace = session.get(AgentRun, body["run_id"])
        assert ticket is not None
        assert ticket.category == "refund"
        assert ticket.priority == "medium"
        assert ticket.sentiment == "frustrated"
        assert ticket.should_escalate is False
        assert ticket.triage_reason == body["triage_reason"]
        assert ticket.triaged_at is not None
        assert trace is not None
        assert trace.ticket_id == "tkt_9001"
        assert trace.run_type == "triage"
        assert trace.status == "completed"
        assert "KB-REFUND-001" in trace.retrieved_doc_ids
    app.dependency_overrides.clear()


def test_unknown_ticket_returns_404(tmp_path):
    client, _ = client_with_seeded_database(tmp_path)
    with client:
        response = client.post("/tickets/unknown/triage", headers=AUTH_HEADERS)

    assert response.status_code == 404
    app.dependency_overrides.clear()


def test_triage_values_are_limited_to_documented_values(tmp_path):
    client, _ = client_with_seeded_database(tmp_path)
    with client:
        response = client.post("/tickets/tkt_9004/triage", headers=AUTH_HEADERS)

    assert response.status_code == 200
    result = response.json()
    assert result["category"] in {
        "shipping", "refund", "warranty", "billing", "account_security", "general"
    }
    assert result["priority"] in {"low", "medium", "high", "urgent"}
    assert result["sentiment"] in {"frustrated", "neutral", "worried"}
    assert result["should_escalate"] is True
    app.dependency_overrides.clear()


def test_repeated_triage_is_deterministic_and_does_not_read_expected_labels(tmp_path):
    client, test_engine = client_with_seeded_database(tmp_path)
    with Session(test_engine) as session:
        ticket = session.get(Ticket, "tkt_9001")
        assert ticket is not None
        ticket.expected_category = "billing"
        ticket.expected_priority = "urgent"
        ticket.expected_sentiment = "worried"
        ticket.expected_escalation = True
        session.commit()

    with client:
        first = client.post("/tickets/tkt_9001/triage", headers=AUTH_HEADERS)
        second = client.post("/tickets/tkt_9001/triage", headers=AUTH_HEADERS)

    assert first.status_code == 200
    assert second.status_code == 200
    first_data = first.json()
    second_data = second.json()
    assert first_data["category"] == second_data["category"] == "refund"
    assert first_data["priority"] == second_data["priority"] == "medium"
    assert first_data["sentiment"] == second_data["sentiment"] == "frustrated"
    assert first_data["should_escalate"] == second_data["should_escalate"] is False
    assert first_data["triage_reason"] == second_data["triage_reason"]
    with Session(test_engine) as session:
        assert session.scalar(select(func.count()).select_from(AgentRun)) == 2
    app.dependency_overrides.clear()


def test_triage_requires_bearer_token(tmp_path):
    client, _ = client_with_seeded_database(tmp_path)
    with client:
        response = client.post("/tickets/tkt_9001/triage")

    assert response.status_code == 401
    app.dependency_overrides.clear()


def test_invalid_adapter_output_is_returned_as_controlled_error(tmp_path):
    class InvalidAdapter:
        def classify(self, context):
            return {
                "category": "not-a-category",
                "priority": "medium",
                "sentiment": "neutral",
                "should_escalate": False,
                "triage_reason": "Invalid test output",
            }

    client, _ = client_with_seeded_database(tmp_path)
    app.dependency_overrides[get_triage_adapter] = lambda: InvalidAdapter()
    with client:
        response = client.post("/tickets/tkt_9001/triage", headers=AUTH_HEADERS)

    assert response.status_code == 502
    assert response.json()["detail"] == "Triage adapter returned invalid output"
    app.dependency_overrides.clear()
