TICKET_PAYLOAD = {
    "title": "OOM kills on payment-service pod",
    "description": "Analysis details",
    "area": "kubernetes",
    "confidence": 0.92,
    "risk": 0.8,
    "recommended_action": "Increase memory limits",
    "affected_systems": [],
    "source": "agent",
}


def _create_ticket(client, api_key_headers):
    resp = client.post("/api/v1/tickets", json=TICKET_PAYLOAD, headers=api_key_headers)
    return resp.json()["id"]


def test_add_comment(auth_client, client, api_key_headers):
    ticket_id = _create_ticket(client, api_key_headers)
    resp = auth_client.post(
        f"/api/v1/tickets/{ticket_id}/comments",
        json={"body": "Confirmed — memory leak in payment handler", "source": "human"},
    )
    assert resp.status_code == 201
    assert resp.json()["body"] == "Confirmed — memory leak in payment handler"
    assert resp.json()["author_source"] == "human"
    assert resp.json()["author_name"] == "testuser"


def test_add_comment_via_api_key(client, api_key_headers):
    ticket_id = _create_ticket(client, api_key_headers)
    resp = client.post(
        f"/api/v1/tickets/{ticket_id}/comments",
        json={"body": "Automated follow-up: memory usage trending down", "source": "agent"},
        headers=api_key_headers,
    )
    assert resp.status_code == 201
    assert resp.json()["author_source"] == "agent"


def test_list_comments(auth_client, client, api_key_headers):
    ticket_id = _create_ticket(client, api_key_headers)
    auth_client.post(f"/api/v1/tickets/{ticket_id}/comments", json={"body": "First"})
    auth_client.post(f"/api/v1/tickets/{ticket_id}/comments", json={"body": "Second"})
    resp = auth_client.get(f"/api/v1/tickets/{ticket_id}/comments")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


def test_comment_on_nonexistent_ticket(auth_client):
    resp = auth_client.post(
        "/api/v1/tickets/00000000-0000-0000-0000-000000000000/comments",
        json={"body": "test"},
    )
    assert resp.status_code == 404
