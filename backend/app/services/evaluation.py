"""Evaluation runs using the canonical cases and existing production services."""

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from ..ai.draft_adapter import DraftModelAdapter
from ..ai.triage_adapter import TriageModelAdapter
from ..models import EvalRun, Ticket
from ..seed import seed_database
from .drafts import generate_draft
from .triage import triage_ticket


DATA_DIR = Path(__file__).resolve().parents[3] / "data"
EVAL_CASES_PATH = DATA_DIR / "eval_cases.jsonl"


class EvaluationError(Exception):
    """Base class for evaluation runner errors."""


class EvaluationDataError(EvaluationError):
    """Raised when the canonical evaluation data is malformed or incomplete."""


class EvaluationSelectionError(EvaluationError):
    """Raised when a requested evaluation case does not exist."""


class ExpectedResult(BaseModel):
    model_config = ConfigDict(extra="allow")

    category: str | None = None
    priority: str | None = None
    must_cite_doc_ids: list[str] | None = None
    allowed_actions: list[str] | None = None
    disallowed_actions: list[str] | None = None
    should_escalate: bool | None = None
    answer_requirements: list[str] | None = None


class EvaluationCaseInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    case_id: str
    ticket_id: str
    input: str
    expected: ExpectedResult


def _load_cases(path: Path) -> list[EvaluationCaseInput]:
    cases: list[EvaluationCaseInput] = []
    try:
        with path.open("r", encoding="utf-8") as file:
            for line_number, line in enumerate(file, start=1):
                if not line.strip():
                    continue
                try:
                    row = json.loads(line)
                    cases.append(EvaluationCaseInput.model_validate(row))
                except (json.JSONDecodeError, ValidationError, TypeError) as exc:
                    raise EvaluationDataError(
                        f"Evaluation input is invalid on line {line_number}"
                    ) from exc
    except OSError as exc:
        raise EvaluationDataError("Canonical evaluation input could not be read") from exc

    case_ids = [case.case_id for case in cases]
    if not cases or len(case_ids) != len(set(case_ids)):
        raise EvaluationDataError("Evaluation input must contain unique cases")
    return cases


def _ratio(numerator: int, denominator: int) -> float | None:
    return numerator / denominator if denominator else None


def _aggregate_metrics(results: list[dict[str, Any]]) -> dict[str, float | None]:
    category_results = [
        result["metric_checks"]["category_correct"]
        for result in results
        if result["metric_checks"]["category_correct"] is not None
    ]
    priority_results = [
        result["metric_checks"]["priority_correct"]
        for result in results
        if result["metric_checks"]["priority_correct"] is not None
    ]
    citation_results = [
        result["metric_checks"]["citation_coverage"]
        for result in results
        if result["metric_checks"]["citation_coverage"] is not None
    ]
    escalation_results = [
        result["metric_checks"]["escalation_correct"]
        for result in results
        if result["metric_checks"]["escalation_correct"] is not None
    ]

    disallowed_total = sum(len(result["disallowed_actions"]) for result in results)
    blocked_total = sum(len(result["blocked_actions"]) for result in results)
    allowed_total = sum(len(result["allowed_actions"]) for result in results)
    recalled_total = sum(len(result["recalled_actions"]) for result in results)

    return {
        "category_accuracy": _ratio(
            sum(category_results), len(category_results)
        ),
        "priority_accuracy": _ratio(sum(priority_results), len(priority_results)),
        "citation_coverage": _ratio(sum(citation_results), len(citation_results)),
        "unsafe_action_block_rate": _ratio(blocked_total, disallowed_total),
        "allowed_action_recall": _ratio(recalled_total, allowed_total),
        "escalation_accuracy": _ratio(
            sum(escalation_results), len(escalation_results)
        ),
        "answer_requirement_coverage": None,
    }


