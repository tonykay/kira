from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from api.core.deps import get_current_user, get_current_user_or_api_key
from api.db.models import Ticket, User
from api.db.session import get_db
from api.models.enums import AreaEnum, StatusEnum
from api.models.tickets import TicketCreate, TicketListResponse, TicketResponse, TicketUpdate
from api.services.audit import create_audit_entry

router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.post("", response_model=TicketResponse, status_code=201)
def create_ticket(
    body: TicketCreate,
    db: Session = Depends(get_db),
    auth: User | str = Depends(get_current_user_or_api_key),
):
    ticket = Ticket(
        title=body.title,
        description=body.description,
        area=body.area.value,
        confidence=body.confidence,
        risk=body.risk,
        recommended_action=body.recommended_action,
        affected_systems=body.affected_systems,
        created_by_source=body.source.value,
    )
    db.add(ticket)
    db.flush()

    actor = auth if isinstance(auth, User) else "api_agent"
    create_audit_entry(
        db,
        ticket_id=ticket.id,
        action="created",
        actor=actor,
        new_value={"title": ticket.title, "area": ticket.area, "risk": ticket.risk, "confidence": ticket.confidence},
    )
    db.commit()
    db.refresh(ticket)
    return ticket


@router.get("", response_model=TicketListResponse)
def list_tickets(
    area: AreaEnum | None = None,
    status: StatusEnum | None = None,
    min_risk: float | None = None,
    assigned_to: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    auth: User | str = Depends(get_current_user_or_api_key),
):
    query = db.query(Ticket)
    if area:
        query = query.filter(Ticket.area == area.value)
    if status:
        query = query.filter(Ticket.status == status.value)
    if min_risk is not None:
        query = query.filter(Ticket.risk >= min_risk)
    if assigned_to:
        query = query.join(User, Ticket.assigned_to == User.id).filter(User.username == assigned_to)

    total = query.count()
    items = query.order_by(Ticket.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

    return TicketListResponse(items=items, total=total, page=page, per_page=per_page)


@router.get("/{ticket_id}", response_model=TicketResponse)
def get_ticket(
    ticket_id: UUID,
    db: Session = Depends(get_db),
    auth: User | str = Depends(get_current_user_or_api_key),
):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@router.patch("/{ticket_id}", response_model=TicketResponse)
def update_ticket(
    ticket_id: UUID,
    body: TicketUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    updates = body.model_dump(exclude_unset=True)
    for field, new_value in updates.items():
        old_value = getattr(ticket, field)
        if field == "assigned_to":
            old_value = str(old_value) if old_value else None
            new_value_str = str(new_value) if new_value else None
            setattr(ticket, field, new_value)
            create_audit_entry(
                db, ticket.id, f"{field}_changed", user,
                old_value={field: old_value}, new_value={field: new_value_str},
            )
        else:
            setattr(ticket, field, new_value.value if hasattr(new_value, "value") else new_value)
            create_audit_entry(
                db, ticket.id, f"{field}_changed", user,
                old_value={field: str(old_value)},
                new_value={field: str(new_value.value if hasattr(new_value, "value") else new_value)},
            )

    db.commit()
    db.refresh(ticket)
    return ticket
