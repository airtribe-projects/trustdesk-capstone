from fastapi.testclient import TestClient

from app.main import app


def test_support_frontend_is_served_with_its_static_assets():
    with TestClient(app) as client:
        page = client.get("/app/")
        styles = client.get("/app/styles.css")
        script = client.get("/app/app.js")

    assert page.status_code == 200
    assert "Ticket queue" in page.text
    assert "Evaluation run" in page.text
    assert styles.status_code == 200
    assert "workspace" in styles.text
    assert script.status_code == 200
    assert "create_replacement_order" in script.text
    assert "/eval-runs" in script.text
