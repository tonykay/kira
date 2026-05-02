# Ticket Numbering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add human-readable sequential ticket numbers (#1, #2, #3...) to Kira's backend and frontend.

**Architecture:** PostgreSQL sequence auto-assigns `ticket_number` on INSERT. A new API route enables lookup by number. Frontend displays `#N` in both table views and the detail header.

**Tech Stack:** SQLAlchemy + Alembic (backend), React + TypeScript (frontend), pytest + FastAPI TestClient (tests). Tests use SQLite in-memory — a custom `nextval` SQLite function bridges the PostgreSQL sequence syntax.

**Spec:** `docs/superpowers/specs/2026-05-01-ticket-numbering-design.md`

---

### File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `api/db/models.py` | Modify | Add `ticket_number` column to `Ticket` ORM model |
| `api/db/alembic/versions/*_add_ticket_number.py` | Create | Migration: sequence, column, backfill, index |
| `api/models/tickets.py` | Modify | Add `ticket_number: int` to `TicketResponse` |
| `api/routes/tickets.py` | Modify | Add `GET /by-number/{ticket_number}` route |
| `tests/conftest.py` | Modify | Add SQLite `nextval` shim for PG sequence compatibility |
| `tests/test_tickets.py` | Modify | Add tests for `ticket_number` in responses and by-number lookup |
| `frontend/src/types.ts` | Modify | Add `ticket_number: number` to `Ticket` interface |
| `frontend/src/pages/Dashboard.tsx` | Modify | Add `#` column to Recent Tickets table |
| `frontend/src/pages/TicketList.tsx` | Modify | Add `#` column to Tickets table |
| `frontend/src/pages/TicketDetail.tsx` | Modify | Add `#N` prefix to title header |

---

### Task 1: Add `ticket_number` column to ORM model

**Files:**
- Modify: `api/db/models.py:27-55` (Ticket class)

- [ ] **Step 1: Add the `ticket_number` column to the Ticket model**

Add the import and column after the `id` field (line 30):

```python
# At the top of api/db/models.py, add to existing imports:
from sqlalchemy import ForeignKey, Text, String, JSON, Integer

# In the Ticket class, after the `id` line (line 30), add:
    ticket_number: Mapped[int] = mapped_column(
        Integer,
        server_default=sa.text("nextval('ticket_number_seq')"),
        unique=True,
        nullable=False,
    )
```

Also add `import sqlalchemy as sa` at the top of the file (it's not currently imported).

The full import block becomes:

```python
import uuid
from datetime import datetime, timezone

import sqlalchemy as sa
from sqlalchemy import ForeignKey, Text, String, JSON, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.db.base import Base
```

- [ ] **Step 2: Verify the model loads without syntax errors**

Run: `cd /Users/tok/Dropbox/PARAL/Projects/kira-jira-replacement-tok/kira && python -c "from api.db.models import Ticket; print('ticket_number' in Ticket.__table__.columns)"`

Expected: `True`

- [ ] **Step 3: Commit**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/kira-jira-replacement-tok/kira
git add api/db/models.py
git commit -m "feat: add ticket_number column to Ticket ORM model"
```

---

### Task 2: Add SQLite `nextval` shim to test conftest

The test suite uses SQLite in-memory. PostgreSQL's `nextval('ticket_number_seq')` is used as the `server_default` in the ORM model. SQLite doesn't have `nextval`, so we register a custom function that simulates it.

**Files:**
- Modify: `tests/conftest.py:15-28` (db_session fixture)

- [ ] **Step 1: Add the SQLite nextval shim to the `db_session` fixture**

Replace the `db_session` fixture with:

```python
@pytest.fixture
def db_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    # SQLite doesn't support PG sequences; register a nextval shim
    # so the server_default="nextval('ticket_number_seq')" works in tests.
    _seq_counters: dict[str, int] = {}

    @event.listens_for(engine, "connect")
    def register_nextval(dbapi_conn, connection_record):
        def nextval(seq_name):
            _seq_counters[seq_name] = _seq_counters.get(seq_name, 0) + 1
            return _seq_counters[seq_name]
        dbapi_conn.create_function("nextval", 1, nextval)

    Base.metadata.create_all(engine)
    TestSession = sessionmaker(bind=engine)
    session = TestSession()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)
```

Add the `event` import at the top of conftest.py:

```python
from sqlalchemy import create_engine, StaticPool, event
```

- [ ] **Step 2: Run existing tests to confirm the shim doesn't break anything**

Run: `cd /Users/tok/Dropbox/PARAL/Projects/kira-jira-replacement-tok/kira && python -m pytest tests/test_tickets.py -v`

Expected: All existing tests pass. Each created ticket now gets an auto-assigned `ticket_number`.

- [ ] **Step 3: Commit**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/kira-jira-replacement-tok/kira
git add tests/conftest.py
git commit -m "test: add SQLite nextval shim for ticket_number sequence"
```

