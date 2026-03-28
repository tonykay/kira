from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from api.auth.passwords import verify_password
from api.auth.session import clear_session, set_session
from api.core.deps import get_current_user
from api.db.models import User
from api.db.session import get_db
from api.models.auth import LoginRequest
from api.models.users import UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=UserResponse)
def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == body.username).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    set_session(request, user.id, user.username)
    return user


@router.post("/logout")
def logout(request: Request):
    clear_session(request)
    return {"detail": "Logged out"}


@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)):
    return user
