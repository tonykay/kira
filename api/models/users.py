from uuid import UUID

from pydantic import BaseModel, Field

from api.models.enums import AreaEnum, RoleEnum


class UserCreate(BaseModel):
    username: str = Field(max_length=50)
    password: str = Field(min_length=6)
    display_name: str = Field(max_length=100)
    role: RoleEnum = RoleEnum.OPERATOR
    expertise_area: AreaEnum | None = None
    tier: str | None = None


class UserResponse(BaseModel):
    id: UUID
    username: str
    display_name: str
    role: RoleEnum
    expertise_area: AreaEnum | None
    tier: str | None

    model_config = {"from_attributes": True}
