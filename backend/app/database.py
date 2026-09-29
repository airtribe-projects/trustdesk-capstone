"""SQLAlchemy database connectivity and initialization."""

from collections.abc import Generator

from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import Session, sessionmaker

from .config import get_settings
from .models import Base


settings = get_settings()
connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def initialize_database() -> None:
    """Create the database tables if they do not already exist."""

    Base.metadata.create_all(bind=engine)
    ticket_columns = {
        column["name"] for column in inspect(engine).get_columns("tickets")
    }
    triage_columns = {
        "category": "VARCHAR",
        "priority": "VARCHAR",
        "sentiment": "VARCHAR",
        "should_escalate": "BOOLEAN",
        "triage_reason": "TEXT",
        "triaged_at": "DATETIME",
    }
    with engine.begin() as connection:
        for column_name, column_type in triage_columns.items():
            if column_name not in ticket_columns:
                connection.exec_driver_sql(
                    f"ALTER TABLE tickets ADD COLUMN {column_name} {column_type}"
                )


def get_db() -> Generator[Session, None, None]:
    """Provide a SQLAlchemy session for future request dependencies."""

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