def run_evaluation(
    session: Session,
    case_ids: list[str] | None = None,
    triage_adapter: TriageModelAdapter | None = None,
    draft_adapter: DraftModelAdapter | None = None,
    cases_path: Path = EVAL_CASES_PATH,
) -> EvalRun:
    """Run selected canonical cases in an isolated database and persist the summary."""

    cases = _load_cases(cases_path)
    if case_ids is not None:
        if len(case_ids) != len(set(case_ids)):
            raise EvaluationSelectionError("case_ids must not contain duplicates")
        unknown = set(case_ids) - {case.case_id for case in cases}
        if unknown:
            raise EvaluationSelectionError(
                f"Unknown evaluation case(s): {', '.join(sorted(unknown))}"
            )
        selected_ids = set(case_ids)
        cases = [case for case in cases if case.case_id in selected_ids]
        if not cases:
            raise EvaluationSelectionError("At least one evaluation case must be selected")

    started_at = datetime.now(timezone.utc)
    eval_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
    )
    try:
        seed_database(eval_engine, cases_path.parent)
        case_results: list[dict[str, Any]] = []
        with Session(eval_engine) as eval_session:
            for case in cases:
                ticket = eval_session.get(Ticket, case.ticket_id)
                if ticket is None:
                    raise EvaluationDataError(
                        f"Evaluation case '{case.case_id}' references an unknown ticket"
                    )

                # Evaluation input and labels stay in the isolated evaluation database.
                ticket.body = case.input
                ticket.expected_category = None
                ticket.expected_priority = None
                ticket.expected_sentiment = None
                ticket.expected_escalation = None
                ticket.expected_actions = []
                eval_session.commit()

                triage, _ = triage_ticket(eval_session, ticket.ticket_id, triage_adapter)
                draft, _ = generate_draft(eval_session, ticket.ticket_id, draft_adapter)
                actual_actions = sorted(
                    {action["tool_name"] for action in draft.recommended_actions}
                )
                expected = case.expected
                required_citations = expected.must_cite_doc_ids or []
                allowed = expected.allowed_actions or []
                disallowed = expected.disallowed_actions or []
                citation_ok = (
                    all(doc_id in draft.citations for doc_id in required_citations)
                    if expected.must_cite_doc_ids is not None
                    else None
                )
                blocked = sorted(set(disallowed) - set(actual_actions))
                recalled = sorted(set(allowed) & set(actual_actions))
                metric_checks = {
                    "category_correct": (
                        triage.category.value == expected.category
                        if expected.category is not None
                        else None
                    ),
                    "priority_correct": (
                        triage.priority.value == expected.priority
                        if expected.priority is not None
                        else None
                    ),
                    "citation_coverage": citation_ok,
                    "unsafe_actions_blocked": blocked,
                    "unsafe_action_block_rate": _ratio(len(blocked), len(disallowed)),
                    "allowed_actions_recalled": recalled,
                    "allowed_action_recall": _ratio(len(recalled), len(allowed)),
                    "escalation_correct": (
                        triage.should_escalate == expected.should_escalate
                        if expected.should_escalate is not None
                        else None
                    ),
                }
                case_results.append(
                    {
                        "case_id": case.case_id,
                        "ticket_id": case.ticket_id,
                        "expected": expected.model_dump(exclude_none=True),
                        "predicted_category": triage.category.value,
                        "predicted_priority": triage.priority.value,
                        "answer": draft.body,
                        "citations": draft.citations,
                        "recommended_actions": actual_actions,
                        "recommended_action_details": draft.recommended_actions,
                        "blocked_actions": blocked,
                        "should_escalate": triage.should_escalate,
                        "answer_requirements": {
                            "status": "not_automatically_evaluated",
                            "requirements": expected.answer_requirements or [],
                        },
                        "metric_checks": metric_checks,
                        "notes": (
                            "Sensitive actions were not executed by the evaluation runner."
                        ),
                        "allowed_actions": allowed,
                        "disallowed_actions": disallowed,
                        "recalled_actions": recalled,
                    }
                )
    finally:
        eval_engine.dispose()

    completed_at = datetime.now(timezone.utc)
    eval_run = EvalRun(
        eval_run_id=f"eval_run_{uuid4().hex}",
        started_at=started_at,
        completed_at=completed_at,
        total_cases=len(case_results),
        metrics=_aggregate_metrics(case_results),
        case_results=case_results,
    )
    session.add(eval_run)
    session.commit()
    session.refresh(eval_run)
    return eval_run


def get_evaluation(session: Session, eval_run_id: str) -> EvalRun | None:
    """Fetch one persisted evaluation run."""

    return session.get(EvalRun, eval_run_id)
