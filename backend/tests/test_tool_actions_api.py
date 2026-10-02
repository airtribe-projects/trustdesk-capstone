from datetime import datetime, timezone
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.main import app
from app.models import Approval, Ticket, ToolActionRequest
from app.seed import seed_database
from app.services.tool_actions import execute_action


ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"
AUTH_HEADERS = {"Authorization": "Bearer trustdesk-demo-token"}
REPLACEMENT_PAYLOAD = {
    "order_id": "ord_5001",
    "sku": "BG-AIRPODS-01",
    "reason": "Damaged on arrival",
    "idempotency_key": "tkt_9001-replacement-1",
}


def client_with_seeded_database(tmp_path):
    test_engine = create_engine(
        f"sqlite:///{tmp_path / 'trustdesk-actions.db'}",
        connect_args={"check_same_thread": False},
    )
    seed_database(test_engine, DATA_DIR)
    with Session(test_engine) as session:
        ticket = session.get(Ticket, "tkt_9001")
        assert ticket is not None
        ticket.category = "refund"
        ticket.priority = "medium"
        ticket.sentiment = "frustrated"
        ticket.should_escalate = False
        ticket.triage_reason = "Damaged item report."
        ticket.triaged_at = datetime(2026, 6, 28, tzinfo=timezone.utc)
        session.commit()

    def override_get_db():
        with Session(test_engine) as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app), test_engine


def create_replacement(client, payload=None):
    return client.post(
        "/tool-actions",
        headers=AUTH_HEADERS,
        json={
            "ticket_id": "tkt_9001",
            "tool_name": "create_replacement_order",
            "payload": payload or REPLACEMENT_PAYLOAD,
        },
    )


def test_valid_sensitive_action_is_created_awaiting_approval(tmp_path):
    client, test_engine = client_with_seeded_database(tmp_path)
    with client:
        response = create_replacement(client)

    assert response.status_code == 201
    result = response.json()
    assert result["tool_name"] == "create_replacement_order"
    assert result["status"] == "approval_required"
    assert result["requires_human_approval"] is True
    assert result["risk_level"] == "medium"
    with Session(test_engine) as session:
        assert session.scalar(select(func.count()).select_from(ToolActionRequest)) == 1
    app.dependency_overrides.clear()


def test_unknown_tool_is_rejected(tmp_path):
    client, _ = client_with_seeded_database(tmp_path)
    with client:
        response = client.post(
            "/tool-actions",
            headers=AUTH_HEADERS,
            json={
                "ticket_id": "tkt_9001",
                "tool_name": "execute_arbitrary_code",
                "payload": {"idempotency_key": "unknown-tool-1"},
            },
        )

    assert response.status_code == 422
    assert "Unknown tool" in response.json()["detail"]
    app.dependency_overrides.clear()


def test_tool_category_mismatch_is_rejected(tmp_path):
    client, _ = client_with_seeded_database(tmp_path)
    with client:
        response = client.post(
            "/tool-actions",
            headers=AUTH_HEADERS,
            json={
                "ticket_id": "tkt_9001",
                "tool_name": "open_carrier_investigation",
                "payload": {"idempotency_key": "wrong-category"},
            },
        )

    assert response.status_code == 422
    assert "not allowed for category" in response.json()["detail"]
    app.dependency_overrides.clear()


def test_missing_required_payload_field_is_rejected(tmp_path):
    client, _ = client_with_seeded_database(tmp_path)
    with client:
        response = create_replacement(
            client,
            {
                "order_id": "ord_5001",
                "sku": "BG-AIRPODS-01",
                "idempotency_key": "missing-reason",
            },
        )

    assert response.status_code == 422
    assert "reason" in response.json()["detail"]
    app.dependency_overrides.clear()


def test_sensitive_action_cannot_execute_before_approval(tmp_path):
    client, _ = client_with_seeded_database(tmp_path)
    with client:
        created = create_replacement(client)
        response = client.post(
            f"/tool-actions/{created.json()['action_id']}/execute",
            headers=AUTH_HEADERS,
        )

    assert created.status_code == 201
    assert response.status_code == 409
    assert "requires explicit human approval" in response.json()["detail"]
    app.dependency_overrides.clear()


def test_human_approval_allows_execution_and_persists_result(tmp_path):
    client, test_engine = client_with_seeded_database(tmp_path)
    with client:
        created = create_replacement(client)
        action_id = created.json()["action_id"]
        approved = client.post(
            f"/tool-actions/{action_id}/approve",
            headers=AUTH_HEADERS,
            json={"reviewer_id": "reviewer-1", "reason": "Verified damage report"},
        )
        executed = client.post(
            f"/tool-actions/{action_id}/execute",
            headers=AUTH_HEADERS,
        )

    assert approved.status_code == 200
    assert approved.json()["status"] == "approved"
    assert approved.json()["approvals"][0]["decision"] == "approved"
    assert executed.status_code == 200
    assert executed.json()["status"] == "executed"
    assert executed.json()["execution_result"]["status"] == "simulated"
    assert "no external order system was called" in executed.json()["execution_result"]["message"]
    with Session(test_engine) as session:
        action = session.get(ToolActionRequest, action_id)
        assert action is not None
        assert action.execution_result is not None
        assert session.scalar(select(func.count()).select_from(Approval)) == 1
    app.dependency_overrides.clear()


