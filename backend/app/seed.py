"""Load the canonical TrustDesk data into SQLite."""

import argparse
import json
from datetime import date, datetime
from pathlib import Path
from typing import Any

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from .config import get_settings
from .database import engine as default_engine
from .models import (
    Base,
    Customer,
    EvaluationCase,
    KnowledgeDocument,
    Order,
    Ticket,
    ToolActionCatalog,
)


ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"
KB_DIR = DATA_DIR / "knowledge_base"


def _read_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def _read_jsonl(path: Path) -> list[dict[str, Any]]:
    rows = []
    with path.open("r", encoding="utf-8") as file:
        for line in file:
            if line.strip():
                rows.append(json.loads(line))
    return rows


def _parse_date(value: str | None) -> date | None:
    return date.fromisoformat(value) if value else None


def _parse_datetime(value: str) -> datetime:
    return datetime.fromisoformat(value)


def _markdown_metadata(path: Path, content: str) -> tuple[str, str, str | None, str | None]:
    doc_id = None
    title = path.stem
    version = None
    audience = None
    for line in content.splitlines():
        lower = line.lower()
        if lower.startswith("doc id:"):
            doc_id = line.split(":", 1)[1].strip()
        elif line.startswith("# "):
            title = line[2:].strip()
        elif lower.startswith("version:"):
            version = line.split(":", 1)[1].strip()
        elif lower.startswith("audience:"):
            audience = line.split(":", 1)[1].strip()
    if not doc_id:
        raise ValueError(f"{path} is missing 'Doc ID:'")
    return doc_id, title, version, audience


def _upsert(session: Session, model: type[Any], key: str, values: dict[str, Any]) -> None:
    row = session.get(model, key)
    if row is None:
        session.add(model(**values))
    else:
        for field, value in values.items():
            setattr(row, field, value)


def seed_data(session: Session, data_dir: Path = DATA_DIR) -> None:
    """Insert or update every canonical data row without creating duplicates."""

    customers = _read_json(data_dir / "customers.json")
    orders = _read_json(data_dir / "orders.json")
    tickets = _read_json(data_dir / "tickets.json")
    tools = _read_json(data_dir / "tool_actions.json")
    eval_cases = _read_jsonl(data_dir / "eval_cases.jsonl")
    kb_dir = data_dir / "knowledge_base"

    for row in customers:
        _upsert(
            session,
            Customer,
            row["customer_id"],
            {**row, "created_at": _parse_date(row["created_at"])},
        )

    for row in orders:
        _upsert(
            session,
            Order,
            row["order_id"],
            {
                **row,
                "placed_at": _parse_date(row["placed_at"]),
                "delivered_at": _parse_date(row.get("delivered_at")),
                "eligible_return_until": _parse_date(row.get("eligible_return_until")),
            },
        )

    for row in tickets:
        _upsert(
            session,
            Ticket,
            row["ticket_id"],
            {**row, "created_at": _parse_datetime(row["created_at"])},
        )

    for path in sorted(kb_dir.glob("*.md")):
        content = path.read_text(encoding="utf-8")
        doc_id, title, version, audience = _markdown_metadata(path, content)
        _upsert(
            session,
            KnowledgeDocument,
            doc_id,
            {
                "doc_id": doc_id,
                "title": title,
                "content": content,
                "source_path": str(path.relative_to(ROOT)),
                "version": version,
                "audience": audience,
            },
        )

    for row in tools:
        metadata = {
            key: value
            for key, value in row.items()
            if key
            not in {
                "tool_name",
                "description",
                "risk_level",
                "requires_human_approval",
                "allowed_categories",
                "required_fields",
            }
        }
        _upsert(
            session,
            ToolActionCatalog,
            row["tool_name"],
            {
                "tool_name": row["tool_name"],
                "description": row["description"],
                "risk_level": row["risk_level"],
                "requires_human_approval": row["requires_human_approval"],
                "allowed_categories": row["allowed_categories"],
                "required_fields": row["required_fields"],
                "metadata_json": metadata,
            },
        )

    for row in eval_cases:
        _upsert(
            session,
            EvaluationCase,
            row["case_id"],
            {
                "case_id": row["case_id"],
                "ticket_id": row["ticket_id"],
                "input": row["input"],
                "expected": row["expected"],
            },
        )

    session.commit()


def seed_database(target_engine=default_engine, data_dir: Path = DATA_DIR) -> None:
    """Create tables and seed the canonical data."""

    Base.metadata.create_all(bind=target_engine)
    with Session(target_engine) as session:
        seed_data(session, data_dir)


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the TrustDesk SQLite database.")
    parser.add_argument(
        "--db",
        default=None,
        help="SQLite database URL or filesystem path. Defaults to TRUSTDESK_DATABASE_URL.",
    )
    args = parser.parse_args()
    target_engine = default_engine
    if args.db:
        database_url = args.db if "://" in args.db else f"sqlite:///{Path(args.db).resolve()}"
        target_engine = create_engine(
            database_url,
            connect_args={"check_same_thread": False} if database_url.startswith("sqlite") else {},
        )
    seed_database(target_engine)
    print("Seeded TrustDesk database.")


if __name__ == "__main__":
    main()
