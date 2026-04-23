from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from api.models.enums import AreaEnum, SourceEnum, StageEnum, StatusEnum
from api.models.issues import IssueCreate, IssueResponse


class TicketCreate(BaseModel):
    title: str = Field(max_length=255)
    description: str
    area: AreaEnum
    confidence: float = Field(ge=0.0, le=1.0)
    risk: float = Field(ge=0.0, le=1.0)
    stage: StageEnum = StageEnum.UNKNOWN
    recommended_action: str
    affected_systems: list[str] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    source: SourceEnum = SourceEnum.AGENT
    agent_name: str | None = None
    model_name: str | None = None
    temperature: float | None = None
    issues: list[IssueCreate] = Field(default_factory=list)


class TicketUpdate(BaseModel):
    status: StatusEnum | None = None
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    risk: float | None = Field(default=None, ge=0.0, le=1.0)
    stage: StageEnum | None = None
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
    stage: StageEnum
    recommended_action: str
    affected_systems: list[str]
    skills: list[str]
    assigned_to: UUID | None
    created_by_source: SourceEnum
    agent_name: str | None = None
    model_name: str | None = None
    temperature: float | None = None
    created_at: datetime
    updated_at: datetime
    issues: list[IssueResponse] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class TicketListResponse(BaseModel):
    items: list[TicketResponse]
    total: int
    page: int
    per_page: int
