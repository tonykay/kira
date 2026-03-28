from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from api.models.enums import AreaEnum, SourceEnum, StatusEnum


class TicketCreate(BaseModel):
    title: str = Field(max_length=255)
    description: str
    area: AreaEnum
    confidence: float = Field(ge=0.0, le=1.0)
    risk: float = Field(ge=0.0, le=1.0)
    recommended_action: str
    affected_systems: list[str] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    source: SourceEnum = SourceEnum.AGENT


class TicketUpdate(BaseModel):
    status: StatusEnum | None = None
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    risk: float | None = Field(default=None, ge=0.0, le=1.0)
    assigned_to: UUID | None = None
    skills: list[str] | None = None


class TicketResponse(BaseModel):
    id: UUID
    title: str
    description: str
    area: AreaEnum
    status: StatusEnum
    confidence: float
    risk: float
    recommended_action: str
    affected_systems: list[str]
    skills: list[str]
    assigned_to: UUID | None
    created_by_source: SourceEnum
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TicketListResponse(BaseModel):
    items: list[TicketResponse]
    total: int
    page: int
    per_page: int
