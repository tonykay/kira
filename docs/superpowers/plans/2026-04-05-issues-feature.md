# Issues Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Issues feature so AI agent tickets surface actionable code quality findings that humans can promote to a backlog for developer follow-up.

**Architecture:** Issues are a child table of tickets, created inline during ticket submission via an optional `issues` array. Each issue has its own severity/status/priority lifecycle. A standalone Issues page provides a backlog view for developers. Markdown content is rendered with react-markdown.

**Tech Stack:** Python/FastAPI/SQLAlchemy (backend), React 19/TypeScript/Vite (frontend), react-markdown + remark-gfm + react-syntax-highlighter (markdown rendering), Alembic (migration)

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `api/models/issues.py` | Pydantic schemas: `IssueCreate`, `IssueUpdate`, `IssueResponse`, `IssueListResponse` |
| `api/routes/issues.py` | Issue endpoints: list, get, patch, create-on-ticket |
| `api/db/alembic/versions/xxx_add_issues_table.py` | Alembic migration (auto-generated) |
| `tests/test_issues.py` | Backend tests for all issue endpoints |
| `frontend/src/components/MarkdownRenderer.tsx` | Shared markdown renderer with syntax highlighting |
| `frontend/src/components/IssueCard.tsx` | Collapsible issue card for ticket detail page |
| `frontend/src/pages/IssueList.tsx` | Top-level Issues backlog page |
| `frontend/src/pages/IssueDetail.tsx` | Individual issue detail page |

### Modified Files
| File | What Changes |
|------|-------------|
| `api/models/enums.py` | Add `SeverityEnum`, `IssueStatusEnum` |
| `api/db/models.py` | Add `Issue` ORM model, add `issues` relationship to `Ticket` |
| `api/models/tickets.py` | Add `issues` field to `TicketCreate` and `TicketResponse` |
| `api/routes/tickets.py` | Create child issues during ticket creation |
| `api/main.py` | Mount issues router, add openapi tag |
| `api/seed.py` | Add sample issues to demo tickets |
| `frontend/src/types.ts` | Add `Issue`, `Severity`, `IssueStatus`, `IssueListResponse` types |
| `frontend/src/api/client.ts` | Add issue API methods |
| `frontend/src/App.tsx` | Add `/issues` and `/issues/:id` routes |
| `frontend/src/components/Layout.tsx` | Add "Issues" nav link |
| `frontend/src/pages/TicketDetail.tsx` | Add Issues section with IssueCard components |

---

### Task 1: Add Enums

**Files:**
- Modify: `api/models/enums.py`

- [ ] **Step 1: Write the failing test**

Create `tests/test_issues.py`:

```python
from api.models.enums import SeverityEnum, IssueStatusEnum


def test_severity_enum_values():
    assert list(SeverityEnum) == [
        SeverityEnum.CRITICAL,
        SeverityEnum.HIGH,
        SeverityEnum.MEDIUM,
        SeverityEnum.LOW,
        SeverityEnum.INFO,
    ]
    assert SeverityEnum.CRITICAL.value == "critical"
    assert SeverityEnum.INFO.value == "info"


def test_issue_status_enum_values():
    assert list(IssueStatusEnum) == [
        IssueStatusEnum.IDENTIFIED,
        IssueStatusEnum.BACKLOG,
        IssueStatusEnum.IN_PROGRESS,
        IssueStatusEnum.DONE,
        IssueStatusEnum.DISMISSED,
    ]
    assert IssueStatusEnum.IDENTIFIED.value == "identified"
    assert IssueStatusEnum.DISMISSED.value == "dismissed"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_issues.py -v`
Expected: FAIL — `ImportError: cannot import name 'SeverityEnum'`

- [ ] **Step 3: Add enums to `api/models/enums.py`**

Add at the end of the file:

```python
class SeverityEnum(StrEnum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class IssueStatusEnum(StrEnum):
    IDENTIFIED = "identified"
    BACKLOG = "backlog"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    DISMISSED = "dismissed"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_issues.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api/models/enums.py tests/test_issues.py
git commit -m "feat: add SeverityEnum and IssueStatusEnum"
```

---

### Task 2: Add Issue ORM Model

**Files:**
- Modify: `api/db/models.py`

- [ ] **Step 1: Write the failing test**

Append to `tests/test_issues.py`:

```python
def test_issue_model_exists(db_session):
    from api.db.models import Issue, Ticket

    ticket = Ticket(
        title="Test ticket",
        description="desc",
        area="linux",
        confidence=0.5,
        risk=0.5,
        recommended_action="fix it",
        created_by_source="agent",
    )
    db_session.add(ticket)
    db_session.flush()

    issue = Issue(
        ticket_id=ticket.id,
        title="No retry logic",
        severity="critical",
        description="The task fails immediately",
        fix="Add retries: 3",
        status="identified",
    )
    db_session.add(issue)
    db_session.commit()
    db_session.refresh(issue)

    assert issue.id is not None
    assert issue.ticket_id == ticket.id
    assert issue.severity == "critical"
    assert issue.status == "identified"
    assert issue.priority is None
    assert issue.created_at is not None
    assert issue.updated_at is not None


def test_ticket_issues_relationship(db_session):
    from api.db.models import Issue, Ticket

    ticket = Ticket(
        title="Test ticket",
        description="desc",
        area="linux",
        confidence=0.5,
        risk=0.5,
        recommended_action="fix it",
        created_by_source="agent",
    )
    db_session.add(ticket)
    db_session.flush()

    issue1 = Issue(
        ticket_id=ticket.id,
        title="Issue one",
        severity="high",
        description="desc1",
        fix="fix1",
    )
    issue2 = Issue(
        ticket_id=ticket.id,
        title="Issue two",
        severity="low",
        description="desc2",
        fix="fix2",
    )
    db_session.add_all([issue1, issue2])
    db_session.commit()
    db_session.refresh(ticket)

    assert len(ticket.issues) == 2
    titles = {i.title for i in ticket.issues}
    assert titles == {"Issue one", "Issue two"}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_issues.py::test_issue_model_exists tests/test_issues.py::test_ticket_issues_relationship -v`
Expected: FAIL — `ImportError: cannot import name 'Issue'`

- [ ] **Step 3: Add Issue model to `api/db/models.py`**

Add the `Issue` class after the `Ticket` class. Also add `issues` relationship to `Ticket`.

Add this import at the top if not already present — it already imports from `sqlalchemy` what's needed.

Add to the `Ticket` class, after the existing relationships:

```python
    issues: Mapped[list["Issue"]] = relationship("Issue", back_populates="ticket")
```

Add the new `Issue` class after the `Ticket` class:

```python
class Issue(Base):
    __tablename__ = "issues"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tickets.id"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    fix: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="identified")
    priority: Mapped[int | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, onupdate=utcnow)

    ticket: Mapped[Ticket] = relationship("Ticket", back_populates="issues")
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_issues.py::test_issue_model_exists tests/test_issues.py::test_ticket_issues_relationship -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api/db/models.py tests/test_issues.py
git commit -m "feat: add Issue ORM model with Ticket relationship"
```

---

### Task 3: Add Pydantic Schemas for Issues

**Files:**
- Create: `api/models/issues.py`
- Modify: `api/models/tickets.py`

- [ ] **Step 1: Write the failing test**

Append to `tests/test_issues.py`:

