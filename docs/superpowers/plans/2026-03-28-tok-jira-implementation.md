# tok-jira Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a lightweight ticket troubleshooting application with a FastAPI backend and optional React frontend, designed to receive diagnostic tickets from external AIOps agent teams and present them to human SME operators.

**Architecture:** Monorepo with a FastAPI core API using SQLAlchemy 2.0 ORM and Pydantic V2 schemas, PostgreSQL for persistence, local filesystem for artifact storage, and a decoupled React (Vite) frontend. Auth is split: API key for agents, username/password sessions for humans.

**Tech Stack:** Python 3.13+, FastAPI, SQLAlchemy 2.0, Alembic, Pydantic V2, PostgreSQL 16, React, Vite, uv, Podman/Docker Compose, Kubernetes

---

## File Structure

```
tok-jira/
├── api/
│   ├── __init__.py
│   ├── main.py                    # FastAPI app factory, lifespan, CORS, router mounting
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py              # Settings via pydantic-settings (env vars)
│   │   └── deps.py                # Dependency injection (db session, current user)
│   ├── auth/
│   │   ├── __init__.py
│   │   ├── api_key.py             # X-API-Key header validation
│   │   ├── passwords.py           # bcrypt hash/verify
│   │   └── session.py             # Cookie-based session auth
│   ├── db/
│   │   ├── __init__.py
│   │   ├── base.py                # SQLAlchemy DeclarativeBase
│   │   ├── session.py             # Engine + sessionmaker
│   │   ├── models.py              # ORM models (Ticket, AuditLog, User, Artifact, Comment)
│   │   └── alembic/
│   │       ├── env.py
│   │       ├── alembic.ini
│   │       └── versions/
│   ├── models/
│   │   ├── __init__.py
│   │   ├── enums.py               # AreaEnum, StatusEnum, SourceEnum, RoleEnum
│   │   ├── tickets.py             # Pydantic V2 schemas for ticket CRUD
│   │   ├── comments.py            # Pydantic V2 schemas for comments
│   │   ├── artifacts.py           # Pydantic V2 schemas for artifacts
│   │   ├── users.py               # Pydantic V2 schemas for users
│   │   ├── audit.py               # Pydantic V2 schemas for audit log entries
│   │   └── auth.py                # LoginRequest, TokenResponse
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── tickets.py             # CRUD + filtering for tickets
│   │   ├── comments.py            # Add/list comments on tickets
│   │   ├── artifacts.py           # Upload/list/download artifacts
│   │   ├── audit.py               # Query audit trail
│   │   ├── auth.py                # Login/logout/me
│   │   ├── users.py               # Admin user management
│   │   ├── enums.py               # GET /enums
│   │   └── dashboard.py           # Dashboard stats endpoint
│   └── services/
│       ├── __init__.py
│       ├── audit.py               # Audit log creation helper
│       └── artifacts.py           # File storage operations
├── tests/
│   ├── __init__.py
│   ├── conftest.py                # Fixtures: test client, db session, test user, api key
│   ├── test_tickets.py
│   ├── test_comments.py
│   ├── test_artifacts.py
│   ├── test_audit.py
│   ├── test_auth.py
│   ├── test_users.py
│   ├── test_enums.py
│   └── test_dashboard.py
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── api/
│   │   │   └── client.ts           # Fetch wrapper for /api/v1/*
│   │   ├── components/
│   │   │   ├── Layout.tsx
│   │   │   ├── Lozenge.tsx          # Color-coded tag component
│   │   │   ├── TicketTable.tsx
│   │   │   └── AuditTimeline.tsx
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── TicketList.tsx
│   │   │   └── TicketDetail.tsx
│   │   └── types.ts                 # TypeScript types matching API schemas
│   └── tsconfig.json
├── deploy/
│   ├── Dockerfile.api
│   ├── Dockerfile.frontend
│   └── k8s/
│       ├── namespace.yaml
│       ├── configmap.yaml
│       ├── secret.yaml
│       ├── postgres.yaml
│       ├── api.yaml
│       └── frontend.yaml
├── pyproject.toml
├── compose.yaml
├── .env.example
├── .gitignore
└── CLAUDE.md
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `pyproject.toml`
- Create: `api/__init__.py`
- Create: `api/core/__init__.py`
- Create: `api/core/config.py`
- Create: `.env.example`
- Modify: `.gitignore`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Create `pyproject.toml` with uv**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/tok-jira/tok-jira
uv init --no-readme --python 3.13
```

- [ ] **Step 2: Add dependencies**

```bash
uv add fastapi uvicorn[standard] sqlalchemy[asyncio] alembic psycopg2-binary pydantic-settings bcrypt python-multipart
uv add --dev pytest pytest-asyncio httpx
```

- [ ] **Step 3: Create directory structure**

```bash
mkdir -p api/{core,auth,db/alembic/versions,models,routes,services}
mkdir -p tests
mkdir -p frontend
mkdir -p deploy/k8s
touch api/__init__.py api/core/__init__.py api/auth/__init__.py api/db/__init__.py api/models/__init__.py api/routes/__init__.py api/services/__init__.py
touch tests/__init__.py
```

- [ ] **Step 4: Create `api/core/config.py`**

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://tokjira:tokjira@localhost:5432/tokjira"
    api_key: str = "dev-api-key"
    secret_key: str = "dev-secret-key-change-in-production"
    artifact_storage_path: str = "./artifacts"

    model_config = {"env_prefix": "TOK_JIRA_"}


settings = Settings()
```

- [ ] **Step 5: Create `.env.example`**

```
TOK_JIRA_DATABASE_URL=postgresql://tokjira:tokjira@localhost:5432/tokjira
TOK_JIRA_API_KEY=dev-api-key
TOK_JIRA_SECRET_KEY=dev-secret-key-change-in-production
TOK_JIRA_ARTIFACT_STORAGE_PATH=./artifacts
```

- [ ] **Step 6: Update `.gitignore`**

Append to existing `.gitignore`:

```
.superpowers/
__pycache__/
*.pyc
.env
artifacts/
node_modules/
dist/
.venv/
```

- [ ] **Step 7: Verify uv project runs**

```bash
uv run python -c "from api.core.config import settings; print(settings.database_url)"
```

Expected: `postgresql://tokjira:tokjira@localhost:5432/tokjira`

- [ ] **Step 8: Commit**

```bash
git add pyproject.toml uv.lock api/ tests/__init__.py .env.example .gitignore
git commit -m "feat: project scaffolding with uv, FastAPI deps, and config"
```

---

## Task 2: Enums and Pydantic V2 Schemas

**Files:**
- Create: `api/models/enums.py`
- Create: `api/models/tickets.py`
- Create: `api/models/comments.py`
- Create: `api/models/artifacts.py`
- Create: `api/models/users.py`
- Create: `api/models/audit.py`
- Create: `api/models/auth.py`
- Test: `tests/test_enums.py`

- [ ] **Step 1: Write test for enums**

`tests/test_enums.py`:

```python
from api.models.enums import AreaEnum, StatusEnum, SourceEnum, RoleEnum


def test_area_enum_values():
    assert AreaEnum.LINUX == "linux"
    assert AreaEnum.KUBERNETES == "kubernetes"
    assert AreaEnum.NETWORKING == "networking"
    assert AreaEnum.DATABASE == "database"
    assert AreaEnum.STORAGE == "storage"
    assert AreaEnum.SECURITY == "security"
    assert AreaEnum.APPLICATION == "application"


def test_status_enum_values():
    assert StatusEnum.OPEN == "open"
    assert StatusEnum.ACKNOWLEDGED == "acknowledged"
    assert StatusEnum.IN_PROGRESS == "in_progress"
    assert StatusEnum.RESOLVED == "resolved"
    assert StatusEnum.CLOSED == "closed"


def test_source_enum_values():
    assert SourceEnum.AGENT == "agent"
    assert SourceEnum.HUMAN == "human"


def test_role_enum_values():
    assert RoleEnum.ADMIN == "admin"
    assert RoleEnum.OPERATOR == "operator"
    assert RoleEnum.VIEWER == "viewer"
```

- [ ] **Step 2: Run test to verify it fails**

```bash
uv run pytest tests/test_enums.py -v
```

Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Implement enums**

`api/models/enums.py`:

```python
from enum import StrEnum


class AreaEnum(StrEnum):
    LINUX = "linux"
    KUBERNETES = "kubernetes"
    NETWORKING = "networking"
    DATABASE = "database"
    STORAGE = "storage"
    SECURITY = "security"
    APPLICATION = "application"


class StatusEnum(StrEnum):
    OPEN = "open"
    ACKNOWLEDGED = "acknowledged"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class SourceEnum(StrEnum):
    AGENT = "agent"
    HUMAN = "human"


class RoleEnum(StrEnum):
    ADMIN = "admin"
    OPERATOR = "operator"
    VIEWER = "viewer"
```

- [ ] **Step 4: Run test to verify it passes**

```bash
uv run pytest tests/test_enums.py -v
```

Expected: 4 PASSED

- [ ] **Step 5: Create Pydantic V2 ticket schemas**

`api/models/tickets.py`:

```python
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from api.models.enums import AreaEnum, SourceEnum, StatusEnum


class TicketCreate(BaseModel):
    title: str = Field(max_length=255)
    description: str
    area: AreaEnum
    confidence: float = Field(ge=0.0, le=1.0)
    risk: float = Field(ge=0.0, le=1.0)
    recommended_action: str
    affected_systems: list[str] = Field(default_factory=list)
    source: SourceEnum = SourceEnum.AGENT


class TicketUpdate(BaseModel):
    status: StatusEnum | None = None
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    risk: float | None = Field(default=None, ge=0.0, le=1.0)
    assigned_to: UUID | None = None


class TicketResponse(BaseModel):
    id: UUID
    title: str
    description: str
    area: AreaEnum
    status: StatusEnum
    confidence: float
    risk: float
    recommended_action: str
    affected_systems: list[str]
    assigned_to: UUID | None
    created_by_source: SourceEnum
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TicketListResponse(BaseModel):
    items: list[TicketResponse]
    total: int
    page: int
    per_page: int
```

