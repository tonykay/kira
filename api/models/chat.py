from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class ChatSendRequest(BaseModel):
    message: str
    include_context: bool = True
    model: str | None = None


class ChatMessageResponse(BaseModel):
    id: UUID
    ticket_id: UUID
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatInfoResponse(BaseModel):
    enabled: bool
    model: str | None = None
    models: list[str] = []
