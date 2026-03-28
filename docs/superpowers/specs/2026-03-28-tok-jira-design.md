# Kira — Ticket Troubleshooting App Design Spec

## Purpose

A lightweight ticket management application designed to receive and surface diagnostic output from external AIOps agent teams (e.g., LangChain Deep Agents, agentic SREs). Human SME operators use it to review, validate, and action AI-generated root cause analyses and remediation recommendations. The AIOps agent team is an entirely separate project — this app is a sink for their outputs and a management interface for human operators.

Target environment: teaching, lab, and demo scenarios. Simplicity and readability of the codebase take priority over production-scale concerns.

## Architecture

### Stack

- **Core API**: Python 3.13+, FastAPI, SQLAlchemy 2.0, Alembic, Pydantic V2
- **Frontend**: React (Vite) — optional, fully decoupled
- **Database**: PostgreSQL 16
- **Package management**: uv (not pip)
- **Repository**: monorepo

### System Boundaries

```
┌─────────────────────────┐
│  AIOps Agent Team       │  EXTERNAL — separate project
│  (LangChain/Deep Agents)│
└──────────┬──────────────┘
           │ POST /api/v1/tickets
           │ Header: X-API-Key
           ▼
┌─────────────────────────────────────────┐
│  Kira (this project)                    │
│                                         │
│  ┌──────────────────────┐               │
│  │ api/ — FastAPI Core  │               │
│  │  Routes · Models     │               │
│  │  Auth · Config       │◄──── React    │
│  └──────────┬───────────┘    frontend/  │
│             │                (optional)  │
│  ┌──────────▼───────────┐               │
│  │ PostgreSQL           │               │
│  │ Tickets · Audit Log  │               │
│  │ Users · Comments     │               │
│  └──────────────────────┘               │
│                                         │
│  ┌──────────────────────┐               │
│  │ Artifact Storage     │               │
│  │ Local FS / Volume    │               │
│  └──────────────────────┘               │
└─────────────────────────────────────────┘
```

The API is the single entry point. Agents POST tickets via API key auth. The React frontend consumes the same `/api/v1/*` endpoints using session (cookie) auth. The frontend is optional — operators could bypass it entirely and interact via API or route tickets to another system.

### Monorepo Structure

```
kira/
├── api/                    # FastAPI application
│   ├── routes/             # Endpoint handlers
│   ├── models/             # Pydantic V2 request/response schemas
│   ├── db/                 # SQLAlchemy ORM models + Alembic migrations
│   ├── auth/               # API key + password auth
│   └── core/               # Config, dependencies, artifact storage
├── frontend/               # React app (Vite)
├── deploy/                 # Dockerfiles, compose, k8s manifests
│   ├── Dockerfile.api
│   ├── Dockerfile.frontend
│   └── k8s/
├── pyproject.toml          # uv managed
└── compose.yaml            # Local dev with Podman/Docker
```

## Data Model

### Shared Enum: `AreaEnum`

Enforced at the API level. Used by both `tickets.area` and `users.expertise_area`.

Valid values: `linux`, `kubernetes`, `networking`, `database`, `storage`, `security`, `application`

Extensible by adding values to the enum definition in one place.

### tickets

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| title | varchar(255) | Required |
| description | text | Markdown — agent's analysis report |
| area | AreaEnum | Required — e.g., `linux`, `kubernetes` |
| status | StatusEnum | `open` → `acknowledged` → `in_progress` → `resolved` → `closed` |
| confidence | float (0.0–1.0) | Agent-assigned, human-adjustable |
| risk | float (0.0–1.0) | Agent-assigned, human-adjustable |
| recommended_action | text | What the agent suggests doing |
| affected_systems | text[] | List of hostnames/services/pods |
| assigned_to | FK → users | Nullable — SME self-assigns |
| created_by_source | SourceEnum | `agent` or `human` |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### audit_log

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| ticket_id | FK → tickets | |
| action | varchar(50) | e.g., `created`, `status_changed`, `risk_updated`, `comment_added` |
| actor_source | SourceEnum | `agent` or `human` |
| actor_name | varchar(100) | Username or agent identifier |
| actor_tier | varchar(50) | Nullable — e.g., `tier_3_sme`, `junior_ops` |
| old_value | jsonb | Previous state (for changes) |
| new_value | jsonb | New state |
| timestamp | timestamptz | |

### users

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| username | varchar(50) | Unique |
| password_hash | varchar | bcrypt |
| display_name | varchar(100) | |
| role | RoleEnum | `admin`, `operator`, `viewer` |
| expertise_area | AreaEnum | Nullable — their specialty area |
| tier | varchar(50) | Nullable — `tier_1`, `tier_2`, `tier_3_sme` |

### artifacts

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| ticket_id | FK → tickets | |
| filename | varchar(255) | Original filename |
| storage_path | varchar(500) | Path on filesystem |
| content_type | varchar(100) | MIME type |
| uploaded_by_source | SourceEnum | `agent` or `human` |
| uploaded_at | timestamptz | |

### comments

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| ticket_id | FK → tickets | |
| body | text | Markdown |
| author_source | SourceEnum | `agent` or `human` |
| author_name | varchar(100) | |
| created_at | timestamptz | |

## API Design — `/api/v1`

