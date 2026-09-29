from fastapi.testclient import TestClient

from app.main import app
from app.database import initialize_database


def test_health_endpoint():
    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
