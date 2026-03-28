from fastapi import APIRouter

from api.models.enums import AreaEnum, RoleEnum, SourceEnum, StatusEnum

router = APIRouter(tags=["enums"])


@router.get("/enums")
def get_enums():
    return {
        "areas": [e.value for e in AreaEnum],
        "statuses": [e.value for e in StatusEnum],
        "sources": [e.value for e in SourceEnum],
        "roles": [e.value for e in RoleEnum],
    }
