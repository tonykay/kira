from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from api.models.enums import SourceEnum


class ArtifactResponse(BaseModel):
    id: UUID
    ticket_id: UUID
    filename: str
    content_type: str
    uploaded_by_source: SourceEnum
    uploaded_at: datetime

    model_config = {"from_attributes": True}
