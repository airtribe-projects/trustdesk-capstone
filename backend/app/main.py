from fastapi import FastAPI

from app.routers import customer
from app.routers import order
from app.routers import ticket
from app.routers import knowledge
from app.routers import ai
from app.routers import reply
from app.routers import tool_action
from app.routers import evaluation

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="TrustDesk API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(customer.router)
app.include_router(order.router)
app.include_router(ticket.router)
app.include_router(knowledge.router)
app.include_router(ai.router)
app.include_router(reply.router)
app.include_router(tool_action.router)
app.include_router(evaluation.router)


@app.get("/")
def root():
    return {
        "message": "Welcome to TrustDesk API"
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "message": "TrustDesk API is running"
    }