```python
def test_issue_create_schema():
    from api.models.issues import IssueCreate

    issue = IssueCreate(
        title="No retry logic",
        severity="critical",
        description="Task fails immediately",
        fix="Add retries: 3",
    )
    assert issue.title == "No retry logic"
    assert issue.severity.value == "critical"


def test_issue_create_schema_validation():
    from api.models.issues import IssueCreate
    import pytest as _pytest

    with _pytest.raises(Exception):
        IssueCreate(
            title="x" * 256,  # exceeds max_length=255
            severity="critical",
            description="desc",
            fix="fix",
        )


def test_issue_update_schema():
    from api.models.issues import IssueUpdate

    update = IssueUpdate(status="backlog", priority=3)
    assert update.status.value == "backlog"
    assert update.priority == 3

    partial = IssueUpdate(priority=5)
    assert partial.status is None
    assert partial.priority == 5


def test_issue_update_priority_validation():
    from api.models.issues import IssueUpdate
    import pytest as _pytest

    with _pytest.raises(Exception):
        IssueUpdate(priority=0)  # below ge=1

    with _pytest.raises(Exception):
        IssueUpdate(priority=6)  # above le=5
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_issues.py::test_issue_create_schema tests/test_issues.py::test_issue_update_schema -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'api.models.issues'`

- [ ] **Step 3: Create `api/models/issues.py`**

```python
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from api.models.enums import IssueStatusEnum, SeverityEnum


class IssueCreate(BaseModel):
    title: str = Field(max_length=255)
    severity: SeverityEnum
    description: str
    fix: str


class IssueUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    severity: SeverityEnum | None = None
    description: str | None = None
    fix: str | None = None
    status: IssueStatusEnum | None = None
    priority: int | None = Field(default=None, ge=1, le=5)


class IssueResponse(BaseModel):
    id: UUID
    ticket_id: UUID
    ticket_title: str
    title: str
    severity: SeverityEnum
    description: str
    fix: str
    status: IssueStatusEnum
    priority: int | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class IssueListResponse(BaseModel):
    items: list[IssueResponse]
    total: int
    page: int
    per_page: int
```

- [ ] **Step 4: Add `issues` field to `TicketCreate` and `TicketResponse` in `api/models/tickets.py`**

Add import at top:

```python
from api.models.issues import IssueCreate, IssueResponse
```

Add to `TicketCreate` class:

```python
    issues: list[IssueCreate] = Field(default_factory=list)
```

Add to `TicketResponse` class:

```python
    issues: list[IssueResponse] = Field(default_factory=list)
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `uv run pytest tests/test_issues.py -v`
Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add api/models/issues.py api/models/tickets.py tests/test_issues.py
git commit -m "feat: add Issue Pydantic schemas and issues field to TicketCreate/Response"
```

---

### Task 4: Create Issues During Ticket Creation

**Files:**
- Modify: `api/routes/tickets.py`

- [ ] **Step 1: Write the failing test**

Append to `tests/test_issues.py`:

```python
TICKET_PAYLOAD = {
    "title": "OOM kills on payment-service pod",
    "description": "Pod payment-service-7d4b8c restarting due to OOM kills",
    "area": "kubernetes",
    "confidence": 0.92,
    "risk": 0.8,
    "recommended_action": "Increase memory limits from 512Mi to 1Gi",
    "affected_systems": ["payment-service-7d4b8c"],
    "source": "agent",
}

ISSUE_PAYLOAD_1 = {
    "title": "No retry logic",
    "severity": "critical",
    "description": "Task fails immediately on transient errors",
    "fix": "Add `retries: 3` and `delay: 30`",
}

ISSUE_PAYLOAD_2 = {
    "title": "GPG check disabled",
    "severity": "high",
    "description": "Package installation skips GPG verification",
    "fix": "Remove `disable_gpg_check: yes`",
}


def test_create_ticket_with_issues(client, api_key_headers):
    payload = {**TICKET_PAYLOAD, "issues": [ISSUE_PAYLOAD_1, ISSUE_PAYLOAD_2]}
    resp = client.post("/api/v1/tickets", json=payload, headers=api_key_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert len(data["issues"]) == 2
    assert data["issues"][0]["title"] == "No retry logic"
    assert data["issues"][0]["severity"] == "critical"
    assert data["issues"][0]["status"] == "identified"
    assert data["issues"][0]["priority"] is None
    assert data["issues"][0]["ticket_id"] == data["id"]
    assert data["issues"][0]["ticket_title"] == data["title"]
    assert data["issues"][1]["title"] == "GPG check disabled"


def test_create_ticket_without_issues(client, api_key_headers):
    resp = client.post("/api/v1/tickets", json=TICKET_PAYLOAD, headers=api_key_headers)
    assert resp.status_code == 201
    assert resp.json()["issues"] == []


def test_get_ticket_includes_issues(client, api_key_headers):
    payload = {**TICKET_PAYLOAD, "issues": [ISSUE_PAYLOAD_1]}
    create_resp = client.post("/api/v1/tickets", json=payload, headers=api_key_headers)
    ticket_id = create_resp.json()["id"]

    resp = client.get(f"/api/v1/tickets/{ticket_id}", headers=api_key_headers)
    assert resp.status_code == 200
    assert len(resp.json()["issues"]) == 1
    assert resp.json()["issues"][0]["title"] == "No retry logic"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_issues.py::test_create_ticket_with_issues -v`
Expected: FAIL — issues not being created or returned

- [ ] **Step 3: Update `api/routes/tickets.py` to create child issues**

Add `Issue` to the import from `api.db.models`:

```python
from api.db.models import Issue, Ticket, User
```

In the `create_ticket` function, after `db.flush()` and before the audit entry, add:

```python
    for issue_data in body.issues:
        issue = Issue(
            ticket_id=ticket.id,
            title=issue_data.title,
            severity=issue_data.severity.value,
            description=issue_data.description,
            fix=issue_data.fix,
        )
        db.add(issue)
```

The `TicketResponse` uses `from_attributes=True` and the `Ticket` model has an `issues` relationship, so the response serialization needs the `IssueResponse.ticket_title` field. This is populated via the relationship. To make this work, we need to add a `ticket_title` property to the `Issue` ORM model in `api/db/models.py`:

```python
    @property
    def ticket_title(self) -> str:
        return self.ticket.title
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `uv run pytest tests/test_issues.py::test_create_ticket_with_issues tests/test_issues.py::test_create_ticket_without_issues tests/test_issues.py::test_get_ticket_includes_issues -v`
Expected: PASS

Also run the full existing test suite to make sure nothing broke:

Run: `uv run pytest tests/ -v`
Expected: All existing tests PASS (the `TicketResponse` now has `issues` field defaulting to `[]`)

- [ ] **Step 5: Commit**

```bash
git add api/routes/tickets.py api/db/models.py tests/test_issues.py
git commit -m "feat: create child issues during ticket creation"
```

---

### Task 5: Add Issues Router (List, Get, Patch, Create-on-Ticket)

**Files:**
- Create: `api/routes/issues.py`
- Modify: `api/main.py`

- [ ] **Step 1: Write the failing tests**

Append to `tests/test_issues.py`:

```python
def _create_ticket_with_issues(client, api_key_headers):
    """Helper: creates a ticket with 2 issues, returns the response JSON."""
    payload = {**TICKET_PAYLOAD, "issues": [ISSUE_PAYLOAD_1, ISSUE_PAYLOAD_2]}
    resp = client.post("/api/v1/tickets", json=payload, headers=api_key_headers)
    return resp.json()


def test_list_issues(auth_client, client, api_key_headers):
    _create_ticket_with_issues(client, api_key_headers)
    resp = auth_client.get("/api/v1/issues")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2


