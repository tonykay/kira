TICKET_PAYLOAD = {
    "title": "Test ticket",
    "description": "Details",
    "area": "kubernetes",
    "confidence": 0.9,
    "risk": 0.8,
    "recommended_action": "Fix it",
    "affected_systems": [],
    "source": "agent",
}


def test_dashboard_stats_empty(auth_client):
    resp = auth_client.get("/api/v1/dashboard/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["open"] == 0
    assert data["in_progress"] == 0
    assert data["resolved"] == 0
    assert data["avg_confidence"] is None
    assert data["by_area"] == {}
    assert data["risk_distribution"] == {"high": 0, "medium": 0, "low": 0}


def test_dashboard_stats_with_tickets(auth_client, client, api_key_headers):
    client.post("/api/v1/tickets", json=TICKET_PAYLOAD, headers=api_key_headers)
    client.post(
        "/api/v1/tickets",
        json={**TICKET_PAYLOAD, "title": "T2", "area": "linux", "confidence": 0.5, "risk": 0.3},
        headers=api_key_headers,
    )
    resp = auth_client.get("/api/v1/dashboard/stats")
    data = resp.json()
    assert data["open"] == 2
    assert data["avg_confidence"] == 0.7
    assert data["by_area"]["kubernetes"] == 1
    assert data["by_area"]["linux"] == 1
    assert data["risk_distribution"]["high"] == 1
    assert data["risk_distribution"]["low"] == 1