---

### Task 3: Add `ticket_number` to API response model and write tests

**Files:**
- Modify: `api/models/tickets.py:36-57` (TicketResponse class)
- Modify: `tests/test_tickets.py`

- [ ] **Step 1: Write the failing tests**

Add these tests to the end of `tests/test_tickets.py`:

```python
def test_create_ticket_returns_ticket_number(client, api_key_headers):
    resp = client.post("/api/v1/tickets", json=TICKET_PAYLOAD, headers=api_key_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert "ticket_number" in data
    assert isinstance(data["ticket_number"], int)
    assert data["ticket_number"] >= 1


def test_ticket_numbers_are_sequential(client, api_key_headers):
    r1 = client.post("/api/v1/tickets", json=TICKET_PAYLOAD, headers=api_key_headers)
    r2 = client.post(
        "/api/v1/tickets",
        json={**TICKET_PAYLOAD, "title": "Second ticket"},
        headers=api_key_headers,
    )
    n1 = r1.json()["ticket_number"]
    n2 = r2.json()["ticket_number"]
    assert n2 == n1 + 1


def test_get_ticket_includes_ticket_number(client, api_key_headers):
    create_resp = client.post("/api/v1/tickets", json=TICKET_PAYLOAD, headers=api_key_headers)
    ticket_id = create_resp.json()["id"]
    resp = client.get(f"/api/v1/tickets/{ticket_id}", headers=api_key_headers)
    assert resp.status_code == 200
    assert "ticket_number" in resp.json()


def test_list_tickets_includes_ticket_number(client, api_key_headers):
    client.post("/api/v1/tickets", json=TICKET_PAYLOAD, headers=api_key_headers)
    resp = client.get("/api/v1/tickets", headers=api_key_headers)
    assert resp.status_code == 200
    items = resp.json()["items"]
    assert all("ticket_number" in item for item in items)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/tok/Dropbox/PARAL/Projects/kira-jira-replacement-tok/kira && python -m pytest tests/test_tickets.py::test_create_ticket_returns_ticket_number tests/test_tickets.py::test_ticket_numbers_are_sequential tests/test_tickets.py::test_get_ticket_includes_ticket_number tests/test_tickets.py::test_list_tickets_includes_ticket_number -v`

Expected: FAIL — `ticket_number` is not in the response because `TicketResponse` doesn't include it yet.

- [ ] **Step 3: Add `ticket_number` to `TicketResponse`**

In `api/models/tickets.py`, add `ticket_number: int` to the `TicketResponse` class, after the `id` field:

```python
class TicketResponse(BaseModel):
    id: UUID
    ticket_number: int
    title: str
    # ... rest unchanged
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/tok/Dropbox/PARAL/Projects/kira-jira-replacement-tok/kira && python -m pytest tests/test_tickets.py -v`

Expected: All tests pass, including the four new ones.

- [ ] **Step 5: Commit**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/kira-jira-replacement-tok/kira
git add api/models/tickets.py tests/test_tickets.py
git commit -m "feat: add ticket_number to API response model"
```

---

### Task 4: Add `GET /by-number/{ticket_number}` route and tests

**Files:**
- Modify: `api/routes/tickets.py:20-103`
- Modify: `tests/test_tickets.py`

- [ ] **Step 1: Write the failing tests**

Add these tests to the end of `tests/test_tickets.py`:

```python
def test_get_ticket_by_number(client, api_key_headers):
    create_resp = client.post("/api/v1/tickets", json=TICKET_PAYLOAD, headers=api_key_headers)
    ticket_number = create_resp.json()["ticket_number"]
    resp = client.get(f"/api/v1/tickets/by-number/{ticket_number}", headers=api_key_headers)
    assert resp.status_code == 200
    assert resp.json()["ticket_number"] == ticket_number
    assert resp.json()["title"] == TICKET_PAYLOAD["title"]


def test_get_ticket_by_number_not_found(client, api_key_headers):
    resp = client.get("/api/v1/tickets/by-number/99999", headers=api_key_headers)
    assert resp.status_code == 404


