from fastapi import HTTPException, Security
from fastapi.security import APIKeyHeader

from api.core.config import settings

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def verify_api_key(api_key: str | None = Security(api_key_header)) -> str:
    if api_key and api_key == settings.api_key:
        return api_key
    raise HTTPException(status_code=401, detail="Invalid API key")
