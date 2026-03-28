from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class WebhookCreate(BaseModel):
    url: str = Field(max_length=500)
    events: list[str] = Field(
        description="Events to trigger on: ticket.created, ticket.status_changed, ticket.risk_changed"
    )


class WebhookResponse(BaseModel):
    id: UUID
    url: str
    events: list[str]
    created_at: datetime

    model_config = {"from_attributes": True}
