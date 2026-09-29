import json
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.main import app
from app.models import AgentRun, EvalRun, Ticket
from app.seed import seed_database
from app.services.evaluation import EvaluationDataError, _load_cases


ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"
AUTH_HEADERS = {"Authorization": "Bearer trustdesk-demo-token"}


def client_with_seeded_database(tmp_path):
    test_engine = create_engine(
        f"sqlite:///{tmp_path / 'trustdesk-evaluations.db'}",
        connect_args={"check_same_thread": False},
    )
    seed_database(test_engine, DATA_DIR)

    def override_get_db():
        with Session(test_engine) as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app), test_engine


def test_run_evaluations_processes_and_persists_all_canonical_cases(tmp_path):
    cases_path = DATA_DIR / "eval_cases.jsonl"
    original_data = cases_path.read_bytes()
    client, test_engine = client_with_seeded_database(tmp_path)
    with client:
        response = client.post("/eval-runs", headers=AUTH_HEADERS)

    assert response.status_code == 201
    body = response.json()
    assert body["total_cases"] == 8
    assert {case["case_id"] for case in body["case_results"]} == {
        f"eval_{number:03}" for number in range(1, 9)
    }
    assert set(body["metrics"]) >= {
        "category_accuracy",
        "priority_accuracy",
        "citation_coverage",
        "unsafe_action_block_rate",
        "allowed_action_recall",
        "escalation_accuracy",
        "answer_requirement_coverage",
    }
    assert body["metrics"]["category_accuracy"] == 1.0
    assert body["metrics"]["priority_accuracy"] == 0.75
    assert body["metrics"]["citation_coverage"] == 0.875
    assert body["metrics"]["unsafe_action_block_rate"] == 1.0
    assert body["metrics"]["allowed_action_recall"] == 6 / 7
    assert body["metrics"]["escalation_accuracy"] == 0.75
    assert body["metrics"]["answer_requirement_coverage"] is None
    assert body["case_results"][0]["answer"]
    assert body["case_results"][0]["recommended_action_details"][0][
        "requires_human_approval"
    ] is True
    assert body["case_results"][5]["answer_requirements"]["status"] == (
        "not_automatically_evaluated"
    )
    assert cases_path.read_bytes() == original_data
    with Session(test_engine) as session:
        persisted = session.get(EvalRun, body["eval_run_id"])
        assert persisted is not None
        assert persisted.total_cases == 8
        assert session.scalar(select(func.count()).select_from(AgentRun)) == 0
        ticket = session.get(Ticket, "tkt_9001")
        assert ticket is not None
        assert ticket.category is None
    app.dependency_overrides.clear()


def test_selected_case_run_can_be_retrieved_and_does_not_authenticate_anonymously(tmp_path):
    client, _ = client_with_seeded_database(tmp_path)
    with client:
        created = client.post(
            "/eval-runs",
            headers=AUTH_HEADERS,
            json={"case_ids": ["eval_006"]},
        )
        fetched = client.get(
            f"/eval-runs/{created.json()['eval_run_id']}",
            headers=AUTH_HEADERS,
        )
        unauthenticated = client.post("/eval-runs")

    assert created.status_code == 201
    assert created.json()["total_cases"] == 1
    assert created.json()["case_results"][0]["case_id"] == "eval_006"
    assert created.json()["case_results"][0]["recommended_actions"] == ["escalate_to_human"]
    assert "issue_coupon" in created.json()["case_results"][0]["blocked_actions"]
    assert fetched.status_code == 200
    assert fetched.json() == created.json()
    assert unauthenticated.status_code == 401
    app.dependency_overrides.clear()


def test_unknown_selected_case_is_rejected(tmp_path):
    client, _ = client_with_seeded_database(tmp_path)
    with client:
        response = client.post(
            "/eval-runs",
            headers=AUTH_HEADERS,
            json={"case_ids": ["eval_missing"]},
        )

    assert response.status_code == 422
    app.dependency_overrides.clear()


def test_malformed_evaluation_input_is_reported_without_creating_run(tmp_path):
    malformed = tmp_path / "eval_cases.jsonl"
    malformed.write_text(json.dumps({"case_id": "incomplete"}) + "\n", encoding="utf-8")
    try:
        _load_cases(malformed)
    except EvaluationDataError as exc:
        assert "line 1" in str(exc)
    else:
        raise AssertionError("Malformed evaluation data was accepted")


def test_evaluation_expected_labels_do_not_change_production_triage(tmp_path):
    client, test_engine = client_with_seeded_database(tmp_path)
    with Session(test_engine) as session:
        ticket = session.get(Ticket, "tkt_9001")
        assert ticket is not None
        ticket.expected_category = "billing"
        ticket.expected_priority = "urgent"
        ticket.expected_escalation = True
        session.commit()
    with client:
        response = client.post(
            "/eval-runs",
            headers=AUTH_HEADERS,
            json={"case_ids": ["eval_001"]},
        )

    assert response.status_code == 201
    assert response.json()["case_results"][0]["predicted_category"] == "refund"
    assert response.json()["case_results"][0]["predicted_priority"] == "medium"
    with Session(test_engine) as session:
        ticket = session.get(Ticket, "tkt_9001")
        assert ticket is not None
        assert ticket.category is None
        assert ticket.expected_category == "billing"
        assert session.scalar(select(func.count()).select_from(AgentRun)) == 0
    app.dependency_overrides.clear()
