# Issues Feature Design Spec

## Purpose

Add an Issues feature so AI agents can surface code quality problems, tech debt, and reliability gaps as part of their ticket analysis. Each issue is an independent, actionable finding attached to a trouble ticket. Human operators can promote issues to a backlog for developers and SMEs to action later, reducing tech debt and increasing reliability.

Issues serve a different audience than tickets: SRE operators handle tickets (incident response), while developers and SMEs focus on issues (tech debt reduction, code robustness).

## Data Model

A new `Issue` table with a foreign key to `tickets`:

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `ticket_id` | UUID FK → tickets | Always set, never null |
| `title` | String(255) | Short label, e.g. "No Retry Logic for Transient Failures" |
| `severity` | Enum: `critical`, `high`, `medium`, `low`, `info` | Set by agent |
| `description` | Text | Markdown — what's wrong and why |
| `fix` | Text | Markdown — proposed fix with code blocks etc. |
| `status` | Enum: `identified`, `backlog`, `in_progress`, `done`, `dismissed` | Starts as `identified` |
| `priority` | Integer 1-5, nullable | Null until promoted to backlog, set by human |
| `created_at` | datetime | Auto |
| `updated_at` | datetime | Auto |

`status=identified` means "attached to a ticket, not yet promoted." Promotion means changing status to `backlog` and setting a priority. The issue always retains its `ticket_id` link back to the originating ticket.

## Enums

### SeverityEnum

`critical`, `high`, `medium`, `low`, `info`

### IssueStatusEnum

`identified`, `backlog`, `in_progress`, `done`, `dismissed`

## API Design

### Ticket creation (modified)

`POST /api/v1/tickets` — `TicketCreate` schema gains an optional `issues` array:

```python
issues: list[IssueCreate] = Field(default_factory=list)
```

Where `IssueCreate` is:

```python
class IssueCreate(BaseModel):
    title: str = Field(max_length=255)
    severity: SeverityEnum  # critical, high, medium, low, info
    description: str        # markdown
    fix: str                # markdown
```

The backend creates all issues in the same transaction as the ticket. `TicketResponse` gains an `issues: list[IssueResponse]` field so they're returned inline.

`IssueResponse` includes:

```python
class IssueResponse(BaseModel):
    id: UUID
    ticket_id: UUID
    ticket_title: str        # denormalized for display on Issues page
    title: str
    severity: SeverityEnum
    description: str
    fix: str
    status: IssueStatusEnum
    priority: int | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
```

`ticket_title` is populated via a join or relationship — not stored on the Issue row.

### Issue-specific endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/v1/issues` | List all issues, filterable by status, severity, priority, ticket_id | Session |
| `GET` | `/api/v1/issues/{id}` | Single issue with ticket link | Session |
| `PATCH` | `/api/v1/issues/{id}` | Update status, priority, title, description, fix | Operator/Admin |
| `POST` | `/api/v1/tickets/{id}/issues` | Add a new issue to an existing ticket | Operator/Admin |

**Promote to backlog** is a `PATCH` setting `status: "backlog"` and `priority` (1-5). No special endpoint needed.

**Filters on `GET /issues`:**

- `status` — filter by one or more statuses (default: `backlog,in_progress` for the Issues page)
- `severity` — filter by severity levels
- `priority` — filter by priority value
- `ticket_id` — show issues from a specific ticket

### Permissions

- **Viewers:** Read-only access to issues on tickets and the Issues page
- **Operators & Admins:** Promote to backlog, set priority, edit, dismiss, change status, create new issues
- **Agents (API key):** Create issues as part of ticket submission

## Frontend — Ticket Detail (Issues Section)

On the `TicketDetail` page, a new Issues section appears below the description/recommended action area. Each issue renders as a collapsible card via `IssueCard` component.

### Collapsed state

- Severity lozenge (color-coded: critical=red, high=orange, medium=yellow, low=blue, info=grey)
- Issue title
- Status badge (`identified` / `backlog` / `in_progress` / `done` / `dismissed`)

