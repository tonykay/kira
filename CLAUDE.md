# Kira — Project Instructions

## What is Kira

A lightweight ticket troubleshooting app for AIOps teams. External AI agents submit diagnostic tickets via API; human SRE operators review, validate, and action recommendations via the React dashboard. The AIOps agent team is a **separate project** — Kira is a sink for their output.

## Tech Stack

- **Backend:** Python 3.13+, FastAPI, SQLAlchemy 2.0, Alembic, Pydantic V2
- **Frontend:** React 19, Vite, TypeScript, Recharts
- **Database:** PostgreSQL 16
- **Package management:** uv (never pip)
- **Deployment:** Compose, plain k8s manifests, Helm chart, ArgoCD

## Running Locally

```bash
# Start Postgres
podman run -d --name kira-postgres \
  -e POSTGRES_USER=kira -e POSTGRES_PASSWORD=kira -e POSTGRES_DB=kira \
  -p 5432:5432 postgres:16

# Backend
uv sync
uv run alembic upgrade head
uv run python -m api.seed        # demo data
uv run uvicorn api.main:app --reload --port 8000

# Frontend
cd frontend && npm install && npm run dev
```

## Running Tests

```bash
uv run pytest tests/ -v           # 44 tests, uses SQLite in-memory
cd frontend && npm run build      # TypeScript check + build
```

## Key Conventions

- Always use Pydantic V2 for structured outputs (from_attributes, not orm_mode)
- Environment variables prefixed with `KIRA_`
- ORM uses JSON type (not ARRAY) for list columns — SQLite compatibility for tests
- Area values enforced via `AreaEnum` — shared between tickets and users
- Skills are freeform but normalized (lowercase, trimmed, deduplicated)
- All ticket state changes create audit log entries automatically
- Frontend uses inline styles with CSS custom properties (`var(--kira-*)`) for theming
- After any API changes (new endpoints, schema changes), regenerate the OpenAPI spec: `make openapi`

## LLM Chat (optional)

Set these env vars to enable the AI chat assistant on ticket detail pages:

```bash
export KIRA_LLM_BASE_URL=https://api.openai.com/v1  # or vLLM, Ollama, etc.
export KIRA_LLM_API_KEY=sk-...
export KIRA_LLM_MODEL=gpt-4o
```

## Common Gotcha

If login fails after a Postgres container restart, the database was likely recreated empty:

```bash
uv run alembic upgrade head
uv run python -m api.seed
```

## Demo Credentials

| Username | Password | Role | Expertise |
|----------|----------|------|-----------|
| admin | admin123 | admin | — |
| jsmith | password | operator | kubernetes |
| akhan | password | operator | linux |
| viewer | password | viewer | — |

## API Key

Default agent API key: `dev-api-key` (header: `X-API-Key`)
