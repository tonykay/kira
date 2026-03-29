from unittest.mock import patch
from uuid import UUID


TICKET_PAYLOAD = {
    "title": "OOM kills on payment-service pod",
    "description": "Analysis details",
    "area": "kubernetes",
    "confidence": 0.92,
    "risk": 0.8,
    "recommended_action": "Increase memory limits",
    "affected_systems": [],
    "skills": ["kubernetes", "helm"],
    "source": "agent",
}


def _create_ticket(client, api_key_headers):
    resp = client.post("/api/v1/tickets", json=TICKET_PAYLOAD, headers=api_key_headers)
    return resp.json()["id"]


def test_chat_info_disabled(auth_client):
    resp = auth_client.get("/api/v1/chat/info")
    assert resp.status_code == 200
    data = resp.json()
    assert data["enabled"] is False
    assert data["model"] is None


def test_chat_info_enabled(auth_client, monkeypatch):
    monkeypatch.setattr("api.routes.chat.settings.llm_base_url", "http://fake:8000/v1")
    monkeypatch.setattr("api.routes.chat.settings.llm_model", "test-model")
    resp = auth_client.get("/api/v1/chat/info")
    assert resp.status_code == 200
    data = resp.json()
    assert data["enabled"] is True
    assert data["model"] == "test-model"


def test_chat_info_unauthenticated(client):
    resp = client.get("/api/v1/chat/info")
    assert resp.status_code == 401


def test_chat_history_empty(auth_client, client, api_key_headers):
    ticket_id = _create_ticket(client, api_key_headers)
    resp = auth_client.get(f"/api/v1/chat/{ticket_id}/history")
    assert resp.status_code == 200
    assert resp.json() == []


def test_chat_send_not_configured(auth_client, client, api_key_headers):
    ticket_id = _create_ticket(client, api_key_headers)
    resp = auth_client.post(
        f"/api/v1/chat/{ticket_id}/send",
        json={"message": "What is this issue?"},
    )
    assert resp.status_code == 503


def test_chat_clear_history(auth_client, client, api_key_headers, db_session):
    from api.db.models import ChatMessage

    ticket_id = _create_ticket(client, api_key_headers)
    # Manually add a chat message
    msg = ChatMessage(
        ticket_id=UUID(ticket_id),
        user_id=auth_client.__test_user_id__,
        role="user",
        content="test message",
    )
    db_session.add(msg)
    db_session.commit()

    resp = auth_client.delete(f"/api/v1/chat/{ticket_id}/history")
    assert resp.status_code == 200

    resp = auth_client.get(f"/api/v1/chat/{ticket_id}/history")
    assert resp.json() == []
