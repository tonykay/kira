from fastapi import APIRouter, Depends

from api.core.deps import get_current_user_or_api_key

router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.get("")
def list_tickets(auth: str | object = Depends(get_current_user_or_api_key)):
    """Stub endpoint for testing authentication."""
    return {"tickets": []}