- [ ] **Step 6: Create remaining Pydantic schemas**

`api/models/comments.py`:

```python
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from api.models.enums import SourceEnum


class CommentCreate(BaseModel):
    body: str
    source: SourceEnum = SourceEnum.HUMAN


class CommentResponse(BaseModel):
    id: UUID
    ticket_id: UUID
    body: str
    author_source: SourceEnum
    author_name: str
    created_at: datetime

    model_config = {"from_attributes": True}
```

`api/models/artifacts.py`:

```python
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from api.models.enums import SourceEnum


class ArtifactResponse(BaseModel):
    id: UUID
    ticket_id: UUID
    filename: str
    content_type: str
    uploaded_by_source: SourceEnum
    uploaded_at: datetime

    model_config = {"from_attributes": True}
```

`api/models/users.py`:

```python
from uuid import UUID

from pydantic import BaseModel, Field

from api.models.enums import AreaEnum, RoleEnum


class UserCreate(BaseModel):
    username: str = Field(max_length=50)
    password: str = Field(min_length=6)
    display_name: str = Field(max_length=100)
    role: RoleEnum = RoleEnum.OPERATOR
    expertise_area: AreaEnum | None = None
    tier: str | None = None


class UserResponse(BaseModel):
    id: UUID
    username: str
    display_name: str
    role: RoleEnum
    expertise_area: AreaEnum | None
    tier: str | None

    model_config = {"from_attributes": True}
```

`api/models/audit.py`:

```python
from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel

from api.models.enums import SourceEnum


class AuditLogResponse(BaseModel):
    id: UUID
    ticket_id: UUID
    action: str
    actor_source: SourceEnum
    actor_name: str
    actor_tier: str | None
    old_value: dict[str, Any] | None
    new_value: dict[str, Any] | None
    timestamp: datetime

    model_config = {"from_attributes": True}
```

`api/models/auth.py`:

```python
from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str
```

- [ ] **Step 7: Commit**

```bash
git add api/models/ tests/test_enums.py
git commit -m "feat: add enums and Pydantic V2 schemas for all entities"
```

---

## Task 3: Database Layer — ORM Models and Session

**Files:**
- Create: `api/db/base.py`
- Create: `api/db/session.py`
- Create: `api/db/models.py`

- [ ] **Step 1: Create SQLAlchemy base**

`api/db/base.py`:

```python
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
```

- [ ] **Step 2: Create database session factory**

`api/db/session.py`:

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from api.core.config import settings

engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

- [ ] **Step 3: Create ORM models**

`api/db/models.py`:

```python
import uuid
from datetime import datetime, timezone

from sqlalchemy import ForeignKey, Text, String
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.db.base import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="operator")
    expertise_area: Mapped[str | None] = mapped_column(String(50), nullable=True)
    tier: Mapped[str | None] = mapped_column(String(50), nullable=True)


class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    area: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="open")
    confidence: Mapped[float] = mapped_column(nullable=False)
    risk: Mapped[float] = mapped_column(nullable=False)
    recommended_action: Mapped[str] = mapped_column(Text, nullable=False)
    affected_systems: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    assigned_to: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    created_by_source: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, onupdate=utcnow)

    assignee: Mapped[User | None] = relationship("User", lazy="joined")
    comments: Mapped[list["Comment"]] = relationship("Comment", back_populates="ticket")
    artifacts: Mapped[list["Artifact"]] = relationship("Artifact", back_populates="ticket")
    audit_entries: Mapped[list["AuditLog"]] = relationship("AuditLog", back_populates="ticket")


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tickets.id"), nullable=False
    )
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    actor_source: Mapped[str] = mapped_column(String(20), nullable=False)
    actor_name: Mapped[str] = mapped_column(String(100), nullable=False)
    actor_tier: Mapped[str | None] = mapped_column(String(50), nullable=True)
    old_value: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    new_value: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(default=utcnow)

    ticket: Mapped[Ticket] = relationship("Ticket", back_populates="audit_entries")


class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tickets.id"), nullable=False
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    author_source: Mapped[str] = mapped_column(String(20), nullable=False)
    author_name: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)

    ticket: Mapped[Ticket] = relationship("Ticket", back_populates="comments")


class Artifact(Base):
    __tablename__ = "artifacts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tickets.id"), nullable=False
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(500), nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    uploaded_by_source: Mapped[str] = mapped_column(String(20), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(default=utcnow)

    ticket: Mapped[Ticket] = relationship("Ticket", back_populates="artifacts")
```

- [ ] **Step 4: Verify models import cleanly**

```bash
uv run python -c "from api.db.models import User, Ticket, AuditLog, Comment, Artifact; print('OK')"
```

Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add api/db/
git commit -m "feat: add SQLAlchemy ORM models and session factory"
```

---

## Task 4: Alembic Setup and Initial Migration

**Files:**
- Create: `api/db/alembic/env.py`
- Create: `alembic.ini`

- [ ] **Step 1: Initialize Alembic**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/tok-jira/tok-jira
uv run alembic init api/db/alembic
```

- [ ] **Step 2: Edit `alembic.ini`**

Set `script_location` and `sqlalchemy.url`:

In `alembic.ini`, set:
```ini
script_location = api/db/alembic
sqlalchemy.url = postgresql://tokjira:tokjira@localhost:5432/tokjira
```

- [ ] **Step 3: Edit `api/db/alembic/env.py`**

Replace the `target_metadata` line and add model imports:

```python
# Near the top, after existing imports:
from api.db.base import Base
from api.db import models  # noqa: F401 — registers models with Base.metadata

# Replace target_metadata = None with:
target_metadata = Base.metadata
```

- [ ] **Step 4: Start a local Postgres for development**

```bash
podman run -d --name tokjira-postgres \
  -e POSTGRES_USER=tokjira \
  -e POSTGRES_PASSWORD=tokjira \
  -e POSTGRES_DB=tokjira \
  -p 5432:5432 \
  postgres:16
```

- [ ] **Step 5: Generate initial migration**

```bash
uv run alembic revision --autogenerate -m "initial schema"
```

- [ ] **Step 6: Run migration**

```bash
uv run alembic upgrade head
```

- [ ] **Step 7: Verify tables exist**

```bash
podman exec tokjira-postgres psql -U tokjira -c "\dt"
```

Expected: tables `users`, `tickets`, `audit_log`, `comments`, `artifacts`, `alembic_version`

- [ ] **Step 8: Commit**

```bash
git add alembic.ini api/db/alembic/
git commit -m "feat: add Alembic migrations with initial schema"
```

---

## Task 5: Auth System

**Files:**
- Create: `api/auth/passwords.py`
- Create: `api/auth/api_key.py`
- Create: `api/auth/session.py`
- Create: `api/core/deps.py`
- Test: `tests/test_auth.py`
- Test: `tests/conftest.py`

- [ ] **Step 1: Write auth tests**

`tests/conftest.py`:

```python
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
```

`tests/test_auth.py`:

```python
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
uv run pytest tests/test_auth.py -v
```

Expected: FAIL — imports don't exist yet

- [ ] **Step 3: Implement password utilities**

`api/auth/passwords.py`:

```python
import bcrypt


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())
```

- [ ] **Step 4: Implement API key auth**

`api/auth/api_key.py`:

```python
from fastapi import HTTPException, Security
from fastapi.security import APIKeyHeader

from api.core.config import settings

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def verify_api_key(api_key: str | None = Security(api_key_header)) -> str:
    if api_key and api_key == settings.api_key:
        return api_key
    raise HTTPException(status_code=401, detail="Invalid API key")
```

- [ ] **Step 5: Implement session auth**

`api/auth/session.py`:

```python
from uuid import UUID

from fastapi import HTTPException, Request

SESSION_COOKIE_NAME = "tok_jira_session"


def set_session(request: Request, user_id: UUID, username: str) -> None:
    request.session["user_id"] = str(user_id)
    request.session["username"] = username


def clear_session(request: Request) -> None:
    request.session.clear()


def get_session_user_id(request: Request) -> str:
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user_id
```

- [ ] **Step 6: Implement dependency injection**

`api/core/deps.py`:

```python
from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from api.auth.api_key import api_key_header
from api.auth.session import get_session_user_id
from api.core.config import settings
from api.db.models import User
from api.db.session import get_db


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    user_id = get_session_user_id(request)
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def get_current_user_or_api_key(
    request: Request,
    db: Session = Depends(get_db),
    api_key: str | None = Depends(api_key_header),
) -> User | str:
    """Returns a User for session auth, or 'api_key' string for API key auth."""
    if api_key and api_key == settings.api_key:
        return "api_key"
    try:
        return get_current_user(request, db)
    except HTTPException:
        raise HTTPException(status_code=401, detail="Authentication required")


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
```

- [ ] **Step 7: Create auth routes**

`api/routes/auth.py`:

```python
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from api.auth.passwords import verify_password
from api.auth.session import clear_session, set_session
from api.core.deps import get_current_user
from api.db.models import User
from api.db.session import get_db
from api.models.auth import LoginRequest
from api.models.users import UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=UserResponse)
def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == body.username).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    set_session(request, user.id, user.username)
    return user


@router.post("/logout")
def logout(request: Request):
    clear_session(request)
    return {"detail": "Logged out"}


@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)):
    return user
```

- [ ] **Step 8: Create enums route**

`api/routes/enums.py`:

