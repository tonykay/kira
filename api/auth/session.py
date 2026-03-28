from uuid import UUID

from fastapi import HTTPException, Request

SESSION_COOKIE_NAME = "tok_jira_session"


def set_session(request: Request, user_id: UUID, username: str) -> None:
    request.session["user_id"] = str(user_id)
    request.session["username"] = username


def clear_session(request: Request) -> None:
    request.session.clear()


def get_session_user_id(request: Request) -> str:
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user_id