def test_list_issues_filter_by_severity(auth_client, client, api_key_headers):
    _create_ticket_with_issues(client, api_key_headers)
    resp = auth_client.get("/api/v1/issues?severity=critical")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["severity"] == "critical"


def test_list_issues_filter_by_status(auth_client, client, api_key_headers):
    _create_ticket_with_issues(client, api_key_headers)
    # All issues start as "identified"
    resp = auth_client.get("/api/v1/issues?status=backlog")
    assert resp.status_code == 200
    assert resp.json()["total"] == 0

    resp = auth_client.get("/api/v1/issues?status=identified")
    assert resp.status_code == 200
    assert resp.json()["total"] == 2


def test_list_issues_filter_by_ticket_id(auth_client, client, api_key_headers):
    ticket_data = _create_ticket_with_issues(client, api_key_headers)
    ticket_id = ticket_data["id"]
    # Create another ticket with no issues
    client.post("/api/v1/tickets", json=TICKET_PAYLOAD, headers=api_key_headers)

    resp = auth_client.get(f"/api/v1/issues?ticket_id={ticket_id}")
    assert resp.status_code == 200
    assert resp.json()["total"] == 2


def test_get_issue(auth_client, client, api_key_headers):
    ticket_data = _create_ticket_with_issues(client, api_key_headers)
    issue_id = ticket_data["issues"][0]["id"]

    resp = auth_client.get(f"/api/v1/issues/{issue_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == issue_id
    assert data["ticket_title"] == ticket_data["title"]


def test_get_issue_not_found(auth_client):
    resp = auth_client.get("/api/v1/issues/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404


def test_patch_issue_promote_to_backlog(auth_client, client, api_key_headers):
    ticket_data = _create_ticket_with_issues(client, api_key_headers)
    issue_id = ticket_data["issues"][0]["id"]

    resp = auth_client.patch(
        f"/api/v1/issues/{issue_id}",
        json={"status": "backlog", "priority": 3},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "backlog"
    assert data["priority"] == 3


def test_patch_issue_dismiss(auth_client, client, api_key_headers):
    ticket_data = _create_ticket_with_issues(client, api_key_headers)
    issue_id = ticket_data["issues"][1]["id"]

    resp = auth_client.patch(
        f"/api/v1/issues/{issue_id}",
        json={"status": "dismissed"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "dismissed"


def test_patch_issue_edit_fields(auth_client, client, api_key_headers):
    ticket_data = _create_ticket_with_issues(client, api_key_headers)
    issue_id = ticket_data["issues"][0]["id"]

    resp = auth_client.patch(
        f"/api/v1/issues/{issue_id}",
        json={"title": "Updated title", "severity": "medium"},
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "Updated title"
    assert resp.json()["severity"] == "medium"


def test_patch_issue_viewer_forbidden(client, db_session):
    from api.db.models import User
    from api.auth.passwords import hash_password
    import uuid

    viewer = User(
        id=uuid.uuid4(),
        username="vieweruser",
        password_hash=hash_password("viewerpass"),
        display_name="Viewer",
        role="viewer",
    )
    db_session.add(viewer)
    db_session.commit()

    client.post("/api/v1/auth/login", json={"username": "vieweruser", "password": "viewerpass"})
    resp = client.patch(
        "/api/v1/issues/00000000-0000-0000-0000-000000000000",
        json={"status": "backlog"},
    )
    assert resp.status_code == 403


def test_create_issue_on_ticket(auth_client, client, api_key_headers):
    ticket_resp = client.post("/api/v1/tickets", json=TICKET_PAYLOAD, headers=api_key_headers)
    ticket_id = ticket_resp.json()["id"]

    resp = auth_client.post(
        f"/api/v1/tickets/{ticket_id}/issues",
        json={
            "title": "Manually added issue",
            "severity": "medium",
            "description": "Found this during review",
            "fix": "Refactor the handler",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Manually added issue"
    assert data["status"] == "identified"
    assert data["ticket_id"] == ticket_id


def test_create_issue_on_nonexistent_ticket(auth_client):
    resp = auth_client.post(
        "/api/v1/tickets/00000000-0000-0000-0000-000000000000/issues",
        json={
            "title": "Ghost issue",
            "severity": "low",
            "description": "desc",
            "fix": "fix",
        },
    )
    assert resp.status_code == 404
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/test_issues.py::test_list_issues tests/test_issues.py::test_get_issue tests/test_issues.py::test_patch_issue_promote_to_backlog -v`
Expected: FAIL — 404 (routes not mounted)

- [ ] **Step 3: Create `api/routes/issues.py`**

```python
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from api.core.deps import get_current_user
from api.db.models import Issue, Ticket, User
from api.db.session import get_db
from api.models.enums import IssueStatusEnum, SeverityEnum
from api.models.issues import IssueCreate, IssueListResponse, IssueResponse, IssueUpdate

router = APIRouter(tags=["issues"])


def require_operator_or_admin(user: User = Depends(get_current_user)) -> User:
    if user.role not in ("operator", "admin"):
        raise HTTPException(status_code=403, detail="Operator or admin access required")
    return user


@router.get("/issues", response_model=IssueListResponse)
def list_issues(
    status: IssueStatusEnum | None = None,
    severity: SeverityEnum | None = None,
    priority: int | None = Query(default=None, ge=1, le=5),
    ticket_id: UUID | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(Issue)
    if status:
        query = query.filter(Issue.status == status.value)
    if severity:
        query = query.filter(Issue.severity == severity.value)
    if priority is not None:
        query = query.filter(Issue.priority == priority)
    if ticket_id:
        query = query.filter(Issue.ticket_id == ticket_id)

    total = query.count()
    items = query.order_by(Issue.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

    return IssueListResponse(items=items, total=total, page=page, per_page=per_page)


@router.get("/issues/{issue_id}", response_model=IssueResponse)
def get_issue(
    issue_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    issue = db.get(Issue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    return issue


@router.patch("/issues/{issue_id}", response_model=IssueResponse)
def update_issue(
    issue_id: UUID,
    body: IssueUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_operator_or_admin),
):
    issue = db.get(Issue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    updates = body.model_dump(exclude_unset=True)
    for field, new_value in updates.items():
        if hasattr(new_value, "value"):
            setattr(issue, field, new_value.value)
        else:
            setattr(issue, field, new_value)

    db.commit()
    db.refresh(issue)
    return issue


@router.post("/tickets/{ticket_id}/issues", response_model=IssueResponse, status_code=201)
def create_issue_on_ticket(
    ticket_id: UUID,
    body: IssueCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_operator_or_admin),
):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    issue = Issue(
        ticket_id=ticket_id,
        title=body.title,
        severity=body.severity.value,
        description=body.description,
        fix=body.fix,
    )
    db.add(issue)
    db.commit()
    db.refresh(issue)
    return issue
```

- [ ] **Step 4: Mount the router in `api/main.py`**

Add `issues` to the import:

```python
from api.routes import artifacts, auth, audit, chat, comments, dashboard, enums, issues, tickets, users, webhooks
```

Add the openapi tag in the `openapi_tags` list:

```python
        {"name": "issues", "description": "Issue tracking — code quality findings from ticket analysis"},
```

Add the router mount after the tickets router:

```python
app.include_router(issues.router, prefix="/api/v1")
```

- [ ] **Step 5: Run all issue tests**

Run: `uv run pytest tests/test_issues.py -v`
Expected: All PASS

- [ ] **Step 6: Run full test suite**

Run: `uv run pytest tests/ -v`
Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add api/routes/issues.py api/main.py tests/test_issues.py
git commit -m "feat: add issues router with list, get, patch, and create-on-ticket endpoints"
```

---

### Task 6: Generate Alembic Migration

**Files:**
- Create: `api/db/alembic/versions/xxx_add_issues_table.py` (auto-generated)

- [ ] **Step 1: Generate the migration**

Run: `uv run alembic revision --autogenerate -m "add issues table"`

- [ ] **Step 2: Verify the generated migration**

Read the generated file and confirm it creates an `issues` table with columns: `id`, `ticket_id`, `title`, `severity`, `description`, `fix`, `status`, `priority`, `created_at`, `updated_at`, and a foreign key to `tickets.id`.

- [ ] **Step 3: Test migration against a running Postgres**

If Postgres is running locally:
Run: `uv run alembic upgrade head`
Expected: Migration applies successfully

- [ ] **Step 4: Commit**

```bash
git add api/db/alembic/versions/
git commit -m "feat: add Alembic migration for issues table"
```

---

### Task 7: Update Seed Data

**Files:**
- Modify: `api/seed.py`

- [ ] **Step 1: Update `api/seed.py`**

Add `Issue` to the import:

```python
from api.db.models import AuditLog, Issue, Ticket, User
```

After the tickets loop (after `db.commit()`), before the final print, add issue seeding. First, re-read tickets so we can reference them. Replace the final `db.commit()` and `print()` block:

```python
        db.commit()

        # Add sample issues to some tickets
        all_tickets = db.query(Ticket).all()

        # OOM kills ticket — kubernetes issues
        oom_ticket = next(t for t in all_tickets if "OOM" in t.title)
        db.add_all([
            Issue(
                ticket_id=oom_ticket.id,
                title="No memory limits on sidecar containers",
                severity="high",
                description="The envoy sidecar proxy has no memory limits set, allowing unbounded growth that competes with the main container for memory.",
                fix="Add resource limits to the sidecar:\n\n```yaml\nresources:\n  limits:\n    memory: 128Mi\n  requests:\n    memory: 64Mi\n```",
                status="identified",
            ),
            Issue(
                ticket_id=oom_ticket.id,
                title="JVM heap not capped relative to container limit",
                severity="critical",
                description="The JVM `-Xmx` is set to 480Mi but the container limit is 512Mi, leaving only 32Mi for off-heap, metaspace, and the OS. This guarantees OOM kills under load.",
                fix="Set `-Xmx` to ~70% of container limit:\n\n```yaml\nenv:\n  - name: JAVA_OPTS\n    value: \"-Xmx358m -XX:MaxMetaspaceSize=96m\"\n```\n\nOr use `-XX:MaxRAMPercentage=70.0` with container-aware JVM flags.",
                status="backlog",
                priority=2,
            ),
        ])

        # S3 security ticket — security issues
        s3_ticket = next(t for t in all_tickets if "S3" in t.title)
        db.add_all([
            Issue(
                ticket_id=s3_ticket.id,
                title="S3 bucket policy allows wildcard principal",
                severity="critical",
                description="The bucket policy on `prod-backups` uses `\"Principal\": \"*\"` with a condition that only checks source IP. This is bypassable via VPC endpoints or misconfigured NAT gateways.",
                fix="Restrict the principal to specific IAM roles:\n\n```json\n{\n  \"Principal\": {\n    \"AWS\": \"arn:aws:iam::123456789:role/backup-agent\"\n  }\n}\n```",
                status="backlog",
                priority=1,
            ),
            Issue(
                ticket_id=s3_ticket.id,
                title="No S3 access logging enabled",
                severity="medium",
                description="Server access logging is disabled on the `prod-backups` bucket. Without it, the 847 AccessDenied events were only found by correlating CloudTrail, which has a ~15 minute delay.",
                fix="Enable server access logging:\n\n```bash\naws s3api put-bucket-logging \\\n  --bucket prod-backups \\\n  --bucket-logging-status '{\"LoggingEnabled\":{\"TargetBucket\":\"prod-logs\",\"TargetPrefix\":\"s3-access/\"}}'\n```",
                status="identified",
            ),
            Issue(
                ticket_id=s3_ticket.id,
                title="IAM role has overly broad S3 permissions",
                severity="high",
                description="The `backup-agent` IAM role uses `s3:*` on `arn:aws:s3:::prod-backups/*`. If credentials leak, an attacker gets full read/write/delete access.",
                fix="Apply least-privilege:\n\n```json\n{\n  \"Effect\": \"Allow\",\n  \"Action\": [\"s3:PutObject\", \"s3:GetObject\"],\n  \"Resource\": \"arn:aws:s3:::prod-backups/db-dumps/*\"\n}\n```",
                status="identified",
            ),
        ])

        db.commit()
        print(f"Seeded {len(tickets_data)} tickets, 4 users, and 5 issues.")
```

- [ ] **Step 2: Test seeding against a clean database**

Run: `make restart-all` (or manually reset DB and run seed)
Expected: Seeds without errors, prints count including issues

- [ ] **Step 3: Commit**

```bash
git add api/seed.py
git commit -m "feat: add sample issues to seed data"
```

---

### Task 8: Frontend Types and API Client

**Files:**
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/api/client.ts`

- [ ] **Step 1: Add types to `frontend/src/types.ts`**

Add at the end of the file:

```typescript
export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type IssueStatus =
  | "identified"
  | "backlog"
  | "in_progress"
  | "done"
  | "dismissed";

export interface Issue {
  id: string;
  ticket_id: string;
  ticket_title: string;
  title: string;
  severity: Severity;
  description: string;
  fix: string;
  status: IssueStatus;
  priority: number | null;
  created_at: string;
  updated_at: string;
}

export interface IssueListResponse {
  items: Issue[];
  total: number;
  page: number;
  per_page: number;
}
```

Also update the `Ticket` interface to include issues:

```typescript
export interface Ticket {
  // ... existing fields ...
  issues: Issue[];
}
```

- [ ] **Step 2: Add API methods to `frontend/src/api/client.ts`**

Add these methods to the `api` object:

```typescript
  getIssues: (params?: string) =>
    request<import("../types").IssueListResponse>(
      `/issues${params ? `?${params}` : ""}`
    ),
  getIssue: (id: string) =>
    request<import("../types").Issue>(`/issues/${id}`),
  updateIssue: (id: string, data: Record<string, unknown>) =>
    request<import("../types").Issue>(`/issues/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  createIssueOnTicket: (ticketId: string, data: {
    title: string;
    severity: string;
    description: string;
    fix: string;
  }) =>
    request<import("../types").Issue>(`/tickets/${ticketId}/issues`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
```

- [ ] **Step 3: Verify frontend builds**

Run: `cd frontend && npm run build`
Expected: Build succeeds with no TypeScript errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types.ts frontend/src/api/client.ts
git commit -m "feat: add Issue types and API client methods"
```

---

### Task 9: Install Markdown Dependencies

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Install packages**

Run: `cd frontend && npm install react-markdown remark-gfm react-syntax-highlighter && npm install -D @types/react-syntax-highlighter`

- [ ] **Step 2: Verify build**

Run: `cd frontend && npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "feat: add react-markdown, remark-gfm, react-syntax-highlighter dependencies"
```

---

### Task 10: Create MarkdownRenderer Component

**Files:**
- Create: `frontend/src/components/MarkdownRenderer.tsx`

- [ ] **Step 1: Create `frontend/src/components/MarkdownRenderer.tsx`**

```tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          const codeString = String(children).replace(/\n$/, "");
          if (match) {
            return (
              <SyntaxHighlighter
                style={oneDark}
                language={match[1]}
                PreTag="div"
                customStyle={{
                  margin: "8px 0",
                  borderRadius: "4px",
                  fontSize: "12px",
                }}
              >
                {codeString}
              </SyntaxHighlighter>
            );
          }
          return (
            <code
              className={className}
              style={{
                background: "var(--kira-bg-input)",
                padding: "2px 6px",
                borderRadius: "3px",
                fontSize: "12px",
              }}
              {...props}
            >
              {children}
            </code>
          );
        },
        table({ children }) {
          return (
            <table
              style={{
                borderCollapse: "collapse",
                width: "100%",
                fontSize: "12px",
                margin: "8px 0",
              }}
            >
              {children}
            </table>
          );
        },
        th({ children }) {
          return (
            <th
              style={{
                textAlign: "left",
                padding: "6px 8px",
                borderBottom: "1px solid var(--kira-border)",
                color: "var(--kira-text-muted)",
              }}
            >
              {children}
            </th>
          );
        },
        td({ children }) {
          return (
            <td
              style={{
                padding: "6px 8px",
                borderBottom: "1px solid var(--kira-border-subtle)",
              }}
            >
              {children}
            </td>
          );
        },
        p({ children }) {
          return <p style={{ margin: "6px 0", lineHeight: 1.6 }}>{children}</p>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
```

- [ ] **Step 2: Verify frontend builds**

Run: `cd frontend && npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/MarkdownRenderer.tsx
git commit -m "feat: add shared MarkdownRenderer component with syntax highlighting"
```

---

### Task 11: Create IssueCard Component

**Files:**
- Create: `frontend/src/components/IssueCard.tsx`

- [ ] **Step 1: Create `frontend/src/components/IssueCard.tsx`**

```tsx
import { useState } from "react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import type { Issue, Severity, IssueStatus, User } from "../types";

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#f59e0b",
  low: "#3b82f6",
  info: "#6b7280",
};

const STATUS_COLORS: Record<IssueStatus, string> = {
  identified: "#6b7280",
  backlog: "#8b5cf6",
  in_progress: "#3b82f6",
  done: "#22c55e",
  dismissed: "#9ca3af",
};

interface IssueCardProps {
  issue: Issue;
  user: User | null;
  onPromote: (issueId: string, priority: number) => Promise<void>;
  onDismiss: (issueId: string) => Promise<void>;
  onUpdate: (issueId: string, data: Record<string, unknown>) => Promise<void>;
}

export function IssueCard({ issue, user, onPromote, onDismiss, onUpdate }: IssueCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [promoteDialog, setPromoteDialog] = useState(false);
  const [priority, setPriority] = useState(3);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(issue.title);
  const [editSeverity, setEditSeverity] = useState(issue.severity);
  const [editDescription, setEditDescription] = useState(issue.description);
  const [editFix, setEditFix] = useState(issue.fix);

  const canEdit = user && user.role !== "viewer";
  const isPromoted = issue.status !== "identified" && issue.status !== "dismissed";

  const handleSaveEdit = async () => {
    await onUpdate(issue.id, {
      title: editTitle,
      severity: editSeverity,
      description: editDescription,
      fix: editFix,
    });
    setEditing(false);
  };

  return (
    <div
      style={{
        border: "1px solid var(--kira-border)",
        borderRadius: "6px",
        marginBottom: "8px",
        overflow: "hidden",
        borderLeft: `3px solid ${SEVERITY_COLORS[issue.severity]}`,
      }}
    >
      {/* Collapsed header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "10px 14px",
          cursor: "pointer",
          background: "var(--kira-bg-card)",
        }}
      >
        <span style={{ fontSize: "12px", color: "var(--kira-text-muted)" }}>
          {expanded ? "\u25BC" : "\u25B6"}
        </span>
        <span
          style={{
            background: SEVERITY_COLORS[issue.severity],
            color: "white",
            padding: "2px 8px",
            borderRadius: "10px",
            fontSize: "10px",
            fontWeight: 500,
            textTransform: "uppercase",
          }}
        >
          {issue.severity}
        </span>
        <span style={{ flex: 1, fontSize: "13px", fontWeight: 500 }}>{issue.title}</span>
        {issue.priority && (
          <span
            style={{
              fontSize: "11px",
              color: "var(--kira-text-muted)",
              background: "var(--kira-bg-input)",
              padding: "2px 6px",
              borderRadius: "4px",
            }}
          >
            P{issue.priority}
          </span>
        )}
        <span
          style={{
            background: `${STATUS_COLORS[issue.status]}22`,
            color: STATUS_COLORS[issue.status],
            padding: "2px 8px",
            borderRadius: "10px",
            fontSize: "10px",
            fontWeight: 500,
          }}
        >
          {issue.status.replace("_", " ")}
        </span>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: "14px", background: "var(--kira-bg-page)", borderTop: "1px solid var(--kira-border)" }}>
          {editing ? (
            <div>
              <div style={{ marginBottom: "10px" }}>
                <label style={{ fontSize: "11px", color: "var(--kira-text-muted)", display: "block", marginBottom: "4px" }}>Title</label>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  style={{
                    width: "100%",
                    background: "var(--kira-bg-input)",
                    border: "1px solid var(--kira-border)",
                    borderRadius: "4px",
                    color: "var(--kira-text-primary)",
                    padding: "6px 8px",
                    fontSize: "13px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ marginBottom: "10px" }}>
                <label style={{ fontSize: "11px", color: "var(--kira-text-muted)", display: "block", marginBottom: "4px" }}>Severity</label>
                <select
                  value={editSeverity}
                  onChange={(e) => setEditSeverity(e.target.value as Severity)}
                  style={{
                    background: "var(--kira-bg-input)",
                    border: "1px solid var(--kira-border)",
                    borderRadius: "4px",
                    color: "var(--kira-text-primary)",
                    padding: "6px 8px",
                    fontSize: "13px",
                  }}
                >
                  {(["critical", "high", "medium", "low", "info"] as Severity[]).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: "10px" }}>
                <label style={{ fontSize: "11px", color: "var(--kira-text-muted)", display: "block", marginBottom: "4px" }}>Description (markdown)</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={6}
                  style={{
                    width: "100%",
                    background: "var(--kira-bg-input)",
                    border: "1px solid var(--kira-border)",
                    borderRadius: "4px",
                    color: "var(--kira-text-primary)",
                    padding: "8px",
                    fontSize: "13px",
                    resize: "vertical",
                    boxSizing: "border-box",
                    fontFamily: "monospace",
                  }}
                />
              </div>
              <div style={{ marginBottom: "10px" }}>
                <label style={{ fontSize: "11px", color: "var(--kira-text-muted)", display: "block", marginBottom: "4px" }}>Fix (markdown)</label>
                <textarea
                  value={editFix}
                  onChange={(e) => setEditFix(e.target.value)}
                  rows={8}
                  style={{
                    width: "100%",
                    background: "var(--kira-bg-input)",
                    border: "1px solid var(--kira-border)",
                    borderRadius: "4px",
                    color: "var(--kira-text-primary)",
                    padding: "8px",
                    fontSize: "13px",
                    resize: "vertical",
                    boxSizing: "border-box",
                    fontFamily: "monospace",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setEditing(false)}
                  style={{
                    padding: "6px 12px",
                    background: "var(--kira-btn-bg)",
                    border: "1px solid var(--kira-btn-border)",
                    borderRadius: "4px",
                    color: "var(--kira-btn-text)",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  style={{
                    padding: "6px 12px",
                    background: "var(--kira-accent)",
                    border: "none",
                    borderRadius: "4px",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "11px", color: "var(--kira-text-muted)", textTransform: "uppercase", marginBottom: "6px" }}>
                  Description
                </div>
                <div style={{ fontSize: "13px" }}>
                  <MarkdownRenderer content={issue.description} />
                </div>
              </div>
              <div style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "11px", color: "var(--kira-text-muted)", textTransform: "uppercase", marginBottom: "6px" }}>
                  Proposed Fix
                </div>
                <div style={{ fontSize: "13px" }}>
                  <MarkdownRenderer content={issue.fix} />
                </div>
              </div>

              {/* Action buttons */}
              {canEdit && (
                <div style={{ display: "flex", gap: "8px", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--kira-border-subtle)" }}>
                  {issue.status === "identified" && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); setPromoteDialog(true); }}
                        style={{
                          padding: "6px 12px",
                          background: "#8b5cf6",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                      >
                        Add to Backlog
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDismiss(issue.id); }}
                        style={{
                          padding: "6px 12px",
                          background: "var(--kira-btn-bg)",
                          border: "1px solid var(--kira-btn-border)",
                          borderRadius: "4px",
                          color: "var(--kira-btn-text)",
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                      >
                        Dismiss
                      </button>
                    </>
                  )}
                  {isPromoted && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
                      <span style={{ color: "var(--kira-text-muted)" }}>Priority:</span>
                      <select
                        value={issue.priority || 3}
                        onChange={(e) => onUpdate(issue.id, { priority: parseInt(e.target.value) })}
                        style={{
                          background: "var(--kira-bg-input)",
                          border: "1px solid var(--kira-border)",
                          borderRadius: "4px",
                          color: "var(--kira-text-primary)",
                          padding: "4px 6px",
                          fontSize: "12px",
                        }}
                      >
                        {[1, 2, 3, 4, 5].map((p) => (
                          <option key={p} value={p}>P{p}</option>
                        ))}
                      </select>
                      <span style={{ color: "var(--kira-text-muted)" }}>Status:</span>
                      <select
                        value={issue.status}
                        onChange={(e) => onUpdate(issue.id, { status: e.target.value })}
                        style={{
                          background: "var(--kira-bg-input)",
                          border: "1px solid var(--kira-border)",
                          borderRadius: "4px",
                          color: "var(--kira-text-primary)",
                          padding: "4px 6px",
                          fontSize: "12px",
                        }}
                      >
                        <option value="backlog">Backlog</option>
                        <option value="in_progress">In Progress</option>
                        <option value="done">Done</option>
                      </select>
                    </div>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditing(true); }}
                    style={{
                      padding: "6px 12px",
                      background: "var(--kira-btn-bg)",
                      border: "1px solid var(--kira-btn-border)",
                      borderRadius: "4px",
                      color: "var(--kira-btn-text)",
                      cursor: "pointer",
                      fontSize: "12px",
                      marginLeft: "auto",
                    }}
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Promote dialog */}
          {promoteDialog && (
            <div
              style={{
                marginTop: "12px",
                padding: "14px",
                background: "var(--kira-bg-card)",
                borderRadius: "6px",
                border: "1px solid var(--kira-border)",
              }}
            >
              <div style={{ fontSize: "13px", fontWeight: 500, marginBottom: "10px" }}>Set Priority</div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: "14px", fontWeight: 600, minWidth: "24px" }}>P{priority}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "var(--kira-text-muted)", marginBottom: "12px" }}>
                <span>1 = Highest</span>
                <span>5 = Lowest</span>
              </div>
              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setPromoteDialog(false)}
                  style={{
                    padding: "6px 12px",
                    background: "var(--kira-btn-bg)",
                    border: "1px solid var(--kira-btn-border)",
                    borderRadius: "4px",
                    color: "var(--kira-btn-text)",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await onPromote(issue.id, priority);
                    setPromoteDialog(false);
                  }}
                  style={{
                    padding: "6px 12px",
                    background: "#8b5cf6",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  Promote
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { SEVERITY_COLORS, STATUS_COLORS };
```

- [ ] **Step 2: Verify frontend builds**

Run: `cd frontend && npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/IssueCard.tsx
git commit -m "feat: add IssueCard collapsible component with promote/dismiss/edit"
```

---

### Task 12: Add Issues Section to TicketDetail Page

**Files:**
- Modify: `frontend/src/pages/TicketDetail.tsx`

- [ ] **Step 1: Update `frontend/src/pages/TicketDetail.tsx`**

Add import for `IssueCard`:

```typescript
import { IssueCard } from "../components/IssueCard";
```

Add import for `User` type (already imported) and `Issue` type:

```typescript
import type { Ticket, Comment, AuditEntry, Artifact, Status, Issue } from "../types";
```

Add a `user` state variable (the Layout component already fetches the user, but TicketDetail doesn't have access to it — we need to fetch it separately):

```typescript
const [user, setUser] = useState<import("../types").User | null>(null);
```

In the `useEffect`, add:

```typescript
api.me().then(setUser);
```

Add handlers for issue actions, after the existing handlers:

```typescript
  const handlePromoteIssue = async (issueId: string, priority: number) => {
    await api.updateIssue(issueId, { status: "backlog", priority });
    api.getTicket(ticket.id).then(setTicket);
  };

  const handleDismissIssue = async (issueId: string) => {
    await api.updateIssue(issueId, { status: "dismissed" });
    api.getTicket(ticket.id).then(setTicket);
  };

  const handleUpdateIssue = async (issueId: string, data: Record<string, unknown>) => {
    await api.updateIssue(issueId, data);
    api.getTicket(ticket.id).then(setTicket);
  };
```

Add the Issues section between the Analysis section and the Update Status section. Insert this JSX:

```tsx
      {/* Issues section */}
      <div style={{ ...sectionStyle }}>
        <div style={{ fontSize: "11px", color: "var(--kira-text-muted)", textTransform: "uppercase", marginBottom: "10px" }}>
          Issues ({ticket.issues.length})
        </div>
        {ticket.issues.length === 0 ? (
          <div style={{ color: "var(--kira-text-muted)", fontSize: "13px" }}>
            No issues identified
          </div>
        ) : (
          ticket.issues.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              user={user}
              onPromote={handlePromoteIssue}
              onDismiss={handleDismissIssue}
              onUpdate={handleUpdateIssue}
            />
          ))
        )}
      </div>
```

- [ ] **Step 2: Verify frontend builds**

Run: `cd frontend && npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/TicketDetail.tsx
git commit -m "feat: add Issues section to TicketDetail page with IssueCard components"
```

---

### Task 13: Create IssueList Page

**Files:**
- Create: `frontend/src/pages/IssueList.tsx`

- [ ] **Step 1: Create `frontend/src/pages/IssueList.tsx`**

```tsx
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import type { Issue, Severity, IssueStatus } from "../types";

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#f59e0b",
  low: "#3b82f6",
  info: "#6b7280",
};

const STATUS_COLORS: Record<IssueStatus, string> = {
  identified: "#6b7280",
  backlog: "#8b5cf6",
  in_progress: "#3b82f6",
  done: "#22c55e",
  dismissed: "#9ca3af",
};

const ALL_SEVERITIES: Severity[] = ["critical", "high", "medium", "low", "info"];
const ALL_STATUSES: IssueStatus[] = ["identified", "backlog", "in_progress", "done", "dismissed"];

export function IssueList() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [total, setTotal] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();

  const status = searchParams.get("status") as IssueStatus | null;
  const severity = searchParams.get("severity") as Severity | null;

  useEffect(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (severity) params.set("severity", severity);
    params.set("per_page", "50");
    api.getIssues(params.toString()).then((r) => {
      setIssues(r.items);
      setTotal(r.total);
    });
  }, [status, severity]);

  const setFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    setSearchParams(params);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2 style={{ margin: 0, fontSize: "18px" }}>Issues ({total})</h2>
        <div style={{ display: "flex", gap: "8px" }}>
          <select
            value={severity || ""}
            onChange={(e) => setFilter("severity", e.target.value || null)}
            style={{ background: "var(--kira-bg-card)", color: "var(--kira-text-secondary)", border: "1px solid var(--kira-border)", borderRadius: "4px", padding: "6px" }}
          >
            <option value="">All Severities</option>
            {ALL_SEVERITIES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={status || ""}
            onChange={(e) => setFilter("status", e.target.value || null)}
            style={{ background: "var(--kira-bg-card)", color: "var(--kira-text-secondary)", border: "1px solid var(--kira-border)", borderRadius: "4px", padding: "6px" }}
          >
            <option value="">All Statuses</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace("_", " ")}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ background: "var(--kira-bg-card)", borderRadius: "6px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr style={{ color: "var(--kira-text-muted)", textTransform: "uppercase", fontSize: "11px" }}>
              <th style={{ textAlign: "left", padding: "8px 12px" }}>Severity</th>
              <th style={{ textAlign: "left", padding: "8px 12px" }}>Title</th>
              <th style={{ textAlign: "left", padding: "8px 12px" }}>Status</th>
              <th style={{ textAlign: "left", padding: "8px 12px" }}>Priority</th>
              <th style={{ textAlign: "left", padding: "8px 12px" }}>Ticket</th>
              <th style={{ textAlign: "left", padding: "8px 12px" }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {issues.map((issue) => (
              <tr key={issue.id} style={{ borderTop: "1px solid var(--kira-border-subtle)" }}>
                <td style={{ padding: "10px 12px" }}>
                  <span
                    style={{
                      background: SEVERITY_COLORS[issue.severity],
                      color: "white",
                      padding: "2px 8px",
                      borderRadius: "10px",
                      fontSize: "10px",
                      fontWeight: 500,
                      textTransform: "uppercase",
                    }}
                  >
                    {issue.severity}
                  </span>
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <Link to={`/issues/${issue.id}`} style={{ color: "var(--kira-link)", textDecoration: "none" }}>
                    {issue.title}
                  </Link>
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <span
                    style={{
                      background: `${STATUS_COLORS[issue.status]}22`,
                      color: STATUS_COLORS[issue.status],
                      padding: "2px 8px",
                      borderRadius: "10px",
                      fontSize: "10px",
                      fontWeight: 500,
                    }}
                  >
                    {issue.status.replace("_", " ")}
                  </span>
                </td>
                <td style={{ padding: "10px 12px", color: "var(--kira-text-muted)" }}>
                  {issue.priority ? `P${issue.priority}` : "\u2014"}
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <Link
                    to={`/tickets/${issue.ticket_id}`}
                    style={{ color: "var(--kira-link)", textDecoration: "none", fontSize: "11px" }}
                    title={issue.ticket_title}
                  >
                    {issue.ticket_title.length > 40 ? issue.ticket_title.slice(0, 40) + "\u2026" : issue.ticket_title}
                  </Link>
                </td>
                <td style={{ padding: "10px 12px", color: "var(--kira-text-muted)" }}>
                  {new Date(issue.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {issues.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: "20px", textAlign: "center", color: "var(--kira-text-muted)" }}>
                  No issues found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify frontend builds**

Run: `cd frontend && npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/IssueList.tsx
git commit -m "feat: add IssueList page with severity/status filtering"
```

---

### Task 14: Create IssueDetail Page

**Files:**
- Create: `frontend/src/pages/IssueDetail.tsx`

- [ ] **Step 1: Create `frontend/src/pages/IssueDetail.tsx`**

```tsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client";
import { MarkdownRenderer } from "../components/MarkdownRenderer";
import type { Issue, Severity, IssueStatus, User } from "../types";

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#f59e0b",
  low: "#3b82f6",
  info: "#6b7280",
};

const STATUS_COLORS: Record<IssueStatus, string> = {
  identified: "#6b7280",
  backlog: "#8b5cf6",
  in_progress: "#3b82f6",
  done: "#22c55e",
  dismissed: "#9ca3af",
};

const EDITABLE_STATUSES: IssueStatus[] = ["identified", "backlog", "in_progress", "done", "dismissed"];

export function IssueDetail() {
  const { id } = useParams<{ id: string }>();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editSeverity, setEditSeverity] = useState<Severity>("medium");
  const [editDescription, setEditDescription] = useState("");
  const [editFix, setEditFix] = useState("");

  useEffect(() => {
    if (!id) return;
    api.getIssue(id).then((i) => {
      setIssue(i);
      setEditTitle(i.title);
      setEditSeverity(i.severity);
      setEditDescription(i.description);
      setEditFix(i.fix);
    });
    api.me().then(setUser);
  }, [id]);

  if (!issue) return <div style={{ color: "var(--kira-text-muted)" }}>Loading...</div>;

  const canEdit = user && user.role !== "viewer";

  const handleUpdate = async (data: Record<string, unknown>) => {
    if (!id) return;
    const updated = await api.updateIssue(id, data);
    setIssue(updated);
  };

  const handleSaveEdit = async () => {
    await handleUpdate({
      title: editTitle,
      severity: editSeverity,
      description: editDescription,
      fix: editFix,
    });
    setEditing(false);
  };

  const sectionStyle = {
    background: "var(--kira-bg-card)",
    borderRadius: "6px",
    padding: "16px",
    marginBottom: "12px",
  };

  return (
    <div>
      {/* Header */}
      <div style={{ ...sectionStyle }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
          <h2 style={{ margin: 0, fontSize: "18px" }}>{issue.title}</h2>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span
              style={{
                background: SEVERITY_COLORS[issue.severity],
                color: "white",
                padding: "2px 8px",
                borderRadius: "10px",
                fontSize: "11px",
                fontWeight: 500,
                textTransform: "uppercase",
              }}
            >
              {issue.severity}
            </span>
            <span
              style={{
                background: `${STATUS_COLORS[issue.status]}22`,
                color: STATUS_COLORS[issue.status],
                padding: "2px 8px",
                borderRadius: "10px",
                fontSize: "11px",
                fontWeight: 500,
              }}
            >
              {issue.status.replace("_", " ")}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "24px", fontSize: "13px", flexWrap: "wrap" }}>
          <div>
            <span style={{ color: "var(--kira-text-muted)" }}>Ticket: </span>
            <Link to={`/tickets/${issue.ticket_id}`} style={{ color: "var(--kira-link)", textDecoration: "none" }}>
              {issue.ticket_title}
            </Link>
          </div>
          <div>
            <span style={{ color: "var(--kira-text-muted)" }}>Priority: </span>
            <span>{issue.priority ? `P${issue.priority}` : "\u2014"}</span>
          </div>
          <div>
            <span style={{ color: "var(--kira-text-muted)" }}>Created: </span>
            <span>{new Date(issue.created_at).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      {canEdit && (
        <div style={{ ...sectionStyle }}>
          <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
              <span style={{ color: "var(--kira-text-muted)" }}>Status:</span>
              <select
                value={issue.status}
                onChange={(e) => handleUpdate({ status: e.target.value })}
                style={{
                  background: "var(--kira-bg-input)",
                  border: "1px solid var(--kira-border)",
                  borderRadius: "4px",
                  color: "var(--kira-text-primary)",
                  padding: "6px 8px",
                  fontSize: "12px",
                }}
              >
                {EDITABLE_STATUSES.map((s) => (
                  <option key={s} value={s}>{s.replace("_", " ")}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
              <span style={{ color: "var(--kira-text-muted)" }}>Priority:</span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={issue.priority || 3}
                  onChange={(e) => handleUpdate({ priority: parseInt(e.target.value) })}
                  style={{ width: "120px" }}
                />
                <span style={{ fontSize: "13px", fontWeight: 600, minWidth: "24px" }}>
                  P{issue.priority || "\u2014"}
                </span>
              </div>
            </div>
            <button
              onClick={() => setEditing(!editing)}
              style={{
                padding: "6px 12px",
                background: "var(--kira-btn-bg)",
                border: "1px solid var(--kira-btn-border)",
                borderRadius: "4px",
                color: "var(--kira-btn-text)",
                cursor: "pointer",
                fontSize: "12px",
                marginLeft: "auto",
              }}
            >
              {editing ? "Cancel Edit" : "Edit"}
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {editing ? (
        <div style={{ ...sectionStyle }}>
          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "11px", color: "var(--kira-text-muted)", display: "block", marginBottom: "4px" }}>Title</label>
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              style={{
                width: "100%",
                background: "var(--kira-bg-input)",
                border: "1px solid var(--kira-border)",
                borderRadius: "4px",
                color: "var(--kira-text-primary)",
                padding: "8px",
                fontSize: "13px",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "11px", color: "var(--kira-text-muted)", display: "block", marginBottom: "4px" }}>Severity</label>
            <select
              value={editSeverity}
              onChange={(e) => setEditSeverity(e.target.value as Severity)}
              style={{
                background: "var(--kira-bg-input)",
                border: "1px solid var(--kira-border)",
                borderRadius: "4px",
                color: "var(--kira-text-primary)",
                padding: "8px",
                fontSize: "13px",
              }}
            >
              {(["critical", "high", "medium", "low", "info"] as Severity[]).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "11px", color: "var(--kira-text-muted)", display: "block", marginBottom: "4px" }}>Description (markdown)</label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={8}
              style={{
                width: "100%",
                background: "var(--kira-bg-input)",
                border: "1px solid var(--kira-border)",
                borderRadius: "4px",
                color: "var(--kira-text-primary)",
                padding: "8px",
                fontSize: "13px",
                resize: "vertical",
                boxSizing: "border-box",
                fontFamily: "monospace",
              }}
            />
          </div>
          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "11px", color: "var(--kira-text-muted)", display: "block", marginBottom: "4px" }}>Fix (markdown)</label>
            <textarea
              value={editFix}
              onChange={(e) => setEditFix(e.target.value)}
              rows={10}
              style={{
                width: "100%",
                background: "var(--kira-bg-input)",
                border: "1px solid var(--kira-border)",
                borderRadius: "4px",
                color: "var(--kira-text-primary)",
                padding: "8px",
                fontSize: "13px",
                resize: "vertical",
                boxSizing: "border-box",
                fontFamily: "monospace",
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={handleSaveEdit}
              style={{
                padding: "8px 16px",
                background: "var(--kira-accent)",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              Save Changes
            </button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ ...sectionStyle }}>
            <div style={{ fontSize: "11px", color: "var(--kira-text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>
              Description
            </div>
            <div style={{ fontSize: "13px" }}>
              <MarkdownRenderer content={issue.description} />
            </div>
          </div>
          <div style={{ ...sectionStyle, borderLeft: `3px solid ${SEVERITY_COLORS[issue.severity]}` }}>
            <div style={{ fontSize: "11px", color: "var(--kira-text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>
              Proposed Fix
            </div>
            <div style={{ fontSize: "13px" }}>
              <MarkdownRenderer content={issue.fix} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify frontend builds**

Run: `cd frontend && npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/IssueDetail.tsx
git commit -m "feat: add IssueDetail page with markdown rendering and edit controls"
```

---

### Task 15: Add Routes and Nav Link

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/Layout.tsx`

- [ ] **Step 1: Update `frontend/src/App.tsx`**

Add imports:

```typescript
import { IssueList } from "./pages/IssueList";
import { IssueDetail } from "./pages/IssueDetail";
```

Add routes inside the `<Route element={<Layout />}>` group, after the tickets routes:

```tsx
            <Route path="/issues" element={<IssueList />} />
            <Route path="/issues/:id" element={<IssueDetail />} />
```

- [ ] **Step 2: Update `frontend/src/components/Layout.tsx`**

Add an "Issues" nav link after the "Tickets" link:

```tsx
          <Link to="/issues" style={{ color: "var(--kira-text-secondary)", fontSize: "13px", textDecoration: "none" }}>
            Issues
          </Link>
```

- [ ] **Step 3: Verify frontend builds**

Run: `cd frontend && npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.tsx frontend/src/components/Layout.tsx
git commit -m "feat: add Issues nav link and /issues routes"
```

---

### Task 16: Regenerate OpenAPI Spec and Update llms.txt

**Files:**
- Modify: `docs/api/openapi.yaml` (regenerated)
- Modify: `llms.txt`

- [ ] **Step 1: Regenerate OpenAPI spec**

Run: `make openapi`
Expected: `docs/api/openapi.yaml` is updated with the new issues endpoints

- [ ] **Step 2: Update `llms.txt`**

Add these entries to the appropriate sections:

In the **Backend — Pydantic Schemas** section:
```
- [api/models/issues.py](api/models/issues.py): IssueCreate, IssueUpdate, IssueResponse, IssueListResponse
```

In the **Backend — Routes** section:
```
- [api/routes/issues.py](api/routes/issues.py): Issue CRUD — list, get, patch issues; create issue on ticket
```

In the **Frontend — Pages** section:
```
- [frontend/src/pages/IssueList.tsx](frontend/src/pages/IssueList.tsx): Filterable issue backlog table
- [frontend/src/pages/IssueDetail.tsx](frontend/src/pages/IssueDetail.tsx): Full issue view with markdown rendering, edit, status/priority controls
```

In the **Frontend — Components** section:
```
- [frontend/src/components/IssueCard.tsx](frontend/src/components/IssueCard.tsx): Collapsible issue card with promote/dismiss/edit actions
- [frontend/src/components/MarkdownRenderer.tsx](frontend/src/components/MarkdownRenderer.tsx): Shared markdown renderer with syntax highlighting
```

- [ ] **Step 3: Commit**

```bash
git add docs/api/openapi.yaml llms.txt
git commit -m "docs: update OpenAPI spec and llms.txt for issues feature"
```

---

### Task 17: Run Full Test Suite and Verify Frontend Build

- [ ] **Step 1: Run backend tests**

Run: `uv run pytest tests/ -v`
Expected: All tests PASS (including all new issue tests)

- [ ] **Step 2: Run frontend build**

Run: `cd frontend && npm run build`
Expected: Build succeeds with no TypeScript errors

- [ ] **Step 3: Manual smoke test**

If the dev environment is running:
1. Login as `jsmith` (operator)
2. Navigate to a ticket with issues (OOM kills or S3 ticket)
3. Verify issues section appears with collapsible cards
4. Expand an issue and verify markdown renders correctly
5. Click "Add to Backlog" on an identified issue, set priority, confirm
6. Navigate to Issues page via nav bar
7. Verify promoted issue appears in the list
8. Click through to the Issue detail page
9. Verify link back to originating ticket works