```python
from fastapi import APIRouter

from api.models.enums import AreaEnum, RoleEnum, SourceEnum, StatusEnum

router = APIRouter(tags=["enums"])


@router.get("/enums")
def get_enums():
    return {
        "areas": [e.value for e in AreaEnum],
        "statuses": [e.value for e in StatusEnum],
        "sources": [e.value for e in SourceEnum],
        "roles": [e.value for e in RoleEnum],
    }
```

- [ ] **Step 9: Create FastAPI app**

`api/main.py`:

```python
from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware

from api.core.config import settings
from api.routes import auth, enums

app = FastAPI(title="tok-jira", version="0.1.0")
app.add_middleware(SessionMiddleware, secret_key=settings.secret_key)

api_v1 = FastAPI(title="tok-jira API v1")
api_v1.include_router(auth.router)
api_v1.include_router(enums.router)

app.mount("/api/v1", api_v1)
```

- [ ] **Step 10: Run tests**

```bash
uv run pytest tests/test_auth.py -v
```

Expected: all PASSED

Note: SQLite doesn't support PostgreSQL `ARRAY` type. The conftest uses `sqlite:///:memory:` for speed, but the `affected_systems` column uses `ARRAY(String)`. You may need to adjust the ORM model to use a JSON column fallback or use a test Postgres. If SQLite errors occur, update `api/db/models.py` to use `JSONB` for `affected_systems` instead of `ARRAY(String)` — this works on both SQLite (as JSON text) and PostgreSQL.

- [ ] **Step 11: Commit**

```bash
git add api/auth/ api/core/deps.py api/routes/auth.py api/routes/enums.py api/main.py tests/conftest.py tests/test_auth.py
git commit -m "feat: add auth system with API key, session, and password support"
```

---

## Task 6: Audit Service

**Files:**
- Create: `api/services/audit.py`

- [ ] **Step 1: Create audit service**

`api/services/audit.py`:

```python
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from api.db.models import AuditLog, User


def create_audit_entry(
    db: Session,
    ticket_id: UUID,
    action: str,
    actor: User | str,
    old_value: dict[str, Any] | None = None,
    new_value: dict[str, Any] | None = None,
) -> AuditLog:
    if isinstance(actor, User):
        actor_source = "human"
        actor_name = actor.username
        actor_tier = actor.tier
    else:
        actor_source = "agent"
        actor_name = actor
        actor_tier = None

    entry = AuditLog(
        ticket_id=ticket_id,
        action=action,
        actor_source=actor_source,
        actor_name=actor_name,
        actor_tier=actor_tier,
        old_value=old_value,
        new_value=new_value,
    )
    db.add(entry)
    return entry
```

- [ ] **Step 2: Commit**

```bash
git add api/services/audit.py
git commit -m "feat: add audit log service for tracking ticket changes"
```

---

## Task 7: Ticket Routes (CRUD + Filtering)

**Files:**
- Create: `api/routes/tickets.py`
- Test: `tests/test_tickets.py`
- Modify: `api/main.py`

- [ ] **Step 1: Write ticket tests**

`tests/test_tickets.py`:

```python
import pytest


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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
uv run pytest tests/test_tickets.py -v
```

Expected: FAIL

- [ ] **Step 3: Implement ticket routes**

`api/routes/tickets.py`:

```python
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from api.core.deps import get_current_user, get_current_user_or_api_key
from api.db.models import Ticket, User
from api.db.session import get_db
from api.models.enums import AreaEnum, StatusEnum
from api.models.tickets import TicketCreate, TicketListResponse, TicketResponse, TicketUpdate
from api.services.audit import create_audit_entry

router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.post("", response_model=TicketResponse, status_code=201)
def create_ticket(
    body: TicketCreate,
    db: Session = Depends(get_db),
    auth: User | str = Depends(get_current_user_or_api_key),
):
    ticket = Ticket(
        title=body.title,
        description=body.description,
        area=body.area.value,
        confidence=body.confidence,
        risk=body.risk,
        recommended_action=body.recommended_action,
        affected_systems=body.affected_systems,
        created_by_source=body.source.value,
    )
    db.add(ticket)
    db.flush()

    actor = auth if isinstance(auth, User) else "api_agent"
    create_audit_entry(
        db,
        ticket_id=ticket.id,
        action="created",
        actor=actor,
        new_value={"title": ticket.title, "area": ticket.area, "risk": ticket.risk, "confidence": ticket.confidence},
    )
    db.commit()
    db.refresh(ticket)
    return ticket


@router.get("", response_model=TicketListResponse)
def list_tickets(
    area: AreaEnum | None = None,
    status: StatusEnum | None = None,
    min_risk: float | None = None,
    assigned_to: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    auth: User | str = Depends(get_current_user_or_api_key),
):
    query = db.query(Ticket)
    if area:
        query = query.filter(Ticket.area == area.value)
    if status:
        query = query.filter(Ticket.status == status.value)
    if min_risk is not None:
        query = query.filter(Ticket.risk >= min_risk)
    if assigned_to:
        query = query.join(User, Ticket.assigned_to == User.id).filter(User.username == assigned_to)

    total = query.count()
    items = query.order_by(Ticket.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

    return TicketListResponse(items=items, total=total, page=page, per_page=per_page)


@router.get("/{ticket_id}", response_model=TicketResponse)
def get_ticket(
    ticket_id: UUID,
    db: Session = Depends(get_db),
    auth: User | str = Depends(get_current_user_or_api_key),
):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@router.patch("/{ticket_id}", response_model=TicketResponse)
def update_ticket(
    ticket_id: UUID,
    body: TicketUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    updates = body.model_dump(exclude_unset=True)
    for field, new_value in updates.items():
        old_value = getattr(ticket, field)
        if field == "assigned_to":
            old_value = str(old_value) if old_value else None
            new_value_str = str(new_value) if new_value else None
            setattr(ticket, field, new_value)
            create_audit_entry(
                db, ticket.id, f"{field}_changed", user,
                old_value={field: old_value}, new_value={field: new_value_str},
            )
        else:
            setattr(ticket, field, new_value.value if hasattr(new_value, "value") else new_value)
            create_audit_entry(
                db, ticket.id, f"{field}_changed", user,
                old_value={field: str(old_value)},
                new_value={field: str(new_value.value if hasattr(new_value, "value") else new_value)},
            )

    db.commit()
    db.refresh(ticket)
    return ticket
```

- [ ] **Step 4: Create audit route**

`api/routes/audit.py`:

```python
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.core.deps import get_current_user_or_api_key
from api.db.models import AuditLog, Ticket, User
from api.db.session import get_db
from api.models.audit import AuditLogResponse

router = APIRouter(tags=["audit"])


@router.get("/tickets/{ticket_id}/audit", response_model=list[AuditLogResponse])
def get_ticket_audit(
    ticket_id: UUID,
    db: Session = Depends(get_db),
    auth: User | str = Depends(get_current_user_or_api_key),
):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    entries = (
        db.query(AuditLog)
        .filter(AuditLog.ticket_id == ticket_id)
        .order_by(AuditLog.timestamp.asc())
        .all()
    )
    return entries
```

- [ ] **Step 5: Mount new routers in `api/main.py`**

Update `api/main.py` to include ticket and audit routers:

```python
from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware

from api.core.config import settings
from api.routes import auth, audit, enums, tickets

app = FastAPI(title="tok-jira", version="0.1.0")
app.add_middleware(SessionMiddleware, secret_key=settings.secret_key)

api_v1 = FastAPI(title="tok-jira API v1")
api_v1.include_router(auth.router)
api_v1.include_router(enums.router)
api_v1.include_router(tickets.router)
api_v1.include_router(audit.router)

app.mount("/api/v1", api_v1)
```

- [ ] **Step 6: Run tests**

```bash
uv run pytest tests/test_tickets.py -v
```

Expected: all PASSED

- [ ] **Step 7: Commit**

```bash
git add api/routes/tickets.py api/routes/audit.py api/main.py tests/test_tickets.py
git commit -m "feat: add ticket CRUD with filtering, audit trail integration"
```

---

## Task 8: Comments Routes

**Files:**
- Create: `api/routes/comments.py`
- Test: `tests/test_comments.py`
- Modify: `api/main.py`

- [ ] **Step 1: Write comment tests**

`tests/test_comments.py`:

```python
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
uv run pytest tests/test_comments.py -v
```

Expected: FAIL

- [ ] **Step 3: Implement comment routes**

`api/routes/comments.py`:

```python
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.core.deps import get_current_user_or_api_key
from api.db.models import Comment, Ticket, User
from api.db.session import get_db
from api.models.comments import CommentCreate, CommentResponse
from api.services.audit import create_audit_entry

router = APIRouter(tags=["comments"])


@router.post("/tickets/{ticket_id}/comments", response_model=CommentResponse, status_code=201)
def add_comment(
    ticket_id: UUID,
    body: CommentCreate,
    db: Session = Depends(get_db),
    auth: User | str = Depends(get_current_user_or_api_key),
):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if isinstance(auth, User):
        author_source = body.source.value
        author_name = auth.username
    else:
        author_source = "agent"
        author_name = "api_agent"

    comment = Comment(
        ticket_id=ticket_id,
        body=body.body,
        author_source=author_source,
        author_name=author_name,
    )
    db.add(comment)

    create_audit_entry(
        db, ticket_id, "comment_added", auth,
        new_value={"body": body.body[:100]},
    )
    db.commit()
    db.refresh(comment)
    return comment


@router.get("/tickets/{ticket_id}/comments", response_model=list[CommentResponse])
def list_comments(
    ticket_id: UUID,
    db: Session = Depends(get_db),
    auth: User | str = Depends(get_current_user_or_api_key),
):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return (
        db.query(Comment)
        .filter(Comment.ticket_id == ticket_id)
        .order_by(Comment.created_at.asc())
        .all()
    )
```

- [ ] **Step 4: Mount comments router in `api/main.py`**

Add to imports and router mounting:

