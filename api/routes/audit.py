from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.core.deps import get_current_user_or_api_key
from api.db.models import AuditLog, Ticket, User
from api.db.session import get_db
from api.models.audit import AuditLogResponse

router = APIRouter(tags=["audit"])


@router.get("/tickets/{ticket_id}/audit", response_model=list[AuditLogResponse])
def get_ticket_audit(
    ticket_id: UUID,
    db: Session = Depends(get_db),
    auth: User | str = Depends(get_current_user_or_api_key),
):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    entries = (
        db.query(AuditLog)
        .filter(AuditLog.ticket_id == ticket_id)
        .order_by(AuditLog.timestamp.asc())
        .all()
    )
    return entries