### Expanded state (click to toggle)

- Description rendered as markdown
- Fix rendered as markdown (with syntax-highlighted code blocks)
- **Action buttons** (operators/admins only):
  - "Add to Backlog" — opens a small dialog to set priority (1-5 slider), then PATCHes status to `backlog`
  - "Dismiss" — PATCHes status to `dismissed`
  - "Edit" — inline edit of title, severity, description, fix
- If already promoted: shows current priority and status, with ability to change both

### Empty state

If the ticket has no issues, show a subtle "No issues identified" message with an "Add Issue" button for operators/admins.

### Markdown rendering

Add `react-markdown` with `remark-gfm` (tables, strikethrough) and `react-syntax-highlighter` for code blocks. Extract into a shared `MarkdownRenderer` component.

## Frontend — Issues Page

A new top-level route at `/issues` with a nav item: `Dashboard | Tickets | Issues`.

### Layout

Similar to the TicketList page — a filterable table/list.

### Columns

| Column | Notes |
|--------|-------|
| Severity | Color-coded lozenge |
| Title | Clickable, navigates to issue detail |
| Status | Badge |
| Priority | 1-5 (or "—" if not yet set) |
| Originating Ticket | Link to `/tickets/{id}`, shows ticket title truncated |
| Created | Date |

### Filters

- Status (multi-select, defaults to `backlog` + `in_progress`)
- Severity (multi-select)
- Priority (range or multi-select)

### Sorting

Default by priority (highest first), then severity, then created date.

## Frontend — Issue Detail Page

Route: `/issues/{id}`

- All issue fields with markdown rendering
- Priority slider (1-5) — editable by operators/admins
- Status controls — progress through `backlog` → `in_progress` → `done`
- Link back to the originating ticket (clickable, shows ticket title)
- Edit capability for title, severity, description, fix (operators/admins)

## Files

### New Files

- `api/models/issues.py` — `IssueCreate`, `IssueUpdate`, `IssueResponse` Pydantic schemas
- `api/routes/issues.py` — Issue endpoints (`GET /issues`, `GET /issues/{id}`, `PATCH /issues/{id}`, `POST /tickets/{id}/issues`)
- `alembic/versions/xxx_add_issues_table.py` — Migration
- `frontend/src/pages/IssueList.tsx` — Issues page
- `frontend/src/pages/IssueDetail.tsx` — Issue detail page
- `frontend/src/components/IssueCard.tsx` — Collapsible issue card for ticket detail
- `frontend/src/components/MarkdownRenderer.tsx` — Shared markdown renderer (react-markdown + syntax highlighting)

### Modified Files

- `api/db/models.py` — Add `Issue` ORM model, add `issues` relationship to `Ticket`
- `api/models/enums.py` — Add `SeverityEnum`, `IssueStatusEnum`
- `api/models/tickets.py` — Add `issues` to `TicketCreate` and `TicketResponse`
- `api/routes/tickets.py` — Create child issues during ticket creation
- `api/main.py` — Mount issues router
- `frontend/src/types.ts` — Add `Issue`, `IssueListResponse` types, `Severity`, `IssueStatus`
- `frontend/src/api/client.ts` — Add issue API methods
- `frontend/src/App.tsx` — Add `/issues` and `/issues/:id` routes
- `frontend/src/components/Layout.tsx` — Add "Issues" nav item
- `frontend/src/pages/TicketDetail.tsx` — Add Issues section with issue cards
- `api/seed.py` — Add sample issues to demo tickets
- `tests/` — New tests for issue CRUD, promotion, filtering
- `docs/api/openapi.yaml` — Regenerate via `make openapi`
- `llms.txt` — Update with new files and endpoints
- `package.json` — Add `react-markdown`, `remark-gfm`, `react-syntax-highlighter`

## Out of Scope

- Issue comments/discussion thread
- Issue assignment to specific users
- Bulk promote/dismiss actions
- Issue notifications or webhooks
- Linking issues across tickets (deduplication)
- Draft/auto-save on issue editing
