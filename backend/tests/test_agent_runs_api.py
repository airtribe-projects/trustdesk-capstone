from pathlib import Path
from datetime import datetime

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.main import app
from app.models import AgentRun, Ticket
from app.seed import seed_database


ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"
AUTH_HEADERS = {"Authorization": f"Bearer {get_settings().api_token}"}


def client_with_seeded_database(tmp_path):
    test_engine = create_engine(
        f"sqlite:///{tmp_path / 'trustdesk-agent-runs.db'}",
        connect_args={"check_same_thread": False},
    )
    seed_database(test_engine, DATA_DIR)

    def override_get_db():
        with Session(test_engine) as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app), test_engine


def test_fetch_triage_and_draft_traces_without_modifying_run_or_ticket(tmp_path):
    client, test_engine = client_with_seeded_database(tmp_path)
    with client:
        triage_response = client.post(
            "/tickets/tkt_9001/triage",
            headers=AUTH_HEADERS,
        )
        draft_response = client.post(
            "/tickets/tkt_9001/draft-reply",
            headers=AUTH_HEADERS,
        )

        with Session(test_engine) as session:
            ticket = session.get(Ticket, "tkt_9001")
            assert ticket is not None
            ticket_state = (
                ticket.category,
                ticket.priority,
                ticket.sentiment,
                ticket.should_escalate,
                ticket.triage_reason,
                ticket.triaged_at,
            )
            run_count = session.scalar(select(func.count()).select_from(AgentRun))
            triage_id = triage_response.json()["run_id"]
            draft_id = draft_response.json()["run_id"]
            triage_run = session.get(AgentRun, triage_id)
            draft_run = session.get(AgentRun, draft_id)
            assert triage_run is not None
            assert draft_run is not None
            triage_state = (
                triage_run.run_id,
                triage_run.ticket_id,
                triage_run.run_type,
                triage_run.status,
                triage_run.retrieved_doc_ids,
                triage_run.tool_calls,
                triage_run.guardrail_results,
                triage_run.created_at,
            )
            draft_state = (
                draft_run.run_id,
                draft_run.ticket_id,
                draft_run.run_type,
                draft_run.status,
                draft_run.retrieved_doc_ids,
                draft_run.tool_calls,
                draft_run.guardrail_results,
                draft_run.created_at,
            )

        triage_fetch = client.get(f"/agent-runs/{triage_id}", headers=AUTH_HEADERS)
        draft_fetch = client.get(f"/agent-runs/{draft_id}", headers=AUTH_HEADERS)

        with Session(test_engine) as session:
            ticket = session.get(Ticket, "tkt_9001")
            assert ticket is not None
            assert (
                ticket.category,
                ticket.priority,
                ticket.sentiment,
                ticket.should_escalate,
                ticket.triage_reason,
                ticket.triaged_at,
            ) == ticket_state
            assert session.scalar(select(func.count()).select_from(AgentRun)) == run_count
            for run_id, original_state in (
                (triage_id, triage_state),
                (draft_id, draft_state),
            ):
                run = session.get(AgentRun, run_id)
                assert run is not None
                assert (
                    run.run_id,
                    run.ticket_id,
                    run.run_type,
                    run.status,
                    run.retrieved_doc_ids,
                    run.tool_calls,
                    run.guardrail_results,
                    run.created_at,
                ) == original_state

    assert triage_response.status_code == 200
    assert draft_response.status_code == 200
    assert triage_fetch.status_code == 200
    triage_body = triage_fetch.json()
    assert triage_body["run_id"] == triage_id
    assert triage_body["ticket_id"] == "tkt_9001"
    assert triage_body["run_type"] == "triage"
    assert triage_body["status"] == "completed"
    assert triage_body["retrieved_doc_ids"] == triage_state[4]
    assert triage_body["tool_calls"] == triage_state[5]
    assert triage_body["guardrail_results"] == triage_state[6]
    assert datetime.fromisoformat(triage_body["created_at"].replace("Z", "+00:00")) == (
        triage_state[7]
    )
    assert draft_fetch.status_code == 200
    draft_body = draft_fetch.json()
    assert draft_body["run_id"] == draft_id
    assert draft_body["ticket_id"] == "tkt_9001"
    assert draft_body["run_type"] == "draft_reply"
    assert draft_body["status"] == "completed"
    assert draft_body["retrieved_doc_ids"] == draft_state[4]
    assert draft_body["tool_calls"] == draft_state[5]
    assert draft_body["guardrail_results"] == draft_state[6]
    assert datetime.fromisoformat(draft_body["created_at"].replace("Z", "+00:00")) == (
        draft_state[7]
    )
    app.dependency_overrides.clear()


def test_unknown_agent_run_returns_404(tmp_path):
    client, _ = client_with_seeded_database(tmp_path)
    with client:
        response = client.get("/agent-runs/run_missing", headers=AUTH_HEADERS)

    assert response.status_code == 404
    app.dependency_overrides.clear()


def test_agent_run_fetch_requires_valid_bearer_authentication(tmp_path):
    client, _ = client_with_seeded_database(tmp_path)
    with client:
        missing = client.get("/agent-runs/run_missing")
        invalid = client.get(
            "/agent-runs/run_missing",
            headers={"Authorization": "Bearer invalid-token"},
        )

    assert missing.status_code == 401
    assert invalid.status_code == 401
    app.dependency_overrides.clear()
