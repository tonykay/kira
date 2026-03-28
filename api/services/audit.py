from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from api.db.models import AuditLog, User


def create_audit_entry(
    db: Session,
    ticket_id: UUID,
    action: str,
    actor: User | str,
    old_value: dict[str, Any] | None = None,
    new_value: dict[str, Any] | None = None,
) -> AuditLog:
    if isinstance(actor, User):
        actor_source = "human"
        actor_name = actor.username
        actor_tier = actor.tier
    else:
        actor_source = "agent"
        actor_name = actor
        actor_tier = None

    entry = AuditLog(
        ticket_id=ticket_id,
        action=action,
        actor_source=actor_source,
        actor_name=actor_name,
        actor_tier=actor_tier,
        old_value=old_value,
        new_value=new_value,
    )
    db.add(entry)
    return entry
