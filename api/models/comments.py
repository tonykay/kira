from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from api.models.enums import SourceEnum


class CommentCreate(BaseModel):
    body: str
    source: SourceEnum = SourceEnum.HUMAN


class CommentResponse(BaseModel):
    id: UUID
    ticket_id: UUID
    body: str
    author_source: SourceEnum
    author_name: str
    created_at: datetime

    model_config = {"from_attributes": True}
