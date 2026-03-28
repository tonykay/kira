import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, StaticPool
from sqlalchemy.orm import sessionmaker

from api.db.base import Base
from api.db.session import get_db
from api.auth.passwords import hash_password
from api.main import app


@pytest.fixture
def db_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    TestSession = sessionmaker(bind=engine)
    session = TestSession()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)


@pytest.fixture
def client(db_session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db_session):
    from api.db.models import User

    user = User(
        id=uuid.uuid4(),
        username="testuser",
        password_hash=hash_password("testpass123"),
        display_name="Test User",
        role="operator",
        expertise_area="linux",
        tier="tier_3_sme",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def admin_user(db_session):
    from api.db.models import User

    user = User(
        id=uuid.uuid4(),
        username="admin",
        password_hash=hash_password("adminpass123"),
        display_name="Admin User",
        role="admin",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def api_key_headers():
    return {"X-API-Key": "dev-api-key"}


@pytest.fixture
def auth_client(client, test_user):
    client.post("/api/v1/auth/login", json={"username": "testuser", "password": "testpass123"})
    return client


@pytest.fixture
def admin_client(client, admin_user):
    client.post("/api/v1/auth/login", json={"username": "admin", "password": "adminpass123"})
    return client
