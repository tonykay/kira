from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.core.deps import get_current_user_or_api_key
from api.db.models import Comment, Ticket, User
from api.db.session import get_db
from api.models.comments import CommentCreate, CommentResponse
from api.services.audit import create_audit_entry

router = APIRouter(tags=["comments"])


@router.post("/tickets/{ticket_id}/comments", response_model=CommentResponse, status_code=201)
def add_comment(
    ticket_id: UUID,
    body: CommentCreate,
    db: Session = Depends(get_db),
    auth: User | str = Depends(get_current_user_or_api_key),
):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if isinstance(auth, User):
        author_source = body.source.value
        author_name = auth.username
    else:
        author_source = "agent"
        author_name = "api_agent"

    comment = Comment(
        ticket_id=ticket_id,
        body=body.body,
        author_source=author_source,
        author_name=author_name,
    )
    db.add(comment)

    create_audit_entry(
        db, ticket_id, "comment_added", auth,
        new_value={"body": body.body[:100]},
    )
    db.commit()
    db.refresh(comment)
    return comment


@router.get("/tickets/{ticket_id}/comments", response_model=list[CommentResponse])
def list_comments(
    ticket_id: UUID,
    db: Session = Depends(get_db),
    auth: User | str = Depends(get_current_user_or_api_key),
):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return (
        db.query(Comment)
        .filter(Comment.ticket_id == ticket_id)
        .order_by(Comment.created_at.asc())
        .all()
    )
