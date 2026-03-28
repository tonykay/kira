from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.core.deps import require_admin
from api.db.models import User, Webhook
from api.db.session import get_db
from api.models.webhooks import WebhookCreate, WebhookResponse

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("", response_model=WebhookResponse, status_code=201)
def register_webhook(
    body: WebhookCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    webhook = Webhook(url=body.url, events=body.events)
    db.add(webhook)
    db.commit()
    db.refresh(webhook)
    return webhook


@router.get("", response_model=list[WebhookResponse])
def list_webhooks(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    return db.query(Webhook).all()


@router.delete("/{webhook_id}", status_code=204)
def delete_webhook(
    webhook_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    webhook = db.get(Webhook, webhook_id)
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    db.delete(webhook)
    db.commit()