```python
from api.routes import auth, audit, comments, enums, tickets
# ...
api_v1.include_router(comments.router)
```

- [ ] **Step 5: Run tests**

```bash
uv run pytest tests/test_comments.py -v
```

Expected: all PASSED

- [ ] **Step 6: Commit**

```bash
git add api/routes/comments.py tests/test_comments.py api/main.py
git commit -m "feat: add comment routes with audit trail integration"
```

---

## Task 9: Artifact Routes

**Files:**
- Create: `api/services/artifacts.py`
- Create: `api/routes/artifacts.py`
- Test: `tests/test_artifacts.py`
- Modify: `api/main.py`

- [ ] **Step 1: Write artifact tests**

`tests/test_artifacts.py`:

```python
import io

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
    monkeypatch.setenv("TOK_JIRA_ARTIFACT_STORAGE_PATH", str(tmp_path))
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
    monkeypatch.setenv("TOK_JIRA_ARTIFACT_STORAGE_PATH", str(tmp_path))
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
    monkeypatch.setenv("TOK_JIRA_ARTIFACT_STORAGE_PATH", str(tmp_path))
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
uv run pytest tests/test_artifacts.py -v
```

Expected: FAIL

- [ ] **Step 3: Implement artifact storage service**

`api/services/artifacts.py`:

```python
import os
import uuid
from pathlib import Path

from api.core.config import settings


def save_artifact(ticket_id: uuid.UUID, filename: str, content: bytes) -> str:
    ticket_dir = Path(settings.artifact_storage_path) / str(ticket_id)
    ticket_dir.mkdir(parents=True, exist_ok=True)
    safe_filename = f"{uuid.uuid4().hex}_{filename}"
    file_path = ticket_dir / safe_filename
    file_path.write_bytes(content)
    return str(file_path)


def read_artifact(storage_path: str) -> bytes:
    return Path(storage_path).read_bytes()
```

- [ ] **Step 4: Implement artifact routes**

`api/routes/artifacts.py`:

```python
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

from api.core.deps import get_current_user_or_api_key
from api.db.models import Artifact, Ticket, User
from api.db.session import get_db
from api.models.artifacts import ArtifactResponse
from api.services.artifacts import read_artifact, save_artifact
from api.services.audit import create_audit_entry

router = APIRouter(tags=["artifacts"])


@router.post("/tickets/{ticket_id}/artifacts", response_model=ArtifactResponse, status_code=201)
async def upload_artifact(
    ticket_id: UUID,
    file: UploadFile,
    db: Session = Depends(get_db),
    auth: User | str = Depends(get_current_user_or_api_key),
):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    content = await file.read()
    storage_path = save_artifact(ticket_id, file.filename, content)
    source = "human" if isinstance(auth, User) else "agent"

    artifact = Artifact(
        ticket_id=ticket_id,
        filename=file.filename,
        storage_path=storage_path,
        content_type=file.content_type or "application/octet-stream",
        uploaded_by_source=source,
    )
    db.add(artifact)

    create_audit_entry(
        db, ticket_id, "artifact_uploaded", auth,
        new_value={"filename": file.filename},
    )
    db.commit()
    db.refresh(artifact)
    return artifact


@router.get("/tickets/{ticket_id}/artifacts", response_model=list[ArtifactResponse])
def list_artifacts(
    ticket_id: UUID,
    db: Session = Depends(get_db),
    auth: User | str = Depends(get_current_user_or_api_key),
):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return db.query(Artifact).filter(Artifact.ticket_id == ticket_id).all()


@router.get("/artifacts/{artifact_id}/download")
def download_artifact(
    artifact_id: UUID,
    db: Session = Depends(get_db),
    auth: User | str = Depends(get_current_user_or_api_key),
):
    artifact = db.get(Artifact, artifact_id)
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")
    content = read_artifact(artifact.storage_path)
    return Response(
        content=content,
        media_type=artifact.content_type,
        headers={"Content-Disposition": f'attachment; filename="{artifact.filename}"'},
    )
```

- [ ] **Step 5: Mount artifacts router in `api/main.py`**

Add to imports and router mounting:

```python
from api.routes import artifacts, auth, audit, comments, enums, tickets
# ...
api_v1.include_router(artifacts.router)
```

- [ ] **Step 6: Run tests**

```bash
uv run pytest tests/test_artifacts.py -v
```

Expected: all PASSED

- [ ] **Step 7: Commit**

```bash
git add api/services/artifacts.py api/routes/artifacts.py tests/test_artifacts.py api/main.py
git commit -m "feat: add artifact upload, list, and download with filesystem storage"
```

---

## Task 10: User Management Routes

**Files:**
- Create: `api/routes/users.py`
- Test: `tests/test_users.py`
- Modify: `api/main.py`

- [ ] **Step 1: Write user management tests**

`tests/test_users.py`:

```python
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
uv run pytest tests/test_users.py -v
```

Expected: FAIL

- [ ] **Step 3: Implement user routes**

`api/routes/users.py`:

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.auth.passwords import hash_password
from api.core.deps import require_admin
from api.db.models import User
from api.db.session import get_db
from api.models.users import UserCreate, UserResponse

router = APIRouter(prefix="/users", tags=["users"])


