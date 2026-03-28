from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel

from api.models.enums import SourceEnum


class AuditLogResponse(BaseModel):
    id: UUID
    ticket_id: UUID
    action: str
    actor_source: SourceEnum
    actor_name: str
    actor_tier: str | None
    old_value: dict[str, Any] | None
    new_value: dict[str, Any] | None
    timestamp: datetime

    model_config = {"from_attributes": True}
