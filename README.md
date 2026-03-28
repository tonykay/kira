# Kira

A lightweight ticket troubleshooting application designed for AIOps teams. External AI agents (e.g., LangChain Deep Agents, agentic SREs) perform root cause analysis and submit diagnostic tickets via API. Human SME operators review, validate, and action the recommendations through an optional React dashboard.

## Architecture

```
AIOps Agent Team (external)
        │
        │  POST /api/v1/tickets
        │  Header: X-API-Key
        ▼
┌──────────────────────────┐
│  Kira                    │
│  ┌────────────────────┐  │
│  │ FastAPI Core (api/) │◄─── React Frontend (optional)
│  └────────┬───────────┘  │
│  ┌────────▼───────────┐  │
│  │ PostgreSQL         │  │
│  └────────────────────┘  │
│  ┌────────────────────┐  │
│  │ Artifact Storage   │  │
│  └────────────────────┘  │
└──────────────────────────┘
```

- **Core API**: Python 3.13+, FastAPI, SQLAlchemy 2.0, Pydantic V2
- **Frontend**: React (Vite) — optional, fully decoupled
- **Database**: PostgreSQL 16
- **Package management**: uv

## Prerequisites

- Python 3.13+
- [uv](https://docs.astral.sh/uv/)
- Node.js 20+ (for frontend only)
- Podman or Docker (for PostgreSQL)

## Getting Started

### 1. Start PostgreSQL

```bash
podman run -d --name kira-postgres \
  -e POSTGRES_USER=kira \
  -e POSTGRES_PASSWORD=kira \
  -e POSTGRES_DB=kira \
  -p 5432:5432 \
  postgres:16
```

### 2. Install dependencies and run migrations

```bash
uv sync
uv run alembic upgrade head
```

### 3. Seed demo data (optional)

```bash
uv run python -m api.seed
```

Creates 4 users and 5 sample tickets:

| Username | Password   | Role     | Expertise  |
|----------|------------|----------|------------|
| admin    | admin123   | admin    | —          |
| jsmith   | password   | operator | kubernetes |
| akhan    | password   | operator | linux      |
| viewer   | password   | viewer   | —          |

### 4. Start the API

```bash
uv run uvicorn api.main:app --reload --port 8000
```

API docs available at http://localhost:8000/api/v1/docs

### 5. Start the frontend (optional)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 and log in.

## API Usage

### Create a ticket (agent)

```bash
curl -X POST http://localhost:8000/api/v1/tickets \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-api-key" \
  -d '{
    "title": "OOM kills on payment-service pod",
    "description": "Root cause analysis details...",
    "area": "kubernetes",
    "confidence": 0.92,
    "risk": 0.8,
    "recommended_action": "Increase memory limits from 512Mi to 1Gi",
    "affected_systems": ["payment-service-7d4b8c"],
    "source": "agent"
  }'
```

### List tickets

```bash
curl http://localhost:8000/api/v1/tickets \
  -H "X-API-Key: dev-api-key"
```

Supports filters: `?area=linux&status=open&min_risk=0.7`

### Available areas

`linux`, `kubernetes`, `networking`, `database`, `storage`, `security`, `application`

### Ticket statuses

`open` → `acknowledged` → `in_progress` → `resolved` → `closed`

## Configuration

All configuration via environment variables (prefix `KIRA_`):

| Variable | Default | Description |
|----------|---------|-------------|
| `KIRA_DATABASE_URL` | `postgresql://kira:kira@localhost:5432/kira` | PostgreSQL connection string |
| `KIRA_API_KEY` | `dev-api-key` | API key for agent authentication |
| `KIRA_SECRET_KEY` | `dev-secret-key-change-in-production` | Session signing key |
| `KIRA_ARTIFACT_STORAGE_PATH` | `./artifacts` | Local path for uploaded artifacts |

Copy `.env.example` to `.env` to override defaults.

## Running with Compose

```bash
podman compose up --build
```

Services:
- API: http://localhost:8000
- Frontend: http://localhost:3000
- PostgreSQL: localhost:5432

## Deploying to Kubernetes

```bash
kubectl apply -f deploy/k8s/namespace.yaml
kubectl apply -f deploy/k8s/configmap.yaml
kubectl apply -f deploy/k8s/secret.yaml
kubectl apply -f deploy/k8s/postgres.yaml
kubectl apply -f deploy/k8s/api.yaml
kubectl apply -f deploy/k8s/frontend.yaml
```

Frontend accessible on NodePort 30300.

## Testing

```bash
uv run pytest tests/ -v
```

## Project Structure

```
kira/
├── api/                    # FastAPI application
│   ├── routes/             # API endpoints
│   ├── models/             # Pydantic V2 schemas
│   ├── db/                 # SQLAlchemy ORM + Alembic migrations
│   ├── auth/               # API key + session auth
│   ├── services/           # Audit log, artifact storage
│   └── core/               # Config, dependency injection
├── frontend/               # React (Vite) dashboard
├── deploy/                 # Dockerfiles, nginx, k8s manifests
├── tests/                  # pytest test suite
├── compose.yaml            # Local container orchestration
└── pyproject.toml          # uv-managed Python project
```