def test_get_ticket_by_number_unauthenticated(client):
    resp = client.get("/api/v1/tickets/by-number/1")
    assert resp.status_code == 401
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/tok/Dropbox/PARAL/Projects/kira-jira-replacement-tok/kira && python -m pytest tests/test_tickets.py::test_get_ticket_by_number tests/test_tickets.py::test_get_ticket_by_number_not_found tests/test_tickets.py::test_get_ticket_by_number_unauthenticated -v`

Expected: FAIL — 404 or 422 because the route doesn't exist.

- [ ] **Step 3: Add the `by-number` route**

In `api/routes/tickets.py`, add this route **before** the `get_ticket` function (before line 94, the `@router.get("/{ticket_id}")` decorator). The route must come first so FastAPI doesn't try to parse `"by-number"` as a UUID:

```python
@router.get("/by-number/{ticket_number}", response_model=TicketResponse)
def get_ticket_by_number(
    ticket_number: int,
    db: Session = Depends(get_db),
    auth: User | str = Depends(get_current_user_or_api_key),
):
    ticket = db.query(Ticket).filter(Ticket.ticket_number == ticket_number).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/tok/Dropbox/PARAL/Projects/kira-jira-replacement-tok/kira && python -m pytest tests/test_tickets.py -v`

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/kira-jira-replacement-tok/kira
git add api/routes/tickets.py tests/test_tickets.py
git commit -m "feat: add GET /tickets/by-number/{n} lookup route"
```

---

### Task 5: Create the Alembic migration

This migration will be applied to the production PostgreSQL database. It creates the sequence, adds the column, backfills existing tickets, and sets the sequence to continue from the right value.

**Files:**
- Create: `api/db/alembic/versions/d1a2b3c4e5f6_add_ticket_number.py`

- [ ] **Step 1: Create the migration file**

Create `api/db/alembic/versions/d1a2b3c4e5f6_add_ticket_number.py`:

```python
"""add ticket_number column with sequence

Revision ID: d1a2b3c4e5f6
Revises: c3a8f2e91b44
Create Date: 2026-05-01 12:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "d1a2b3c4e5f6"
down_revision = "c3a8f2e91b44"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE SEQUENCE ticket_number_seq")

    op.add_column(
        "tickets",
        sa.Column(
            "ticket_number",
            sa.Integer(),
            server_default=sa.text("nextval('ticket_number_seq')"),
            nullable=True,
        ),
    )

    # Backfill existing tickets in created_at order (oldest = #1)
    op.execute("""
        WITH numbered AS (
            SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn
            FROM tickets
        )
        UPDATE tickets SET ticket_number = numbered.rn
        FROM numbered WHERE tickets.id = numbered.id
    """)

    # Set the sequence to continue after the highest backfilled value
    op.execute("""
        SELECT setval('ticket_number_seq',
            COALESCE((SELECT MAX(ticket_number) FROM tickets), 0) + 1,
            false)
    """)

    op.alter_column("tickets", "ticket_number", nullable=False)
    op.create_unique_constraint("uq_tickets_ticket_number", "tickets", ["ticket_number"])
    op.create_index("ix_tickets_ticket_number", "tickets", ["ticket_number"])


def downgrade() -> None:
    op.drop_index("ix_tickets_ticket_number", table_name="tickets")
    op.drop_constraint("uq_tickets_ticket_number", "tickets", type_="unique")
    op.drop_column("tickets", "ticket_number")
    op.execute("DROP SEQUENCE ticket_number_seq")
```

- [ ] **Step 2: Verify the migration file is valid Python**

Run: `cd /Users/tok/Dropbox/PARAL/Projects/kira-jira-replacement-tok/kira && python -c "import api.db.alembic.versions.d1a2b3c4e5f6_add_ticket_number; print('OK')"`

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/kira-jira-replacement-tok/kira
git add api/db/alembic/versions/d1a2b3c4e5f6_add_ticket_number.py
git commit -m "feat: add Alembic migration for ticket_number sequence and column"
```

---

### Task 6: Update frontend TypeScript type

**Files:**
- Modify: `frontend/src/types.ts:23-43` (Ticket interface)

- [ ] **Step 1: Add `ticket_number` to the `Ticket` interface**

In `frontend/src/types.ts`, add `ticket_number: number;` after the `id` field in the `Ticket` interface:

```typescript
export interface Ticket {
  id: string;
  ticket_number: number;
  title: string;
  // ... rest unchanged
}
```

- [ ] **Step 2: Run TypeScript type check to verify no errors**

Run: `cd /Users/tok/Dropbox/PARAL/Projects/kira-jira-replacement-tok/kira/frontend && npx tsc --noEmit`

Expected: No errors (the new field is additive).

- [ ] **Step 3: Commit**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/kira-jira-replacement-tok/kira
git add frontend/src/types.ts
git commit -m "feat: add ticket_number to Ticket TypeScript interface"
```

---

### Task 7: Add `#` column to Dashboard Recent Tickets table

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx:88-119` (Recent Tickets table)

- [ ] **Step 1: Add the `#` column header**

In `Dashboard.tsx`, add a `#` header as the first column in the `<thead>` (after line 90):

