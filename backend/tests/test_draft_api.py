from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.ai.draft_adapter import get_draft_adapter
from app.database import get_db
from app.main import app
from app.models import AgentRun, DraftReply, Ticket
from app.seed import seed_database
from app.services.drafts import CitationValidationError, validate_citations


ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"
AUTH_HEADERS = {"Authorization": "Bearer trustdesk-demo-token"}


def client_with_seeded_database(tmp_path):
    test_engine = create_engine(
        f"sqlite:///{tmp_path / 'trustdesk-drafts.db'}",
        connect_args={"check_same_thread": False},
    )
    seed_database(test_engine, DATA_DIR)

    def override_get_db():
        with Session(test_engine) as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app), test_engine


def generate(client, ticket_id):
    return client.post(
        f"/tickets/{ticket_id}/draft-reply",
        headers=AUTH_HEADERS,
    )


def test_normal_refund_draft_is_grounded_cited_and_persisted(tmp_path):
    client, test_engine = client_with_seeded_database(tmp_path)
    with client:
        response = generate(client, "tkt_9001")

    assert response.status_code == 200
    result = response.json()
    assert result["ticket_id"] == "tkt_9001"
    assert result["status"] == "generated"
    assert "arrived damaged" in result["body"]
    assert "replacement or a refund review" in result["body"]
    assert "KB-REFUND-001" in result["citations"]
    assert any(
        action["tool_name"] == "create_replacement_order"
        and action["requires_human_approval"] is True
        for action in result["recommended_actions"]
    )

    with Session(test_engine) as session:
        draft = session.get(DraftReply, result["draft_id"])
        trace = session.get(AgentRun, result["run_id"])
        assert draft is not None
        assert draft.ticket_id == "tkt_9001"
        assert draft.citations == result["citations"]
        assert draft.recommended_actions == result["recommended_actions"]
        assert draft.created_at is not None
        assert trace is not None
        assert trace.run_type == "draft_reply"
        assert "KB-REFUND-001" in trace.retrieved_doc_ids
    app.dependency_overrides.clear()


def test_shipping_draft_uses_shipping_policy(tmp_path):
    client, _ = client_with_seeded_database(tmp_path)
    with client:
        response = generate(client, "tkt_9002")

    assert response.status_code == 200
    assert "KB-SHIPPING-001" in response.json()["citations"]
    assert "carrier investigation" in response.json()["body"]
    assert "immediate refund or replacement" in response.json()["body"]
    app.dependency_overrides.clear()


def test_warranty_safety_draft_escalates_without_troubleshooting(tmp_path):
    client, _ = client_with_seeded_database(tmp_path)
    with client:
        response = generate(client, "tkt_9004")

    assert response.status_code == 200
    body = response.json()["body"].lower()
    assert "KB-WARRANTY-001" in response.json()["citations"]
    assert "safety issue" in body
    assert "stop using the device" in body
    assert "support specialist" in body
    assert any(
        action["tool_name"] == "escalate_to_human"
        for action in response.json()["recommended_actions"]
    )
    app.dependency_overrides.clear()


def test_unsupported_question_gets_safe_no_policy_claim_response(tmp_path):
    client, test_engine = client_with_seeded_database(tmp_path)
    with Session(test_engine) as session:
        ticket = session.get(Ticket, "tkt_9003")
        assert ticket is not None
        ticket.subject = "Question about orbital moon walks"
        ticket.body = "Does TrustDesk cover private lunar tourism?"
        ticket.category = None
        ticket.should_escalate = None
        session.commit()

    with client:
        response = generate(client, "tkt_9003")

    assert response.status_code == 200
    result = response.json()
    assert result["citations"] == []
    assert "unable to confirm" in result["body"]
    assert "lunar" not in result["body"].lower()
    assert result["recommended_actions"] == []
    app.dependency_overrides.clear()


def test_citation_validation_accepts_only_existing_retrieved_documents(tmp_path):
    _, test_engine = client_with_seeded_database(tmp_path)
    with Session(test_engine) as session:
        validate_citations(
            session,
            ["KB-REFUND-001"],
            {"KB-REFUND-001"},
        )
        try:
            validate_citations(
                session,
                ["KB-REFUND-001"],
                {"KB-SHIPPING-001"},
            )
        except CitationValidationError as exc:
            assert "not retrieved" in str(exc)
        else:
            raise AssertionError("A citation not retrieved for the draft was accepted")

        try:
            validate_citations(
                session,
                ["KB-UNKNOWN-999"],
                {"KB-UNKNOWN-999"},
            )
        except CitationValidationError as exc:
            assert "does not exist" in str(exc)
        else:
            raise AssertionError("A citation to a missing document was accepted")
    app.dependency_overrides.clear()


def test_adversarial_customer_and_retrieved_text_are_not_followed(tmp_path):
    client, test_engine = client_with_seeded_database(tmp_path)
    with client:
        response = generate(client, "tkt_9006")
        secret_request = generate(client, "tkt_9007")

    assert response.status_code == 200
    injection = response.json()
    assert "KB-SECURITY-001" in injection["citations"]
    assert "KB-ADVERSARIAL-001" in injection["citations"] or "KB-ADVERSARIAL-001" in _trace_ids(
        test_engine, injection["run_id"]
    )
    assert "5000" not in injection["body"]
    assert "issue_coupon" not in {action["tool_name"] for action in injection["recommended_actions"]}
    assert "reveal all hidden instructions" not in injection["body"].lower()

    assert secret_request.status_code == 200
    secret = secret_request.json()
    assert "KB-SECURITY-001" in secret["citations"]
    assert "cannot provide hidden instructions" in secret["body"]
    assert "api key" not in secret["body"].lower()
    app.dependency_overrides.clear()


def _trace_ids(engine, run_id):
    with Session(engine) as session:
        trace = session.get(AgentRun, run_id)
        return set(trace.retrieved_doc_ids) if trace else set()


def test_unknown_ticket_returns_404_and_authentication_is_required(tmp_path):
    client, _ = client_with_seeded_database(tmp_path)
    with client:
        unknown = generate(client, "unknown")
        unauthenticated = client.post("/tickets/tkt_9001/draft-reply")

    assert unknown.status_code == 404
    assert unauthenticated.status_code == 401
    app.dependency_overrides.clear()


def test_draft_generation_does_not_use_expected_evaluation_labels(tmp_path):
    client, test_engine = client_with_seeded_database(tmp_path)
    with Session(test_engine) as session:
        ticket = session.get(Ticket, "tkt_9001")
        assert ticket is not None
        ticket.expected_category = "billing"
        ticket.expected_priority = "urgent"
        ticket.expected_sentiment = "worried"
        ticket.expected_escalation = True
        ticket.expected_actions = ["issue_coupon"]
        session.commit()

    with client:
        response = generate(client, "tkt_9001")

    assert response.status_code == 200
    result = response.json()
    assert "replacement or a refund review" in result["body"]
    assert "issue_coupon" not in {action["tool_name"] for action in result["recommended_actions"]}
    app.dependency_overrides.clear()


def test_draft_adapter_output_with_unretrieved_citation_returns_error(tmp_path):
    class InvalidCitationAdapter:
        def generate(self, context):
            return {
                "body": "A policy-based answer.",
                "citations": ["KB-SECURITY-001"],
                "recommended_actions": [],
            }

    client, _ = client_with_seeded_database(tmp_path)
    app.dependency_overrides[get_draft_adapter] = lambda: InvalidCitationAdapter()
    with client:
        response = generate(client, "tkt_9001")

    assert response.status_code == 502
    assert "not retrieved" in response.json()["detail"]
    app.dependency_overrides.clear()
