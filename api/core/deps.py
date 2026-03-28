from uuid import UUID

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from api.auth.api_key import api_key_header
from api.auth.session import get_session_user_id
from api.core.config import settings
from api.db.models import User
from api.db.session import get_db


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    user_id_str = get_session_user_id(request)
    user_id = UUID(user_id_str)
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def get_current_user_or_api_key(
    request: Request,
    db: Session = Depends(get_db),
    api_key: str | None = Depends(api_key_header),
) -> User | str:
    """Returns a User for session auth, or 'api_key' string for API key auth."""
    if api_key and api_key == settings.api_key:
        return "api_key"
    try:
        return get_current_user(request, db)
    except HTTPException:
        raise HTTPException(status_code=401, detail="Authentication required")


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
