# Security Hardening Checklist

Items from the [security assessment report](security-assessment-report.md) (2026-03-29, commit `d681eab`), prioritized for action.

## Before Any Networked Deployment

- [ ] **Session cookie flags** — add `same_site="lax"` and configurable `https_only` to SessionMiddleware (`api/main.py`)
- [ ] **Sanitize LLM errors** — don't forward raw LLM error bodies to client (`api/routes/chat.py:136`)
- [ ] **Artifact path validation** — verify resolved path is within artifact directory before reading (`api/services/artifacts.py`)
- [ ] **Input length limits** — add `max_length` to comment body and chat message (`api/models/comments.py`, `api/models/chat.py`)
- [ ] **Session fixation** — clear session before setting new credentials on login (`api/routes/auth.py`)
- [ ] **CORS method/header restriction** — replace `["*"]` with explicit allowed methods and headers (`api/main.py`)

## Before Production Use

- [ ] **Rate limiting** — add `slowapi` or equivalent on login, chat send, ticket create
- [ ] **Password policy** — increase minimum length, consider complexity rules (`api/models/users.py`)
- [ ] **Security headers** — add `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` middleware
- [ ] **HSTS** — add `Strict-Transport-Security` header for HTTPS deployments
- [ ] **File upload validation** — whitelist allowed MIME types for artifact uploads
- [ ] **Audit auth events** — log login, logout, failed attempts to audit trail
- [ ] **DB connection pool** — configure `pool_pre_ping`, `pool_size`, `pool_recycle` on engine
- [ ] **Timing-safe API key comparison** — use `hmac.compare_digest()` instead of `==`

## Accepted Risks (Demo/Teaching Context)

These are intentional design decisions for the demo use case and do not need fixing:

- Hardcoded default secrets (`dev-api-key`, etc.) — documented, expected to be overridden
- No ticket-level access control — operators freely manage all tickets
- Simple seed passwords (`admin123`, `password`) — intentional for teaching
- Dashboard loads all tickets into memory — acceptable at demo scale
- No artifact access scoping by user — all users collaborate on all tickets
- Chat history not accessible to admins — per-user privacy in demo context
