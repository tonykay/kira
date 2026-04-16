# Kira — Project Instructions

## What is Kira

A lightweight ticket troubleshooting app for AIOps teams. External AI agents submit diagnostic tickets via API; human SRE operators review, validate, and action recommendations via the React dashboard. Humans can also create tickets manually via the "+ New Ticket" button (operators and admins only). The AIOps agent team is a **separate project** — Kira is a sink for their output.

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
- After structural changes (new files, renamed files, new features), update `llms.txt` at the repo root

## LLM Chat (optional)

Set these env vars to enable the AI chat assistant on ticket detail pages:

```bash
export KIRA_LLM_BASE_URL=https://api.openai.com/v1  # or vLLM, Ollama, etc.
export KIRA_LLM_API_KEY=sk-...
export KIRA_LLM_MODEL=gpt-4o
```

## Iframe Embedding (optional)

For Showroom/lab environments where Kira is displayed in a side-by-side iframe, see [docs/iframe-embedding.md](docs/iframe-embedding.md). Set `KIRA_ALLOW_IFRAME=true` and `KIRA_CORS_ORIGINS` to enable.

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


<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:ca08a54f -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd dolt push
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->
