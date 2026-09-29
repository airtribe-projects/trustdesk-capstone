"""FastAPI entry point for the TrustDesk backend."""

from contextlib import asynccontextmanager

from fastapi import FastAPI

from .database import initialize_database
from .api.tickets import router as tickets_router
from .api.documents import router as documents_router
from .api.drafts import router as drafts_router
from .api.tool_actions import router as tool_actions_router
from .api.eval_runs import router as eval_runs_router


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


@app.get("/health")
def health() -> dict[str, str]:
    """Return a simple successful service health response."""

    return {"status": "ok"}
