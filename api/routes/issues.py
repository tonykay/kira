from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from api.core.deps import get_current_user
from api.db.models import Issue, Ticket, User
from api.db.session import get_db
from api.models.enums import IssueStatusEnum, SeverityEnum
from api.models.issues import IssueCreate, IssueListResponse, IssueResponse, IssueUpdate

router = APIRouter(tags=["issues"])


def require_operator_or_admin(user: User = Depends(get_current_user)) -> User:
    if user.role not in ("operator", "admin"):
        raise HTTPException(status_code=403, detail="Operator or admin access required")
    return user


@router.get("/issues", response_model=IssueListResponse)
def list_issues(
    status: IssueStatusEnum | None = None,
    severity: SeverityEnum | None = None,
    priority: int | None = Query(default=None, ge=1, le=5),
    ticket_id: UUID | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(Issue).options(joinedload(Issue.ticket))
    if status:
        query = query.filter(Issue.status == status.value)
    if severity:
        query = query.filter(Issue.severity == severity.value)
    if priority is not None:
        query = query.filter(Issue.priority == priority)
    if ticket_id:
        query = query.filter(Issue.ticket_id == ticket_id)

    total = query.count()
    items = query.order_by(Issue.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

    return IssueListResponse(items=items, total=total, page=page, per_page=per_page)


@router.get("/issues/{issue_id}", response_model=IssueResponse)
def get_issue(
    issue_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    issue = db.query(Issue).options(joinedload(Issue.ticket)).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    return issue


@router.patch("/issues/{issue_id}", response_model=IssueResponse)
def update_issue(
    issue_id: UUID,
    body: IssueUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_operator_or_admin),
):
    issue = db.get(Issue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    updates = body.model_dump(exclude_unset=True)
    for field, new_value in updates.items():
        if hasattr(new_value, "value"):
            setattr(issue, field, new_value.value)
        else:
            setattr(issue, field, new_value)

    db.commit()
    db.refresh(issue)
    return issue


@router.post("/tickets/{ticket_id}/issues", response_model=IssueResponse, status_code=201)
def create_issue_on_ticket(
    ticket_id: UUID,
    body: IssueCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_operator_or_admin),
):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    issue = Issue(
        ticket_id=ticket_id,
        title=body.title,
        severity=body.severity.value,
        description=body.description,
        fix=body.fix,
    )
    db.add(issue)
    db.commit()
    db.refresh(issue)
    return issue