```tsx
<tr style={{ color: "var(--kira-text-muted)", textTransform: "uppercase", fontSize: "11px" }}>
  <th style={{ textAlign: "left", padding: "8px 12px", width: "50px" }}>#</th>
  <th style={{ textAlign: "left", padding: "8px 12px" }}>Title</th>
  {/* ... rest unchanged */}
</tr>
```

- [ ] **Step 2: Add the ticket number cell to each row**

In the `<tbody>` row mapping, add a `<td>` for the ticket number as the first cell (after the `<tr key={t.id}>` opening tag):

```tsx
<td style={{ padding: "10px 12px", color: "var(--kira-text-muted)", fontWeight: 600 }}>
  #{t.ticket_number}
</td>
```

- [ ] **Step 3: Build frontend to verify no errors**

Run: `cd /Users/tok/Dropbox/PARAL/Projects/kira-jira-replacement-tok/kira/frontend && npx tsc --noEmit`

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/kira-jira-replacement-tok/kira
git add frontend/src/pages/Dashboard.tsx
git commit -m "feat: add ticket number column to Dashboard recent tickets"
```

---

### Task 8: Add `#` column to Tickets List table

**Files:**
- Modify: `frontend/src/pages/TicketList.tsx:69-107` (Tickets table)

- [ ] **Step 1: Add the `#` column header**

In `TicketList.tsx`, add a `#` header as the first column in the `<thead>` (after line 71):

```tsx
<tr style={{ color: "var(--kira-text-muted)", textTransform: "uppercase", fontSize: "11px" }}>
  <th style={{ textAlign: "left", padding: "8px 12px", width: "50px" }}>#</th>
  <th style={{ textAlign: "left", padding: "8px 12px" }}>Title</th>
  {/* ... rest unchanged */}
</tr>
```

- [ ] **Step 2: Add the ticket number cell to each row**

In the `<tbody>` row mapping, add a `<td>` for the ticket number as the first cell (after the `<tr key={t.id}>` opening tag):

```tsx
<td style={{ padding: "10px 12px", color: "var(--kira-text-muted)", fontWeight: 600 }}>
  #{t.ticket_number}
</td>
```

- [ ] **Step 3: Build frontend to verify no errors**

Run: `cd /Users/tok/Dropbox/PARAL/Projects/kira-jira-replacement-tok/kira/frontend && npx tsc --noEmit`

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/kira-jira-replacement-tok/kira
git add frontend/src/pages/TicketList.tsx
git commit -m "feat: add ticket number column to Tickets list"
```

---

### Task 9: Add `#N` prefix to Ticket Detail header

**Files:**
- Modify: `frontend/src/pages/TicketDetail.tsx:113-118` (title header area)

- [ ] **Step 1: Add ticket number prefix to the title**

In `TicketDetail.tsx`, modify the `<h2>` that displays the title (line 114) to include the ticket number:

```tsx
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
  <h2 style={{ margin: 0, fontSize: "18px" }}>
    <span style={{ color: "var(--kira-text-muted)", marginRight: "8px" }}>#{ticket.ticket_number}</span>
    {ticket.title}
  </h2>
  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
    <AreaLozenge area={ticket.area} />
    <StatusLozenge status={ticket.status} />
  </div>
</div>
```

- [ ] **Step 2: Build frontend to verify no errors**

Run: `cd /Users/tok/Dropbox/PARAL/Projects/kira-jira-replacement-tok/kira/frontend && npx tsc --noEmit`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/kira-jira-replacement-tok/kira
git add frontend/src/pages/TicketDetail.tsx
git commit -m "feat: add ticket number prefix to ticket detail header"
```

---

### Task 10: Full test suite and frontend build verification

**Files:** None (verification only)

- [ ] **Step 1: Run the full backend test suite**

Run: `cd /Users/tok/Dropbox/PARAL/Projects/kira-jira-replacement-tok/kira && python -m pytest tests/ -v`

Expected: All tests pass.

- [ ] **Step 2: Run the full frontend build**

Run: `cd /Users/tok/Dropbox/PARAL/Projects/kira-jira-replacement-tok/kira/frontend && npx vite build`

Expected: Build succeeds with no errors.

- [ ] **Step 3: Start the dev server and verify in browser**

Run: `cd /Users/tok/Dropbox/PARAL/Projects/kira-jira-replacement-tok/kira/frontend && npx vite --port 5173`

Open `http://localhost:5173` in a browser. Check:
- Dashboard: `#` column visible in Recent Tickets table
- Tickets page: `#` column visible in Tickets table
- Ticket detail: `#N` prefix visible before the title

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/kira-jira-replacement-tok/kira
git status
# If clean, no commit needed. If fixes were made, commit them.
```
