from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from api.core.config import settings
from api.routes import artifacts, auth, audit, chat, comments, dashboard, enums, issues, tickets, users, webhooks

app = FastAPI(
    title="Kira",
    version="0.1.0",
    description="A lightweight ticket troubleshooting API for AIOps teams. "
    "External AI agents submit diagnostic tickets; human SRE operators review, validate, and action recommendations.",
    contact={"name": "tonykay", "url": "https://github.com/tonykay/kira"},
    license_info={"name": "MIT"},
    openapi_tags=[
        {"name": "auth", "description": "Authentication — login, logout, session info"},
        {"name": "tickets", "description": "Ticket CRUD with filtering and pagination"},
        {"name": "issues", "description": "Issue tracking — code quality findings from ticket analysis"},
        {"name": "comments", "description": "Comments on tickets"},
        {"name": "artifacts", "description": "File attachments on tickets"},
        {"name": "audit", "description": "Audit trail for ticket changes"},
        {"name": "users", "description": "User management (admin only)"},
        {"name": "dashboard", "description": "Dashboard statistics"},
        {"name": "enums", "description": "Valid values for areas, statuses, roles"},
        {"name": "webhooks", "description": "Webhook registration (dispatcher not yet implemented)"},
        {"name": "chat", "description": "AI chat assistant with streaming LLM proxy"},
    ],
)
app.add_middleware(SessionMiddleware, secret_key=settings.secret_key)


# --- Iframe and CORS support ---
class FrameHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        if settings.allow_iframe:
            response.headers["X-Frame-Options"] = "ALLOWALL"
            response.headers["Content-Security-Policy"] = "frame-ancestors *"
        else:
            response.headers["X-Frame-Options"] = "DENY"
            response.headers["Content-Security-Policy"] = "frame-ancestors 'none'"
        return response


app.add_middleware(FrameHeadersMiddleware)

if settings.allow_iframe and settings.cors_origins:
    origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


app.include_router(auth.router, prefix="/api/v1")
app.include_router(enums.router, prefix="/api/v1")
app.include_router(tickets.router, prefix="/api/v1")
app.include_router(issues.router, prefix="/api/v1")
app.include_router(audit.router, prefix="/api/v1")
app.include_router(comments.router, prefix="/api/v1")
app.include_router(artifacts.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(webhooks.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
