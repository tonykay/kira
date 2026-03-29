# Kira Security Assessment Report

**Date:** 2026-03-29
**Commit:** `d681eab`
**Assessed by:** Claude Opus 4.6 (automated review)
**Scope:** Full codebase — backend, frontend, deployment configs, Helm chart
**Context:** Kira is designed for teaching, lab, and demo environments. Several findings are acceptable risks in that context but are flagged for awareness if the application is ever used in production.

---

## Executive Summary

| Severity | Count |
|----------|-------|
| Critical | 3 |
| High | 6 |
| Medium | 5 |
| Low | 5 |
| Info | 3 |

The application has a sound architecture but lacks several production security controls. The most impactful findings relate to session cookie configuration, hardcoded default credentials, and missing input validation boundaries. Many findings are acceptable for the stated demo/teaching use case but should be addressed before any production deployment.

---

## Critical Findings

### C1. Session Cookies Missing Security Flags

**File:** `api/main.py:31`
**Risk:** Session hijacking via XSS

```python
app.add_middleware(SessionMiddleware, secret_key=settings.secret_key)
```

SessionMiddleware is configured without `httponly`, `secure`, or `same_site` flags. Session cookies are accessible to JavaScript and transmitted over HTTP.

**Recommendation:**
```python
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.secret_key,
    https_only=True,    # only send over HTTPS
    same_site="lax",    # CSRF protection
)
```

Note: Starlette's SessionMiddleware cookies are already httpOnly by default. The `https_only` flag should be configurable via env var for local dev.

**Demo context:** Acceptable for local dev. Should be fixed for any networked deployment.

---

### C2. Hardcoded Default Secrets

**Files:** `api/core/config.py:6-7`, `deploy/k8s/secret.yaml`, `deploy/helm/kira/values.yaml:49-50`

Default API key (`dev-api-key`) and secret key are committed to the repository. Kubernetes secret uses `stringData` (plaintext). Helm values contain the same defaults.

**Recommendation:** These are intentional for demo use — documented in README and CLAUDE.md. For production:
- Remove defaults, require explicit configuration
- Use external secret management (Vault, sealed-secrets)
- The k8s `stringData` is fine — Kubernetes base64-encodes it at rest

**Demo context:** Acceptable and intentional. Clearly documented as dev defaults.

---

### C3. LLM Error Responses Forwarded to Client

**File:** `api/routes/chat.py:136`

```python
error_body = response.read().decode()
yield f"data: {json.dumps({'error': error_body})}\n\n"
```

If the LLM endpoint returns an error, the full error body (which could contain internal details about the LLM infrastructure) is forwarded to the client.

**Recommendation:** Sanitize error responses:
```python
yield f"data: {json.dumps({'error': 'LLM request failed'})}\n\n"
```

---

## High Findings

### H1. Path Traversal Risk in Artifact Download

**Files:** `api/services/artifacts.py:16-17`, `api/routes/artifacts.py:62-76`

The `read_artifact` function reads any path stored in the database without validating it's within the artifact directory.

**Recommendation:** Add path validation:
```python
def read_artifact(storage_path: str) -> bytes:
    file_path = Path(storage_path).resolve()
    allowed_dir = Path(settings.artifact_storage_path).resolve()
    if not str(file_path).startswith(str(allowed_dir)):
        raise ValueError("Invalid artifact path")
    return file_path.read_bytes()
```

**Current mitigation:** The storage_path is generated server-side with UUID prefixes in `save_artifact()`, so external users cannot inject paths directly. Risk is from database-level compromise only.

---

### H2. No Input Length Limits on Comments and Chat

**Files:** `api/models/comments.py:10`, `api/models/chat.py:8`

Comment body and chat message have no `max_length` constraint. An attacker could submit arbitrarily large payloads.

**Recommendation:**
```python
class CommentCreate(BaseModel):
    body: str = Field(min_length=1, max_length=10000)

class ChatSendRequest(BaseModel):
    message: str = Field(min_length=1, max_length=5000)
```

---

### H3. Weak Password Policy

**File:** `api/models/users.py:10`

Minimum password length is 6 characters with no complexity requirements.

**Recommendation:** Increase to 8+ characters for demo use. For production, enforce 12+ with complexity rules.

**Demo context:** Acceptable — seed passwords are intentionally simple for teaching.

---

### H4. CORS Allow-All Methods and Headers

**File:** `api/main.py:49-57`

When CORS is enabled, `allow_methods=["*"]` and `allow_headers=["*"]` are overly permissive.

**Recommendation:**
```python
allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
allow_headers=["Content-Type", "X-API-Key"],
```

