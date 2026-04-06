from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from api.models.enums import IssueStatusEnum, SeverityEnum


class IssueCreate(BaseModel):
    title: str = Field(max_length=255)
    severity: SeverityEnum
    description: str
    fix: str


class IssueUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    severity: SeverityEnum | None = None
    description: str | None = None
    fix: str | None = None
    status: IssueStatusEnum | None = None
    priority: int | None = Field(default=None, ge=1, le=5)
    assigned_to: UUID | None = None


class IssueResponse(BaseModel):
    id: UUID
    ticket_id: UUID
    ticket_title: str
    title: str
    severity: SeverityEnum
    description: str
    fix: str
    status: IssueStatusEnum
    priority: int | None
    assigned_to: UUID | None
    assignee_name: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class IssueListResponse(BaseModel):
    items: list[IssueResponse]
    total: int
    page: int
    per_page: int


class IssueCommentCreate(BaseModel):
    body: str


class IssueCommentResponse(BaseModel):
    id: UUID
    issue_id: UUID
    body: str
    author_name: str
    created_at: datetime

    model_config = {"from_attributes": True}
