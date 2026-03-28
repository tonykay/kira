def test_create_user_as_admin(admin_client):
    resp = admin_client.post("/api/v1/users", json={
        "username": "newuser",
        "password": "securepass",
        "display_name": "New User",
        "role": "operator",
        "expertise_area": "linux",
        "tier": "tier_2",
    })
    assert resp.status_code == 201
    assert resp.json()["username"] == "newuser"
    assert "password" not in resp.json()
    assert "password_hash" not in resp.json()


def test_create_user_as_operator_forbidden(auth_client):
    resp = auth_client.post("/api/v1/users", json={
        "username": "newuser",
        "password": "securepass",
        "display_name": "New User",
    })
    assert resp.status_code == 403


def test_list_users(admin_client, test_user):
    resp = admin_client.get("/api/v1/users")
    assert resp.status_code == 200
    usernames = [u["username"] for u in resp.json()]
    assert "admin" in usernames
    assert "testuser" in usernames


def test_create_user_duplicate_username(admin_client, test_user):
    resp = admin_client.post("/api/v1/users", json={
        "username": "testuser",
        "password": "securepass",
        "display_name": "Duplicate",
    })
    assert resp.status_code == 409
