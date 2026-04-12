TICKET_PAYLOAD = {
    "title": "OOM kills on payment-service pod",
    "description": "Pod payment-service-7d4b8c restarting due to OOM kills",
    "area": "kubernetes",
    "confidence": 0.92,
    "risk": 0.8,
    "recommended_action": "Increase memory limits from 512Mi to 1Gi",
    "affected_systems": ["payment-service-7d4b8c", "payment-service-9a2f1e"],
    "source": "agent",
}


def test_create_ticket_with_api_key(client, api_key_headers):
    resp = client.post("/api/v1/tickets", json=TICKET_PAYLOAD, headers=api_key_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == TICKET_PAYLOAD["title"]
    assert data["status"] == "open"
    assert data["confidence"] == 0.92
    assert data["risk"] == 0.8
    assert data["created_by_source"] == "agent"


def test_create_ticket_unauthenticated(client):
    resp = client.post("/api/v1/tickets", json=TICKET_PAYLOAD)
    assert resp.status_code == 401


def test_list_tickets(client, api_key_headers):
    client.post("/api/v1/tickets", json=TICKET_PAYLOAD, headers=api_key_headers)
    client.post(
        "/api/v1/tickets",
        json={**TICKET_PAYLOAD, "title": "SSH timeout", "area": "linux", "risk": 0.3},
        headers=api_key_headers,
    )
    resp = client.get("/api/v1/tickets", headers=api_key_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2


def test_filter_tickets_by_area(client, api_key_headers):
    client.post("/api/v1/tickets", json=TICKET_PAYLOAD, headers=api_key_headers)
    client.post(
        "/api/v1/tickets",
        json={**TICKET_PAYLOAD, "title": "SSH timeout", "area": "linux"},
        headers=api_key_headers,
    )
    resp = client.get("/api/v1/tickets?area=linux", headers=api_key_headers)
    assert resp.json()["total"] == 1
    assert resp.json()["items"][0]["area"] == "linux"


def test_filter_tickets_by_min_risk(client, api_key_headers):
    client.post("/api/v1/tickets", json=TICKET_PAYLOAD, headers=api_key_headers)
    client.post(
        "/api/v1/tickets",
        json={**TICKET_PAYLOAD, "title": "Low risk", "risk": 0.1},
        headers=api_key_headers,
    )
    resp = client.get("/api/v1/tickets?min_risk=0.5", headers=api_key_headers)
    assert resp.json()["total"] == 1


def test_get_ticket(client, api_key_headers):
    create_resp = client.post("/api/v1/tickets", json=TICKET_PAYLOAD, headers=api_key_headers)
    ticket_id = create_resp.json()["id"]
    resp = client.get(f"/api/v1/tickets/{ticket_id}", headers=api_key_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == ticket_id


def test_get_ticket_not_found(client, api_key_headers):
    resp = client.get("/api/v1/tickets/00000000-0000-0000-0000-000000000000", headers=api_key_headers)
    assert resp.status_code == 404


def test_update_ticket(auth_client, client, api_key_headers, test_user):
    create_resp = client.post("/api/v1/tickets", json=TICKET_PAYLOAD, headers=api_key_headers)
    ticket_id = create_resp.json()["id"]
    resp = auth_client.patch(
        f"/api/v1/tickets/{ticket_id}",
        json={"status": "acknowledged", "risk": 0.5},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "acknowledged"
    assert resp.json()["risk"] == 0.5


def test_update_ticket_creates_audit_entry(auth_client, client, api_key_headers):
    create_resp = client.post("/api/v1/tickets", json=TICKET_PAYLOAD, headers=api_key_headers)
    ticket_id = create_resp.json()["id"]
    auth_client.patch(f"/api/v1/tickets/{ticket_id}", json={"status": "acknowledged"})
    resp = auth_client.get(f"/api/v1/tickets/{ticket_id}/audit")
    assert resp.status_code == 200
    entries = resp.json()
    actions = [e["action"] for e in entries]
    assert "created" in actions
    assert "status_changed" in actions


def test_create_ticket_with_skills(client, api_key_headers):
    payload = {**TICKET_PAYLOAD, "skills": ["Kubernetes", " helm ", "ARGOCD"]}
    resp = client.post("/api/v1/tickets", json=payload, headers=api_key_headers)
    assert resp.status_code == 201
    assert resp.json()["skills"] == ["kubernetes", "helm", "argocd"]


def test_create_ticket_default_empty_skills(client, api_key_headers):
    resp = client.post("/api/v1/tickets", json=TICKET_PAYLOAD, headers=api_key_headers)
    assert resp.status_code == 201
    assert resp.json()["skills"] == []


def test_update_ticket_skills(auth_client, client, api_key_headers):
    create_resp = client.post("/api/v1/tickets", json=TICKET_PAYLOAD, headers=api_key_headers)
    ticket_id = create_resp.json()["id"]
    resp = auth_client.patch(
        f"/api/v1/tickets/{ticket_id}",
        json={"skills": ["Docker", " kubernetes"]},
    )
    assert resp.status_code == 200
    assert resp.json()["skills"] == ["docker", "kubernetes"]


def test_skills_deduplication(client, api_key_headers):
    payload = {**TICKET_PAYLOAD, "skills": ["helm", "Helm", "HELM"]}
    resp = client.post("/api/v1/tickets", json=payload, headers=api_key_headers)
    assert resp.status_code == 201
    assert resp.json()["skills"] == ["helm"]


def test_create_ticket_with_stage(client, api_key_headers):
    payload = {**TICKET_PAYLOAD, "stage": "production"}
    resp = client.post("/api/v1/tickets", json=payload, headers=api_key_headers)
    assert resp.status_code == 201
    assert resp.json()["stage"] == "production"


def test_create_ticket_default_stage(client, api_key_headers):
    resp = client.post("/api/v1/tickets", json=TICKET_PAYLOAD, headers=api_key_headers)
    assert resp.status_code == 201
    assert resp.json()["stage"] == "unknown"


def test_update_ticket_stage(auth_client, client, api_key_headers):
    create_resp = client.post("/api/v1/tickets", json=TICKET_PAYLOAD, headers=api_key_headers)
    ticket_id = create_resp.json()["id"]
    resp = auth_client.patch(
        f"/api/v1/tickets/{ticket_id}",
        json={"stage": "production"},
    )
    assert resp.status_code == 200
    assert resp.json()["stage"] == "production"
