import io

from api.core.config import settings as _settings

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


def test_upload_artifact(client, api_key_headers, tmp_path, monkeypatch):
    monkeypatch.setattr(_settings, "artifact_storage_path", str(tmp_path))
    ticket_id = _create_ticket(client, api_key_headers)
    resp = client.post(
        f"/api/v1/tickets/{ticket_id}/artifacts",
        files={"file": ("error.log", io.BytesIO(b"ERROR: OOM killed"), "text/plain")},
        headers=api_key_headers,
    )
    assert resp.status_code == 201
    assert resp.json()["filename"] == "error.log"
    assert resp.json()["content_type"] == "text/plain"


def test_list_artifacts(client, api_key_headers, tmp_path, monkeypatch):
    monkeypatch.setattr(_settings, "artifact_storage_path", str(tmp_path))
    ticket_id = _create_ticket(client, api_key_headers)
    client.post(
        f"/api/v1/tickets/{ticket_id}/artifacts",
        files={"file": ("error.log", io.BytesIO(b"log data"), "text/plain")},
        headers=api_key_headers,
    )
    resp = client.get(f"/api/v1/tickets/{ticket_id}/artifacts", headers=api_key_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_download_artifact(client, api_key_headers, tmp_path, monkeypatch):
    monkeypatch.setattr(_settings, "artifact_storage_path", str(tmp_path))
    ticket_id = _create_ticket(client, api_key_headers)
    upload_resp = client.post(
        f"/api/v1/tickets/{ticket_id}/artifacts",
        files={"file": ("error.log", io.BytesIO(b"ERROR: OOM killed"), "text/plain")},
        headers=api_key_headers,
    )
    artifact_id = upload_resp.json()["id"]
    resp = client.get(f"/api/v1/artifacts/{artifact_id}/download", headers=api_key_headers)
    assert resp.status_code == 200
    assert resp.content == b"ERROR: OOM killed"
