def test_login_success(client, test_user):
    resp = client.post("/api/v1/auth/login", json={"username": "testuser", "password": "testpass123"})
    assert resp.status_code == 200
    assert resp.json()["username"] == "testuser"


def test_login_wrong_password(client, test_user):
    resp = client.post("/api/v1/auth/login", json={"username": "testuser", "password": "wrong"})
    assert resp.status_code == 401


def test_login_unknown_user(client):
    resp = client.post("/api/v1/auth/login", json={"username": "nobody", "password": "pass"})
    assert resp.status_code == 401


def test_me_authenticated(auth_client):
    resp = auth_client.get("/api/v1/auth/me")
    assert resp.status_code == 200
    assert resp.json()["username"] == "testuser"


def test_me_unauthenticated(client):
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401


def test_api_key_auth(client):
    resp = client.get("/api/v1/enums", headers={"X-API-Key": "dev-api-key"})
    assert resp.status_code == 200


def test_api_key_invalid(client):
    resp = client.get("/api/v1/tickets", headers={"X-API-Key": "wrong-key"})
    assert resp.status_code == 401


def test_logout(auth_client):
    resp = auth_client.post("/api/v1/auth/logout")
    assert resp.status_code == 200
    resp = auth_client.get("/api/v1/auth/me")
    assert resp.status_code == 401