---

### H5. No Rate Limiting

**Files:** `api/routes/auth.py`, `api/routes/chat.py`

No rate limiting on login (brute force), chat (LLM quota exhaustion), or ticket creation (spam).

**Recommendation:** Add `slowapi` or similar rate limiting middleware. Priority endpoints: login (5/min), chat send (20/min), ticket create (50/min).

**Demo context:** Low risk in controlled environments. Should be added for any public-facing deployment.

---

### H6. Session Fixation

**File:** `api/routes/auth.py:15-21`

Session is not cleared before setting new credentials on login. An attacker who obtains a pre-login session ID could hijack the session after the victim logs in.

**Recommendation:** Clear the session before setting new credentials:
```python
request.session.clear()
set_session(request, user.id, user.username)
```

---

## Medium Findings

### M1. No Ticket-Level Access Control

**File:** `api/routes/tickets.py:92-132`

Any authenticated user can update any ticket (status, risk, confidence, skills). No check for assignee or role-based field restrictions.

**Demo context:** Intentional — operators self-assign and manage tickets freely in demo scenarios.

---

### M2. Dashboard Loads All Tickets into Memory

**File:** `api/routes/dashboard.py:16-26`

`db.query(Ticket).all()` loads every ticket. With many tickets, this causes memory and performance issues.

**Recommendation:** Use database aggregation queries. Acceptable for demo scale (<100 tickets).

---

### M3. Artifact Access Not Scoped to User

**File:** `api/routes/artifacts.py`

Any authenticated user or API key holder can download any artifact. No ownership verification.

**Demo context:** Acceptable — all users collaborate on all tickets in demo scenarios.

---

### M4. `assigned_to` Filter is Username String, Not UUID

**File:** `api/routes/tickets.py:67`

The `assigned_to` query param is a raw string joined to a User query. Not a security vulnerability (SQLAlchemy parameterizes), but inconsistent with the UUID type used elsewhere.

---

### M5. Chat History Accessible Only by User ID, No Admin Override

**File:** `api/routes/chat.py:76-89`

Chat history is scoped per-user per-ticket. Admins cannot view other users' chat history for auditing purposes.

**Demo context:** Acceptable. For production, add admin access to chat histories.

---

## Low Findings

### L1. Missing Security Headers

**File:** `api/main.py`

Missing `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`. The frame headers (`X-Frame-Options`, `Content-Security-Policy`) are handled.

### L2. No HSTS Header

No `Strict-Transport-Security` header for HTTPS enforcement.

### L3. No File Upload Content-Type Validation

**File:** `api/routes/artifacts.py:28-29`

No whitelist of allowed MIME types for uploaded files.

### L4. Auth Events Not Audited

Login, logout, failed login attempts are not recorded in the audit log. Only ticket changes are audited.

### L5. Database Connection Pool Not Configured

**File:** `api/db/session.py:6`

Engine created without `pool_pre_ping`, `pool_size`, or `pool_recycle` settings.

---

## Informational

### I1. Password Hashing is Sound

`api/auth/passwords.py` uses bcrypt with auto-generated salts. This is a strong choice.

### I2. SQL Injection Protection is Good

All database queries use SQLAlchemy ORM with parameterized queries. No raw SQL or string interpolation found.

### I3. API Key Comparison is Timing-Safe Concern

**File:** `api/auth/api_key.py:11`

```python
if api_key and api_key == settings.api_key:
```

String comparison is not constant-time, theoretically enabling timing attacks. In practice, this is negligible risk for a single shared API key in a demo context. For production, use `hmac.compare_digest()`.

---

## Recommendations by Priority

### Immediate (before any networked deployment)

1. Add `same_site` and `https_only` to SessionMiddleware (C1)
2. Sanitize LLM error responses (C3)
3. Add path validation to artifact download (H1)
4. Add max_length to comment and chat message bodies (H2)
5. Clear session before login (H6)
6. Restrict CORS methods/headers (H4)

### Before Production Use

7. Implement rate limiting (H5)
8. Strengthen password policy (H3)
9. Add security headers (L1, L2)
10. Add file upload content-type validation (L3)
11. Audit auth events (L4)
12. Configure database connection pool (L5)
13. Use `hmac.compare_digest` for API key comparison (I3)

### Acceptable for Demo/Teaching Context

- Hardcoded default secrets (C2) — intentional, documented
- No ticket-level access control (M1) — intentional for demo
- Dashboard loading all tickets (M2) — acceptable at demo scale
- No artifact access scoping (M3) — acceptable for demo
- Simple seed passwords (H3) — intentional for teaching