@router.post("", response_model=UserResponse, status_code=201)
def create_user(
    body: UserCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    existing = db.query(User).filter(User.username == body.username).first()
    if existing:
        raise HTTPException(status_code=409, detail="Username already exists")

    user = User(
        username=body.username,
        password_hash=hash_password(body.password),
        display_name=body.display_name,
        role=body.role.value,
        expertise_area=body.expertise_area.value if body.expertise_area else None,
        tier=body.tier,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    return db.query(User).all()
```

- [ ] **Step 4: Mount users router in `api/main.py`**

Add to imports and router mounting:

```python
from api.routes import artifacts, auth, audit, comments, enums, tickets, users
# ...
api_v1.include_router(users.router)
```

- [ ] **Step 5: Run tests**

```bash
uv run pytest tests/test_users.py -v
```

Expected: all PASSED

- [ ] **Step 6: Commit**

```bash
git add api/routes/users.py tests/test_users.py api/main.py
git commit -m "feat: add admin user management routes"
```

---

## Task 11: Dashboard Stats Endpoint

**Files:**
- Create: `api/routes/dashboard.py`
- Test: `tests/test_dashboard.py`
- Modify: `api/main.py`

- [ ] **Step 1: Write dashboard tests**

`tests/test_dashboard.py`:

```python
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
uv run pytest tests/test_dashboard.py -v
```

Expected: FAIL

- [ ] **Step 3: Implement dashboard route**

`api/routes/dashboard.py`:

```python
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from api.core.deps import get_current_user_or_api_key
from api.db.models import Ticket, User
from api.db.session import get_db

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    auth: User | str = Depends(get_current_user_or_api_key),
):
    tickets = db.query(Ticket).all()

    status_counts = {"open": 0, "acknowledged": 0, "in_progress": 0, "resolved": 0, "closed": 0}
    area_counts: dict[str, int] = {}
    risk_distribution = {"high": 0, "medium": 0, "low": 0}
    confidences: list[float] = []

    for t in tickets:
        status_counts[t.status] = status_counts.get(t.status, 0) + 1
        area_counts[t.area] = area_counts.get(t.area, 0) + 1
        confidences.append(t.confidence)

        if t.risk >= 0.7:
            risk_distribution["high"] += 1
        elif t.risk >= 0.4:
            risk_distribution["medium"] += 1
        else:
            risk_distribution["low"] += 1

    avg_confidence = round(sum(confidences) / len(confidences), 2) if confidences else None

    return {
        "open": status_counts["open"],
        "acknowledged": status_counts["acknowledged"],
        "in_progress": status_counts["in_progress"],
        "resolved": status_counts["resolved"],
        "closed": status_counts["closed"],
        "avg_confidence": avg_confidence,
        "by_area": area_counts,
        "risk_distribution": risk_distribution,
    }
```

- [ ] **Step 4: Mount dashboard router in `api/main.py`**

Add to imports and router mounting:

```python
from api.routes import artifacts, auth, audit, comments, dashboard, enums, tickets, users
# ...
api_v1.include_router(dashboard.router)
```

- [ ] **Step 5: Run tests**

```bash
uv run pytest tests/test_dashboard.py -v
```

Expected: all PASSED

- [ ] **Step 6: Run full test suite**

```bash
uv run pytest tests/ -v
```

Expected: all tests PASSED

- [ ] **Step 7: Commit**

```bash
git add api/routes/dashboard.py tests/test_dashboard.py api/main.py
git commit -m "feat: add dashboard stats endpoint with area/risk/confidence aggregation"
```

---

## Task 12: Webhook Stubs (Schema + Endpoints, No Dispatcher)

**Files:**
- Modify: `api/db/models.py`
- Create: `api/models/webhooks.py`
- Create: `api/routes/webhooks.py`
- Modify: `api/main.py`

- [ ] **Step 1: Add Webhook ORM model**

Append to `api/db/models.py`:

```python
class Webhook(Base):
    __tablename__ = "webhooks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    events: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
```

- [ ] **Step 2: Create Pydantic schemas**

`api/models/webhooks.py`:

```python
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class WebhookCreate(BaseModel):
    url: str = Field(max_length=500)
    events: list[str] = Field(
        description="Events to trigger on: ticket.created, ticket.status_changed, ticket.risk_changed"
    )


class WebhookResponse(BaseModel):
    id: UUID
    url: str
    events: list[str]
    created_at: datetime

    model_config = {"from_attributes": True}
```

- [ ] **Step 3: Create webhook routes**

`api/routes/webhooks.py`:

```python
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.core.deps import require_admin
from api.db.models import User, Webhook
from api.db.session import get_db
from api.models.webhooks import WebhookCreate, WebhookResponse

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("", response_model=WebhookResponse, status_code=201)
def register_webhook(
    body: WebhookCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    webhook = Webhook(url=body.url, events=body.events)
    db.add(webhook)
    db.commit()
    db.refresh(webhook)
    return webhook


@router.get("", response_model=list[WebhookResponse])
def list_webhooks(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    return db.query(Webhook).all()


@router.delete("/{webhook_id}", status_code=204)
def delete_webhook(
    webhook_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    webhook = db.get(Webhook, webhook_id)
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    db.delete(webhook)
    db.commit()
```

- [ ] **Step 4: Mount webhooks router in `api/main.py`**

Add to imports and router mounting:

```python
from api.routes import artifacts, auth, audit, comments, dashboard, enums, tickets, users, webhooks
# ...
api_v1.include_router(webhooks.router)
```

- [ ] **Step 5: Generate Alembic migration for webhooks table**

```bash
uv run alembic revision --autogenerate -m "add webhooks table"
uv run alembic upgrade head
```

- [ ] **Step 6: Commit**

```bash
git add api/db/models.py api/models/webhooks.py api/routes/webhooks.py api/main.py api/db/alembic/versions/
git commit -m "feat: stub webhook registration endpoints (dispatcher deferred)"
```

---

## Task 13: Seed Data Script

**Files:**
- Create: `api/seed.py`

- [ ] **Step 1: Create seed script**

`api/seed.py`:

```python
"""Seed the database with an admin user and sample tickets for demo purposes."""

import sys

from sqlalchemy.orm import Session

from api.auth.passwords import hash_password
from api.db.models import AuditLog, Comment, Ticket, User
from api.db.session import SessionLocal


def seed():
    db: Session = SessionLocal()
    try:
        if db.query(User).first():
            print("Database already seeded. Skipping.")
            return

        admin = User(
            username="admin",
            password_hash=hash_password("admin123"),
            display_name="Admin User",
            role="admin",
        )
        op1 = User(
            username="jsmith",
            password_hash=hash_password("password"),
            display_name="Jane Smith",
            role="operator",
            expertise_area="kubernetes",
            tier="tier_3_sme",
        )
        op2 = User(
            username="akhan",
            password_hash=hash_password("password"),
            display_name="Amir Khan",
            role="operator",
            expertise_area="linux",
            tier="tier_2",
        )
        viewer = User(
            username="viewer",
            password_hash=hash_password("password"),
            display_name="Read Only",
            role="viewer",
        )

        db.add_all([admin, op1, op2, viewer])
        db.flush()

        tickets_data = [
            {
                "title": "OOM kills on payment-service pod",
                "description": "## Root Cause Analysis\n\nPod `payment-service-7d4b8c` is being OOM-killed repeatedly.\n\n**Evidence:**\n- `kubectl describe pod` shows `OOMKilled` exit code\n- Memory usage trending at 490Mi against 512Mi limit\n- Heap dump shows leak in PaymentHandler.processRefund()\n\n**Timeline:** Started 2026-03-27 14:30 UTC after deploy v2.4.1",
                "area": "kubernetes",
                "confidence": 0.95,
                "risk": 0.9,
                "recommended_action": "Increase memory limits from 512Mi to 1Gi and investigate memory leak in PaymentHandler.processRefund()",
                "affected_systems": ["payment-service-7d4b8c", "payment-service-9a2f1e"],
                "created_by_source": "agent",
                "status": "in_progress",
                "assigned_to": op1.id,
            },
            {
                "title": "SSH timeout on db-replica-03",
                "description": "## Root Cause Analysis\n\nSSH connections to `db-replica-03` timing out after 10s.\n\n**Evidence:**\n- `ssh -vvv` shows connection reset at key exchange\n- `sshd` process consuming 100% CPU\n- `/var/log/auth.log` shows brute-force attempts from 198.51.100.0/24",
                "area": "linux",
                "confidence": 0.7,
                "risk": 0.5,
                "recommended_action": "Block 198.51.100.0/24 in firewall, restart sshd, verify authorized_keys integrity",
                "affected_systems": ["db-replica-03"],
                "created_by_source": "agent",
                "status": "open",
            },
            {
                "title": "DNS resolution failures in staging",
                "description": "## Root Cause Analysis\n\nIntermittent DNS failures in staging namespace.\n\n**Evidence:**\n- CoreDNS pods healthy but cache hit ratio at 12%\n- `ndots:5` in resolv.conf causing excessive lookups\n- Upstream DNS server 10.0.0.2 responding slowly (>500ms)",
                "area": "networking",
                "confidence": 0.4,
                "risk": 0.3,
                "recommended_action": "Reduce ndots to 2, add FQDN dots to service names, investigate upstream DNS latency",
                "affected_systems": ["coredns-staging", "api-gateway-staging"],
                "created_by_source": "agent",
                "status": "resolved",
                "assigned_to": op2.id,
            },
            {
                "title": "PostgreSQL replication lag exceeding 30s",
                "description": "## Root Cause Analysis\n\nReplication lag on `db-replica-02` spiking to 30-45s.\n\n**Evidence:**\n- `pg_stat_replication` shows write_lag at 32s\n- WAL sender process blocked on disk I/O\n- iostat shows 98% disk utilization on replica",
                "area": "database",
                "confidence": 0.88,
                "risk": 0.7,
                "recommended_action": "Migrate replica to SSD-backed storage, increase wal_buffers to 64MB",
                "affected_systems": ["db-replica-02", "db-primary-01"],
                "created_by_source": "agent",
                "status": "open",
            },
            {
                "title": "Unauthorized S3 bucket access attempts",
                "description": "## Root Cause Analysis\n\nCloudTrail logs show repeated `AccessDenied` on `s3://prod-backups`.\n\n**Evidence:**\n- 847 AccessDenied events in last 6 hours\n- Source IP: 203.0.113.42 (not in our IP ranges)\n- Requests targeting `db-dumps/` prefix specifically",
                "area": "security",
                "confidence": 0.82,
                "risk": 0.95,
                "recommended_action": "Block source IP in WAF, rotate S3 bucket policy, audit IAM roles for leaked credentials",
                "affected_systems": ["s3://prod-backups", "iam-role-backup-agent"],
                "created_by_source": "agent",
                "status": "acknowledged",
                "assigned_to": op1.id,
            },
        ]

        for td in tickets_data:
            assigned = td.pop("assigned_to", None)
            ticket = Ticket(**td)
            if assigned:
                ticket.assigned_to = assigned
            db.add(ticket)
            db.flush()
            db.add(AuditLog(
                ticket_id=ticket.id,
                action="created",
                actor_source="agent",
                actor_name="aiops-agent",
                new_value={"title": ticket.title, "area": ticket.area},
            ))

        db.commit()
        print(f"Seeded {len(tickets_data)} tickets and 4 users.")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
```

- [ ] **Step 2: Verify seed script imports work**

```bash
uv run python -c "from api.seed import seed; print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add api/seed.py
git commit -m "feat: add seed script with demo users and sample tickets"
```

---

## Task 14: React Frontend Scaffolding

**Files:**
- Create: `frontend/` (via Vite scaffolding)
- Modify: `frontend/vite.config.ts`
- Create: `frontend/src/types.ts`
- Create: `frontend/src/api/client.ts`

- [ ] **Step 1: Scaffold React app with Vite**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/tok-jira/tok-jira
npm create vite@latest frontend -- --template react-ts
cd frontend && npm install
```

- [ ] **Step 2: Install frontend dependencies**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/tok-jira/tok-jira/frontend
npm install react-router-dom recharts
npm install -D @types/react-router-dom
```

- [ ] **Step 3: Configure Vite proxy**

`frontend/vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 4: Create TypeScript types**

`frontend/src/types.ts`:

```typescript
export type Area =
  | "linux"
  | "kubernetes"
  | "networking"
  | "database"
  | "storage"
  | "security"
  | "application";

export type Status =
  | "open"
  | "acknowledged"
  | "in_progress"
  | "resolved"
  | "closed";

export type Source = "agent" | "human";

export type Role = "admin" | "operator" | "viewer";

export interface Ticket {
  id: string;
  title: string;
  description: string;
  area: Area;
  status: Status;
  confidence: number;
  risk: number;
  recommended_action: string;
  affected_systems: string[];
  assigned_to: string | null;
  created_by_source: Source;
  created_at: string;
  updated_at: string;
}

export interface TicketListResponse {
  items: Ticket[];
  total: number;
  page: number;
  per_page: number;
}

export interface Comment {
  id: string;
  ticket_id: string;
  body: string;
  author_source: Source;
  author_name: string;
  created_at: string;
}

export interface AuditEntry {
  id: string;
  ticket_id: string;
  action: string;
  actor_source: Source;
  actor_name: string;
  actor_tier: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  timestamp: string;
}

export interface Artifact {
  id: string;
  ticket_id: string;
  filename: string;
  content_type: string;
  uploaded_by_source: Source;
  uploaded_at: string;
}

export interface User {
  id: string;
  username: string;
  display_name: string;
  role: Role;
  expertise_area: Area | null;
  tier: string | null;
}

export interface DashboardStats {
  open: number;
  acknowledged: number;
  in_progress: number;
  resolved: number;
  closed: number;
  avg_confidence: number | null;
  by_area: Record<string, number>;
  risk_distribution: { high: number; medium: number; low: number };
}
```

- [ ] **Step 5: Create API client**

`frontend/src/api/client.ts`:

```typescript
const BASE = "/api/v1";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const resp = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!resp.ok) {
    if (resp.status === 401) {
      window.location.href = "/login";
    }
    throw new Error(`${resp.status}: ${await resp.text()}`);
  }
  return resp.json();
}

export const api = {
  login: (username: string, password: string) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  logout: () => request("/auth/logout", { method: "POST" }),
  me: () => request<import("../types").User>("/auth/me"),
  getDashboard: () =>
    request<import("../types").DashboardStats>("/dashboard/stats"),
  getTickets: (params?: string) =>
    request<import("../types").TicketListResponse>(
      `/tickets${params ? `?${params}` : ""}`
    ),
  getTicket: (id: string) =>
    request<import("../types").Ticket>(`/tickets/${id}`),
  updateTicket: (id: string, data: Record<string, unknown>) =>
    request<import("../types").Ticket>(`/tickets/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  getComments: (ticketId: string) =>
    request<import("../types").Comment[]>(`/tickets/${ticketId}/comments`),
  addComment: (ticketId: string, body: string) =>
    request<import("../types").Comment>(`/tickets/${ticketId}/comments`, {
      method: "POST",
      body: JSON.stringify({ body, source: "human" }),
    }),
  getAudit: (ticketId: string) =>
    request<import("../types").AuditEntry[]>(`/tickets/${ticketId}/audit`),
  getArtifacts: (ticketId: string) =>
    request<import("../types").Artifact[]>(`/tickets/${ticketId}/artifacts`),
  getEnums: () => request<Record<string, string[]>>("/enums"),
};
```

- [ ] **Step 6: Commit**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/tok-jira/tok-jira
git add frontend/
git commit -m "feat: scaffold React frontend with Vite, types, and API client"
```

---

## Task 15: React Components — Lozenge and Layout

**Files:**
- Create: `frontend/src/components/Lozenge.tsx`
- Create: `frontend/src/components/Layout.tsx`

- [ ] **Step 1: Create Lozenge component**

`frontend/src/components/Lozenge.tsx`:

```tsx
import type { Area } from "../types";

const AREA_COLORS: Record<Area, string> = {
  linux: "#7c3aed",
  kubernetes: "#2563eb",
  networking: "#0891b2",
  database: "#059669",
  storage: "#d97706",
  security: "#dc2626",
  application: "#6366f1",
};

function riskColor(value: number): string {
  if (value >= 0.7) return "#ef4444";
  if (value >= 0.4) return "#f59e0b";
  return "#22c55e";
}

function confidenceColor(value: number): string {
  if (value >= 0.7) return "#22c55e";
  if (value >= 0.4) return "#f59e0b";
  return "#ef4444";
}

function label(value: number): string {
  if (value >= 0.7) return "high";
  if (value >= 0.4) return "med";
  return "low";
}

const style = (bg: string) =>
  ({
    background: bg,
    color: "white",
    padding: "2px 8px",
    borderRadius: "10px",
    fontSize: "11px",
    fontWeight: 500,
    display: "inline-block",
    whiteSpace: "nowrap" as const,
  }) as const;

export function AreaLozenge({ area }: { area: Area }) {
  return <span style={style(AREA_COLORS[area])}>{area}</span>;
}

export function RiskLozenge({ value }: { value: number }) {
  return (
    <span style={style(riskColor(value))}>
      {label(value)} {value.toFixed(1)}
    </span>
  );
}

export function ConfidenceLozenge({ value }: { value: number }) {
  return (
    <span style={style(confidenceColor(value))}>
      {label(value)} {value.toFixed(1)}
    </span>
  );
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  open: { bg: "#ef444422", text: "#ef4444" },
  acknowledged: { bg: "#f59e0b22", text: "#f59e0b" },
  in_progress: { bg: "#3b82f622", text: "#3b82f6" },
  resolved: { bg: "#22c55e22", text: "#22c55e" },
  closed: { bg: "#6b728022", text: "#6b7280" },
};

export function StatusLozenge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.open;
  return (
    <span
      style={{
        background: colors.bg,
        color: colors.text,
        padding: "2px 8px",
        borderRadius: "10px",
        fontSize: "11px",
        fontWeight: 500,
      }}
    >
      {status.replace("_", " ")}
    </span>
  );
}
```

- [ ] **Step 2: Create Layout component**

`frontend/src/components/Layout.tsx`:

```tsx
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { User } from "../types";

export function Layout() {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.me().then(setUser).catch(() => navigate("/login"));
  }, [navigate]);

  const handleLogout = async () => {
    await api.logout();
    navigate("/login");
  };

  if (!user) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f1a", color: "#e0e0e0" }}>
      <nav
        style={{
          background: "#1a1a2e",
          padding: "10px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #333",
        }}
      >
        <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
          <Link to="/" style={{ fontWeight: "bold", fontSize: "16px", color: "#4a9eff", textDecoration: "none" }}>
            tok-jira
          </Link>
          <Link to="/" style={{ color: "#ccc", fontSize: "13px", textDecoration: "none" }}>
            Dashboard
          </Link>
          <Link to="/tickets" style={{ color: "#ccc", fontSize: "13px", textDecoration: "none" }}>
            Tickets
          </Link>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ color: "#888", fontSize: "12px" }}>
            {user.display_name} ({user.tier || user.role})
          </span>
          <button
            onClick={handleLogout}
            style={{
              background: "none",
              border: "1px solid #555",
              color: "#999",
              padding: "4px 10px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            Logout
          </button>
        </div>
      </nav>
      <main style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/
git commit -m "feat: add Lozenge and Layout components for frontend"
```

---

## Task 16: React Pages — Login and Dashboard

**Files:**
- Create: `frontend/src/pages/Login.tsx`
- Create: `frontend/src/pages/Dashboard.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1: Create Login page**

`frontend/src/pages/Login.tsx`:

```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

export function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.login(username, password);
      navigate("/");
    } catch {
      setError("Invalid credentials");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f0f1a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: "#1a1a2e",
          padding: "32px",
          borderRadius: "8px",
          width: "320px",
        }}
      >
        <h2 style={{ color: "#4a9eff", marginBottom: "24px", textAlign: "center" }}>tok-jira</h2>
        {error && (
          <div style={{ color: "#ef4444", fontSize: "13px", marginBottom: "12px", textAlign: "center" }}>
            {error}
          </div>
        )}
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "12px",
            background: "#0f0f1a",
            border: "1px solid #333",
            borderRadius: "4px",
            color: "#e0e0e0",
            fontSize: "14px",
            boxSizing: "border-box",
          }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "16px",
            background: "#0f0f1a",
            border: "1px solid #333",
            borderRadius: "4px",
            color: "#e0e0e0",
            fontSize: "14px",
            boxSizing: "border-box",
          }}
        />
        <button
          type="submit"
          style={{
            width: "100%",
            padding: "10px",
            background: "#4a9eff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          Sign In
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Create Dashboard page**

`frontend/src/pages/Dashboard.tsx`:

```tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "../api/client";
import { AreaLozenge, ConfidenceLozenge, RiskLozenge, StatusLozenge } from "../components/Lozenge";
import type { DashboardStats, Ticket, Area } from "../types";

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    api.getDashboard().then(setStats);
    api.getTickets("per_page=10").then((r) => setTickets(r.items));
  }, []);

  if (!stats) return <div style={{ color: "#888" }}>Loading...</div>;

  const areaData = Object.entries(stats.by_area).map(([name, count]) => ({ name, count }));
  const riskData = [
    { name: "High", count: stats.risk_distribution.high, fill: "#ef4444" },
    { name: "Med", count: stats.risk_distribution.medium, fill: "#f59e0b" },
    { name: "Low", count: stats.risk_distribution.low, fill: "#22c55e" },
  ];

  const cards = [
    { label: "Open", value: stats.open, color: "#ef4444" },
    { label: "In Progress", value: stats.in_progress, color: "#f59e0b" },
    { label: "Resolved", value: stats.resolved, color: "#22c55e" },
    { label: "Avg Confidence", value: stats.avg_confidence?.toFixed(2) ?? "—", color: "#4a9eff" },
  ];

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
        {cards.map((c) => (
          <div
            key={c.label}
            style={{
              flex: 1,
              minWidth: "120px",
              background: "#1a1a2e",
              borderRadius: "6px",
              padding: "14px",
              borderLeft: `3px solid ${c.color}`,
            }}
          >
            <div style={{ fontSize: "11px", color: "#999", textTransform: "uppercase" }}>{c.label}</div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: "300px", background: "#1a1a2e", borderRadius: "6px", padding: "14px" }}>
          <div style={{ fontSize: "12px", color: "#999", marginBottom: "12px" }}>Tickets by Area</div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={areaData}>
              <XAxis dataKey="name" tick={{ fill: "#888", fontSize: 10 }} />
              <YAxis tick={{ fill: "#888", fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#4a9eff" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ flex: 1, minWidth: "300px", background: "#1a1a2e", borderRadius: "6px", padding: "14px" }}>
          <div style={{ fontSize: "12px", color: "#999", marginBottom: "12px" }}>Risk Distribution</div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={riskData} layout="vertical">
              <XAxis type="number" tick={{ fill: "#888", fontSize: 10 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: "#888", fontSize: 10 }} width={40} />
              <Tooltip />
              <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                {riskData.map((entry) => (
                  <rect key={entry.name} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent tickets */}
      <div style={{ background: "#1a1a2e", borderRadius: "6px", overflow: "hidden" }}>
        <div style={{ fontSize: "12px", color: "#999", padding: "12px", borderBottom: "1px solid #333" }}>
          Recent Tickets
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr style={{ color: "#666", textTransform: "uppercase", fontSize: "11px" }}>
              <th style={{ textAlign: "left", padding: "8px 12px" }}>Title</th>
              <th style={{ textAlign: "left", padding: "8px 12px" }}>Area</th>
              <th style={{ textAlign: "left", padding: "8px 12px" }}>Risk</th>
              <th style={{ textAlign: "left", padding: "8px 12px" }}>Confidence</th>
              <th style={{ textAlign: "left", padding: "8px 12px" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id} style={{ borderTop: "1px solid #222" }}>
                <td style={{ padding: "10px 12px" }}>
                  <Link to={`/tickets/${t.id}`} style={{ color: "#ddd", textDecoration: "none" }}>
                    {t.title}
                  </Link>
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <AreaLozenge area={t.area} />
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <RiskLozenge value={t.risk} />
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <ConfidenceLozenge value={t.confidence} />
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <StatusLozenge status={t.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire up App with routing**

`frontend/src/App.tsx`:

```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { TicketList } from "./pages/TicketList";
import { TicketDetail } from "./pages/TicketDetail";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tickets" element={<TicketList />} />
          <Route path="/tickets/:id" element={<TicketDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

`frontend/src/main.tsx`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/
git commit -m "feat: add Login and Dashboard pages with routing"
```

---

## Task 17: React Pages — Ticket List and Ticket Detail

**Files:**
- Create: `frontend/src/pages/TicketList.tsx`
- Create: `frontend/src/pages/TicketDetail.tsx`
- Create: `frontend/src/components/AuditTimeline.tsx`

- [ ] **Step 1: Create TicketList page**

`frontend/src/pages/TicketList.tsx`:

```tsx
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { AreaLozenge, ConfidenceLozenge, RiskLozenge, StatusLozenge } from "../components/Lozenge";
import type { Ticket, Area, Status } from "../types";

export function TicketList() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();

  const area = searchParams.get("area") as Area | null;
  const status = searchParams.get("status") as Status | null;

  useEffect(() => {
    const params = new URLSearchParams();
    if (area) params.set("area", area);
    if (status) params.set("status", status);
    params.set("per_page", "50");
    api.getTickets(params.toString()).then((r) => {
      setTickets(r.items);
      setTotal(r.total);
    });
  }, [area, status]);

  const setFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    setSearchParams(params);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2 style={{ margin: 0, fontSize: "18px" }}>Tickets ({total})</h2>
        <div style={{ display: "flex", gap: "8px" }}>
          <select
            value={area || ""}
            onChange={(e) => setFilter("area", e.target.value || null)}
            style={{ background: "#1a1a2e", color: "#ccc", border: "1px solid #333", borderRadius: "4px", padding: "6px" }}
          >
            <option value="">All Areas</option>
            <option value="linux">Linux</option>
            <option value="kubernetes">Kubernetes</option>
            <option value="networking">Networking</option>
            <option value="database">Database</option>
            <option value="storage">Storage</option>
            <option value="security">Security</option>
            <option value="application">Application</option>
          </select>
          <select
            value={status || ""}
            onChange={(e) => setFilter("status", e.target.value || null)}
            style={{ background: "#1a1a2e", color: "#ccc", border: "1px solid #333", borderRadius: "4px", padding: "6px" }}
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      <div style={{ background: "#1a1a2e", borderRadius: "6px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr style={{ color: "#666", textTransform: "uppercase", fontSize: "11px" }}>
              <th style={{ textAlign: "left", padding: "8px 12px" }}>Title</th>
              <th style={{ textAlign: "left", padding: "8px 12px" }}>Area</th>
              <th style={{ textAlign: "left", padding: "8px 12px" }}>Risk</th>
              <th style={{ textAlign: "left", padding: "8px 12px" }}>Confidence</th>
              <th style={{ textAlign: "left", padding: "8px 12px" }}>Status</th>
              <th style={{ textAlign: "left", padding: "8px 12px" }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id} style={{ borderTop: "1px solid #222" }}>
                <td style={{ padding: "10px 12px" }}>
                  <Link to={`/tickets/${t.id}`} style={{ color: "#ddd", textDecoration: "none" }}>
                    {t.title}
                  </Link>
                </td>
                <td style={{ padding: "10px 12px" }}><AreaLozenge area={t.area} /></td>
                <td style={{ padding: "10px 12px" }}><RiskLozenge value={t.risk} /></td>
                <td style={{ padding: "10px 12px" }}><ConfidenceLozenge value={t.confidence} /></td>
                <td style={{ padding: "10px 12px" }}><StatusLozenge status={t.status} /></td>
                <td style={{ padding: "10px 12px", color: "#888" }}>
                  {new Date(t.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create AuditTimeline component**

`frontend/src/components/AuditTimeline.tsx`:

```tsx
import type { AuditEntry } from "../types";

export function AuditTimeline({ entries }: { entries: AuditEntry[] }) {
  return (
    <div>
      {entries.map((entry) => (
        <div
          key={entry.id}
          style={{
            display: "flex",
            gap: "12px",
            padding: "10px 0",
            borderBottom: "1px solid #222",
            fontSize: "12px",
          }}
        >
          <div style={{ color: "#888", minWidth: "140px", whiteSpace: "nowrap" }}>
            {new Date(entry.timestamp).toLocaleString()}
          </div>
          <div>
            <span
              style={{
                background: entry.actor_source === "agent" ? "#2563eb22" : "#7c3aed22",
                color: entry.actor_source === "agent" ? "#2563eb" : "#7c3aed",
                padding: "1px 6px",
                borderRadius: "4px",
                fontSize: "10px",
                marginRight: "6px",
              }}
            >
              {entry.actor_source}
            </span>
            <span style={{ color: "#ccc" }}>{entry.actor_name}</span>
            {entry.actor_tier && (
              <span style={{ color: "#666", marginLeft: "4px" }}>({entry.actor_tier})</span>
            )}
            <span style={{ color: "#999", marginLeft: "8px" }}>
              {entry.action.replace(/_/g, " ")}
            </span>
            {entry.old_value && entry.new_value && (
              <span style={{ color: "#666", marginLeft: "8px" }}>
                {JSON.stringify(entry.old_value)} → {JSON.stringify(entry.new_value)}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create TicketDetail page**

`frontend/src/pages/TicketDetail.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { AreaLozenge, ConfidenceLozenge, RiskLozenge, StatusLozenge } from "../components/Lozenge";
import { AuditTimeline } from "../components/AuditTimeline";
import type { Ticket, Comment, AuditEntry, Artifact, Status } from "../types";

const STATUSES: Status[] = ["open", "acknowledged", "in_progress", "resolved", "closed"];

export function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [newComment, setNewComment] = useState("");
  const [activeTab, setActiveTab] = useState<"comments" | "audit" | "artifacts">("comments");

  useEffect(() => {
    if (!id) return;
    api.getTicket(id).then(setTicket);
    api.getComments(id).then(setComments);
    api.getAudit(id).then(setAudit);
    api.getArtifacts(id).then(setArtifacts);
  }, [id]);

  if (!ticket) return <div style={{ color: "#888" }}>Loading...</div>;

  const handleStatusChange = async (status: Status) => {
    const updated = await api.updateTicket(ticket.id, { status });
    setTicket(updated);
    api.getAudit(ticket.id).then(setAudit);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    await api.addComment(ticket.id, newComment);
    setNewComment("");
    api.getComments(ticket.id).then(setComments);
    api.getAudit(ticket.id).then(setAudit);
  };

  const sectionStyle = {
    background: "#1a1a2e",
    borderRadius: "6px",
    padding: "16px",
    marginBottom: "12px",
  };

  return (
    <div>
      <div style={{ ...sectionStyle }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
          <h2 style={{ margin: 0, fontSize: "18px" }}>{ticket.title}</h2>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <AreaLozenge area={ticket.area} />
            <StatusLozenge status={ticket.status} />
          </div>
        </div>

        <div style={{ display: "flex", gap: "24px", marginBottom: "16px", fontSize: "13px" }}>
          <div>
            <span style={{ color: "#888" }}>Risk: </span>
            <RiskLozenge value={ticket.risk} />
          </div>
          <div>
            <span style={{ color: "#888" }}>Confidence: </span>
            <ConfidenceLozenge value={ticket.confidence} />
          </div>
          <div>
            <span style={{ color: "#888" }}>Source: </span>
            <span>{ticket.created_by_source}</span>
          </div>
          <div>
            <span style={{ color: "#888" }}>Created: </span>
            <span>{new Date(ticket.created_at).toLocaleString()}</span>
          </div>
        </div>

        {ticket.affected_systems.length > 0 && (
          <div style={{ marginBottom: "12px", fontSize: "13px" }}>
            <span style={{ color: "#888" }}>Affected: </span>
            {ticket.affected_systems.map((s) => (
              <code key={s} style={{ background: "#0f0f1a", padding: "2px 6px", borderRadius: "3px", marginRight: "4px", fontSize: "11px" }}>
                {s}
              </code>
            ))}
          </div>
        )}
      </div>

      {/* Recommended Action */}
      <div style={{ ...sectionStyle, borderLeft: "3px solid #f59e0b" }}>
        <div style={{ fontSize: "11px", color: "#f59e0b", textTransform: "uppercase", marginBottom: "8px" }}>
          Recommended Action
        </div>
        <div style={{ fontSize: "14px" }}>{ticket.recommended_action}</div>
      </div>

      {/* Description */}
      <div style={{ ...sectionStyle }}>
        <div style={{ fontSize: "11px", color: "#888", textTransform: "uppercase", marginBottom: "8px" }}>
          Analysis
        </div>
        <div style={{ fontSize: "13px", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{ticket.description}</div>
      </div>

      {/* Status update */}
      <div style={{ ...sectionStyle }}>
        <div style={{ fontSize: "11px", color: "#888", textTransform: "uppercase", marginBottom: "8px" }}>
          Update Status
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => handleStatusChange(s)}
              disabled={s === ticket.status}
              style={{
                padding: "6px 12px",
                borderRadius: "4px",
                border: "1px solid #333",
                background: s === ticket.status ? "#333" : "#0f0f1a",
                color: s === ticket.status ? "#fff" : "#999",
                cursor: s === ticket.status ? "default" : "pointer",
                fontSize: "12px",
              }}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0", marginBottom: "0" }}>
        {(["comments", "audit", "artifacts"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "8px 16px",
              background: activeTab === tab ? "#1a1a2e" : "transparent",
              color: activeTab === tab ? "#4a9eff" : "#888",
              border: "none",
              borderBottom: activeTab === tab ? "2px solid #4a9eff" : "2px solid transparent",
              cursor: "pointer",
              fontSize: "13px",
              textTransform: "capitalize",
            }}
          >
            {tab} ({tab === "comments" ? comments.length : tab === "audit" ? audit.length : artifacts.length})
          </button>
        ))}
      </div>

      <div style={{ ...sectionStyle, borderTopLeftRadius: 0 }}>
        {activeTab === "comments" && (
          <div>
            {comments.map((c) => (
              <div key={c.id} style={{ padding: "10px 0", borderBottom: "1px solid #222", fontSize: "13px" }}>
                <div style={{ display: "flex", gap: "8px", marginBottom: "4px" }}>
                  <span style={{ color: "#ccc", fontWeight: 500 }}>{c.author_name}</span>
                  <span
                    style={{
                      background: c.author_source === "agent" ? "#2563eb22" : "#7c3aed22",
                      color: c.author_source === "agent" ? "#2563eb" : "#7c3aed",
                      padding: "1px 6px",
                      borderRadius: "4px",
                      fontSize: "10px",
                    }}
                  >
                    {c.author_source}
                  </span>
                  <span style={{ color: "#666" }}>{new Date(c.created_at).toLocaleString()}</span>
                </div>
                <div style={{ color: "#bbb", whiteSpace: "pre-wrap" }}>{c.body}</div>
              </div>
            ))}
            <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                style={{
                  flex: 1,
                  background: "#0f0f1a",
                  border: "1px solid #333",
                  borderRadius: "4px",
                  color: "#e0e0e0",
                  padding: "8px",
                  fontSize: "13px",
                  minHeight: "60px",
                  resize: "vertical",
                }}
              />
              <button
                onClick={handleAddComment}
                style={{
                  alignSelf: "flex-end",
                  padding: "8px 16px",
                  background: "#4a9eff",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "13px",
                }}
              >
                Comment
              </button>
            </div>
          </div>
        )}

        {activeTab === "audit" && <AuditTimeline entries={audit} />}

        {activeTab === "artifacts" && (
          <div>
            {artifacts.length === 0 && <div style={{ color: "#666", fontSize: "13px" }}>No artifacts</div>}
            {artifacts.map((a) => (
              <div key={a.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #222", fontSize: "12px" }}>
                <div>
                  <span style={{ color: "#ccc" }}>{a.filename}</span>
                  <span style={{ color: "#666", marginLeft: "8px" }}>{a.content_type}</span>
                </div>
                <a
                  href={`/api/v1/artifacts/${a.id}/download`}
                  style={{ color: "#4a9eff", textDecoration: "none" }}
                >
                  Download
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify frontend builds**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/tok-jira/tok-jira/frontend
npm run build
```

Expected: Build succeeds with no TypeScript errors

- [ ] **Step 5: Commit**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/tok-jira/tok-jira
git add frontend/src/
git commit -m "feat: add TicketList, TicketDetail pages and AuditTimeline component"
```

---

## Task 18: Docker and Compose Setup

**Files:**
- Create: `deploy/Dockerfile.api`
- Create: `deploy/Dockerfile.frontend`
- Create: `compose.yaml`

- [ ] **Step 1: Create API Dockerfile**

`deploy/Dockerfile.api`:

```dockerfile
FROM python:3.13-slim AS base

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY api/ ./api/
COPY alembic.ini ./

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 2: Create frontend Dockerfile**

`deploy/Dockerfile.frontend`:

```dockerfile
FROM node:20-alpine AS build

WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
```

- [ ] **Step 3: Create nginx config for frontend**

`deploy/nginx.conf`:

```nginx
server {
    listen 3000;
    root /usr/share/nginx/html;
    index index.html;

    location /api/ {
        proxy_pass http://api:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

- [ ] **Step 4: Create compose.yaml**

`compose.yaml`:

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: tokjira
      POSTGRES_PASSWORD: tokjira
      POSTGRES_DB: tokjira
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  api:
    build:
      context: .
      dockerfile: deploy/Dockerfile.api
    ports:
      - "8000:8000"
    environment:
      TOK_JIRA_DATABASE_URL: postgresql://tokjira:tokjira@postgres:5432/tokjira
      TOK_JIRA_API_KEY: dev-api-key
      TOK_JIRA_SECRET_KEY: dev-secret-key-change-in-production
      TOK_JIRA_ARTIFACT_STORAGE_PATH: /app/artifacts
    volumes:
      - artifacts:/app/artifacts
    depends_on:
      - postgres

  frontend:
    build:
      context: .
      dockerfile: deploy/Dockerfile.frontend
    ports:
      - "3000:3000"
    depends_on:
      - api

volumes:
  pgdata:
  artifacts:
```

- [ ] **Step 5: Test compose builds**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/tok-jira/tok-jira
podman compose build
```

Expected: All images build successfully

- [ ] **Step 6: Commit**

```bash
git add deploy/ compose.yaml
git commit -m "feat: add Dockerfiles, nginx config, and compose.yaml for containerized deployment"
```

---

## Task 19: Kubernetes Manifests

**Files:**
- Create: `deploy/k8s/namespace.yaml`
- Create: `deploy/k8s/configmap.yaml`
- Create: `deploy/k8s/secret.yaml`
- Create: `deploy/k8s/postgres.yaml`
- Create: `deploy/k8s/api.yaml`
- Create: `deploy/k8s/frontend.yaml`

- [ ] **Step 1: Create namespace**

`deploy/k8s/namespace.yaml`:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: tok-jira
```

- [ ] **Step 2: Create configmap**

`deploy/k8s/configmap.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: tok-jira-config
  namespace: tok-jira
data:
  TOK_JIRA_DATABASE_URL: "postgresql://tokjira:tokjira@postgres:5432/tokjira"
  TOK_JIRA_ARTIFACT_STORAGE_PATH: "/app/artifacts"
```

- [ ] **Step 3: Create secret**

`deploy/k8s/secret.yaml`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: tok-jira-secrets
  namespace: tok-jira
type: Opaque
stringData:
  TOK_JIRA_API_KEY: "dev-api-key"
  TOK_JIRA_SECRET_KEY: "dev-secret-key-change-in-production"
  POSTGRES_PASSWORD: "tokjira"
```

- [ ] **Step 4: Create postgres manifest**

`deploy/k8s/postgres.yaml`:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
  namespace: tok-jira
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: tok-jira
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:16
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_USER
              value: tokjira
            - name: POSTGRES_DB
              value: tokjira
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: tok-jira-secrets
                  key: POSTGRES_PASSWORD
          volumeMounts:
            - name: pgdata
              mountPath: /var/lib/postgresql/data
      volumes:
        - name: pgdata
          persistentVolumeClaim:
            claimName: postgres-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: tok-jira
spec:
  selector:
    app: postgres
  ports:
    - port: 5432
      targetPort: 5432
```

- [ ] **Step 5: Create API manifest**

`deploy/k8s/api.yaml`:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: artifacts-pvc
  namespace: tok-jira
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: tok-jira
spec:
  replicas: 1
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: tok-jira-api:latest
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 8000
          envFrom:
            - configMapRef:
                name: tok-jira-config
            - secretRef:
                name: tok-jira-secrets
          volumeMounts:
            - name: artifacts
              mountPath: /app/artifacts
      volumes:
        - name: artifacts
          persistentVolumeClaim:
            claimName: artifacts-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: api
  namespace: tok-jira
spec:
  selector:
    app: api
  ports:
    - port: 8000
      targetPort: 8000
```

- [ ] **Step 6: Create frontend manifest**

`deploy/k8s/frontend.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: tok-jira
spec:
  replicas: 1
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
        - name: frontend
          image: tok-jira-frontend:latest
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 3000
---
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: tok-jira
spec:
  type: NodePort
  selector:
    app: frontend
  ports:
    - port: 3000
      targetPort: 3000
      nodePort: 30300
```

- [ ] **Step 7: Commit**

```bash
git add deploy/k8s/
git commit -m "feat: add Kubernetes manifests for postgres, api, and frontend"
```

---

## Task 20: Final Integration — Run Full Stack Locally

- [ ] **Step 1: Start Postgres (if not running)**

```bash
podman start tokjira-postgres 2>/dev/null || podman run -d --name tokjira-postgres \
  -e POSTGRES_USER=tokjira \
  -e POSTGRES_PASSWORD=tokjira \
  -e POSTGRES_DB=tokjira \
  -p 5432:5432 \
  postgres:16
```

- [ ] **Step 2: Run migrations**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/tok-jira/tok-jira
uv run alembic upgrade head
```

- [ ] **Step 3: Seed database**

```bash
uv run python -m api.seed
```

Expected: `Seeded 5 tickets and 4 users.`

- [ ] **Step 4: Start API server**

```bash
uv run uvicorn api.main:app --reload --port 8000
```

Verify: Open `http://localhost:8000/api/v1/docs` — Swagger UI loads

- [ ] **Step 5: Test API with curl**

```bash
# Create a ticket via API key
curl -s -X POST http://localhost:8000/api/v1/tickets \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-api-key" \
  -d '{"title":"Test ticket","description":"Testing","area":"linux","confidence":0.8,"risk":0.5,"recommended_action":"Check logs","source":"agent"}' | python -m json.tool
```

Expected: JSON response with ticket data, status `open`

- [ ] **Step 6: Start frontend**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/tok-jira/tok-jira/frontend
npm run dev
```

Verify: Open `http://localhost:5173` — login page loads. Login with `admin` / `admin123`.

- [ ] **Step 7: Run full test suite**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/tok-jira/tok-jira
uv run pytest tests/ -v
```

Expected: All tests PASSED

- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "feat: tok-jira v0.1.0 — complete ticket troubleshooting app"
```
