"""FastAPI entry point for the TrustDesk backend."""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from .database import initialize_database
from .api.tickets import router as tickets_router
from .api.documents import router as documents_router
from .api.drafts import router as drafts_router
from .api.tool_actions import router as tool_actions_router
from .api.eval_runs import router as eval_runs_router
from .api.agent_runs import router as agent_runs_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize backend infrastructure when the application starts."""

    initialize_database()
    yield


app = FastAPI(title="TrustDesk API", version="0.1.0", lifespan=lifespan)
app.include_router(tickets_router)
app.include_router(documents_router)
app.include_router(drafts_router)
app.include_router(tool_actions_router)
app.include_router(eval_runs_router)
app.include_router(agent_runs_router)
app.mount(
    "/app",
    StaticFiles(directory=Path(__file__).resolve().parent / "static", html=True),
    name="frontend",
)


@app.get("/health")
def health() -> dict[str, str]:
    """Return a simple successful service health response."""

    return {"status": "ok"}
