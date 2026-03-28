from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware

from api.core.config import settings
from api.routes import auth, audit, enums, tickets

app = FastAPI(title="tok-jira", version="0.1.0")
app.add_middleware(SessionMiddleware, secret_key=settings.secret_key)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(enums.router, prefix="/api/v1")
app.include_router(tickets.router, prefix="/api/v1")
app.include_router(audit.router, prefix="/api/v1")