### Tickets

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/tickets` | API key | Create ticket |
| `GET` | `/tickets` | Session/API key | List tickets (filterable by area, status, risk, assigned_to) |
| `GET` | `/tickets/{id}` | Session/API key | Get ticket detail |
| `PATCH` | `/tickets/{id}` | Session | Update ticket (status, risk, confidence, assigned_to) |
| `POST` | `/tickets/{id}/comments` | Session/API key | Add comment |
| `GET` | `/tickets/{id}/comments` | Session/API key | List comments |
| `GET` | `/tickets/{id}/audit` | Session/API key | Get audit trail |

### Artifacts

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/tickets/{id}/artifacts` | API key/Session | Upload file(s) |
| `GET` | `/tickets/{id}/artifacts` | Session/API key | List artifacts |
| `GET` | `/artifacts/{id}/download` | Session/API key | Download artifact |

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/login` | None | Username/password → session cookie |
| `POST` | `/auth/logout` | Session | Clear session |
| `GET` | `/auth/me` | Session | Current user info |

### Admin

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/users` | Admin | List users |
| `POST` | `/users` | Admin | Create user |
| `GET` | `/enums` | Any | Get valid values for area, status, role, etc. |

### Webhooks (future — low priority)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/webhooks` | Admin | Register webhook URL + trigger events |
| `GET` | `/webhooks` | Admin | List registered webhooks |
| `DELETE` | `/webhooks/{id}` | Admin | Remove webhook |

### Query and Pagination

All list endpoints support pagination: `?page=1&per_page=20`

Ticket list supports filters: `?area=linux&status=open&min_risk=0.7&assigned_to=jsmith`

### Audit Behavior

Every state-changing operation on a ticket automatically creates an audit_log entry recording: what changed, old value, new value, who did it (actor_name), what type of actor (actor_source), and their tier if applicable.

## Authentication & Authorization

**Agents**: API key passed via `X-API-Key` header. The key is configured via environment variable (`KIRA_API_KEY`). Single shared key — appropriate for demo/lab use.

**Humans**: Username/password login, session stored in a server-side cookie. Passwords hashed with bcrypt.

**Roles**:
- `admin`: manage users, configure webhooks, full ticket access
- `operator`: self-assign tickets, update status/risk/confidence, add comments
- `viewer`: read-only access to tickets and audit logs

No SSO. Simple to configure and troubleshoot for teaching/demo scenarios.

## Frontend

### Technology

React with Vite. Communicates exclusively via `/api/v1/*` endpoints.

### Views

**Dashboard** (landing page):
- Summary cards: open count, in-progress count, resolved count, average confidence
- Two charts: tickets by area (bar chart), risk distribution (horizontal bar chart)
- Recent tickets table below

**Ticket List**:
- Filterable/sortable table
- Color-coded lozenges for area, risk, and confidence

**Ticket Detail**:
- Full ticket info with editable fields (status, risk, confidence, assigned_to)
- Recommended action prominently displayed
- Comments section
- Artifact list with download links
- Audit trail timeline

### Tag / Lozenge Color Scheme

**Area tags** — each area gets a distinct color:
- `linux`: purple (#7c3aed)
- `kubernetes`: blue (#2563eb)
- `networking`: cyan (#0891b2)
- `database`: green (#059669)
- `storage`: amber (#d97706)
- `security`: red (#dc2626)
- `application`: indigo (#6366f1)

**Risk lozenges** — traffic light:
- High (≥0.7): red (#ef4444)
- Medium (0.4–0.7): amber (#f59e0b)
- Low (<0.4): green (#22c55e)

**Confidence lozenges** — inverted traffic light (high confidence = good):
- High (≥0.7): green (#22c55e)
- Medium (0.4–0.7): amber (#f59e0b)
- Low (<0.4): red (#ef4444)

Lozenges display both the label and numeric value (e.g., "high 0.9").

## Deployment

### Local Development (no containers)

- API: `uv run uvicorn api.main:app --reload` on port 8000
- Frontend: `npm run dev` (Vite) on port 5173, proxied to API
- Postgres: `podman run postgres:16` on port 5432
- Config via `.env` file: `DATABASE_URL`, `KIRA_API_KEY`, `SECRET_KEY`

### Local with Compose

`compose.yaml` runs three services:
- `api`: Python 3.13, FastAPI, port 8000
- `frontend`: Node build → nginx, port 3000
- `postgres`: PostgreSQL 16, port 5432

Artifact storage: bind mount to `./artifacts/`
Postgres data: named volume

### Kubernetes

Plain manifests in `deploy/k8s/` (no Helm — readability for teaching):
- Deployment + Service for api
- Deployment + Service for frontend
- Deployment + Service + PVC for postgres
- ConfigMap for environment variables
- Secret for credentials (API key, DB password, secret key)
- PVC for artifact storage

### Container Builds

- `deploy/Dockerfile.api`: multi-stage, Python 3.13 base, uv install
- `deploy/Dockerfile.frontend`: Node build stage → nginx serve stage

### Database Migrations

Alembic managed. In local dev, migrations run automatically on API startup. For containerized/k8s deployment: init container or manual `alembic upgrade head`.

## Webhooks (future — low priority)

Event-driven outbound notifications. Stub the webhook registration table and API endpoints in the initial build but defer the dispatcher implementation.

Planned trigger events: `ticket.created`, `ticket.status_changed`, `ticket.risk_changed`

Use case: notify a ChatOps channel (Slack, Rocket.Chat) on ticket creation or status change.

## Out of Scope

- The AIOps agent team (separate project)
- SSO / OAuth / LDAP
- Horizontal scaling, load balancing, HA
- Email notifications
- Real-time updates (WebSocket) — polling is sufficient for demo scale
- Internationalization