def test_rejected_action_cannot_execute(tmp_path):
    client, test_engine = client_with_seeded_database(tmp_path)
    with client:
        created = create_replacement(client)
        action_id = created.json()["action_id"]
        rejected = client.post(
            f"/tool-actions/{action_id}/reject",
            headers=AUTH_HEADERS,
            json={"reviewer_id": "reviewer-2", "reason": "Insufficient evidence"},
        )
        execution = client.post(
            f"/tool-actions/{action_id}/execute",
            headers=AUTH_HEADERS,
        )

    assert rejected.status_code == 200
    assert rejected.json()["status"] == "rejected"
    assert execution.status_code == 409
    assert "Rejected actions" in execution.json()["detail"]
    with Session(test_engine) as session:
        assert session.scalar(select(func.count()).select_from(Approval)) == 1
    app.dependency_overrides.clear()


def test_idempotency_key_returns_existing_action_without_duplicate(tmp_path):
    client, test_engine = client_with_seeded_database(tmp_path)
    with client:
        first = create_replacement(client)
        duplicate = create_replacement(client)

    assert first.status_code == 201
    assert duplicate.status_code == 200
    assert duplicate.json()["action_id"] == first.json()["action_id"]
    with Session(test_engine) as session:
        assert session.scalar(select(func.count()).select_from(ToolActionRequest)) == 1
    app.dependency_overrides.clear()


def test_same_idempotency_key_with_different_payload_is_conflict(tmp_path):
    client, test_engine = client_with_seeded_database(tmp_path)
    altered = {**REPLACEMENT_PAYLOAD, "reason": "Different request"}
    with client:
        first = create_replacement(client)
        second = create_replacement(client, altered)

    assert first.status_code == 201
    assert second.status_code == 409
    with Session(test_engine) as session:
        assert session.scalar(select(func.count()).select_from(ToolActionRequest)) == 1
    app.dependency_overrides.clear()


def test_repeated_execution_does_not_call_executor_twice(tmp_path):
    class CountingExecutor:
        def __init__(self):
            self.calls = 0

        def execute(self, ticket, payload):
            self.calls += 1
            return {"status": "simulated", "calls": self.calls}

    client, test_engine = client_with_seeded_database(tmp_path)
    with client:
        created = create_replacement(client)
        action_id = created.json()["action_id"]
        approved = client.post(
            f"/tool-actions/{action_id}/approve",
            headers=AUTH_HEADERS,
            json={"reviewer_id": "reviewer-3", "reason": "Approved"},
        )
    assert approved.status_code == 200

    executor = CountingExecutor()
    with Session(test_engine) as session:
        first = execute_action(session, action_id, executor)
    with Session(test_engine) as session:
        second = execute_action(session, action_id, executor)

    assert first.status == second.status == "executed"
    assert executor.calls == 1
    assert second.execution_result == {"status": "simulated", "calls": 1}
    app.dependency_overrides.clear()


def test_catalog_limit_is_enforced(tmp_path):
    client, test_engine = client_with_seeded_database(tmp_path)
    with Session(test_engine) as session:
        ticket = session.get(Ticket, "tkt_9002")
        assert ticket is not None
        ticket.category = "shipping"
        session.commit()
    with client:
        response = client.post(
            "/tool-actions",
            headers=AUTH_HEADERS,
            json={
                "ticket_id": "tkt_9002",
                "tool_name": "issue_coupon",
                "payload": {
                    "customer_id": "cus_1002",
                    "amount": 5000,
                    "reason": "Shipping delay",
                    "idempotency_key": "coupon-limit",
                },
            },
        )

    assert response.status_code == 422
    assert "catalog limit" in response.json()["detail"]
    app.dependency_overrides.clear()


def test_policy_window_and_safety_eligibility_are_enforced(tmp_path):
    client, test_engine = client_with_seeded_database(tmp_path)
    with Session(test_engine) as session:
        ticket = session.get(Ticket, "tkt_9001")
        assert ticket is not None
        ticket.created_at = datetime(2026, 8, 1, tzinfo=timezone.utc)
        session.commit()
    with client:
        expired = create_replacement(client)

    assert expired.status_code == 422
    assert "outside the return window" in expired.json()["detail"]
    app.dependency_overrides.clear()


def test_get_action_and_authentication(tmp_path):
    client, _ = client_with_seeded_database(tmp_path)
    with client:
        created = create_replacement(client)
        action_id = created.json()["action_id"]
        detail = client.get(f"/tool-actions/{action_id}", headers=AUTH_HEADERS)
        no_auth = client.get(f"/tool-actions/{action_id}")
        missing = client.get("/tool-actions/missing", headers=AUTH_HEADERS)

    assert detail.status_code == 200
    assert detail.json()["approvals"] == []
    assert no_auth.status_code == 401
    assert missing.status_code == 404
    app.dependency_overrides.clear()
