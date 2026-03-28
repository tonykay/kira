import uuid
from pathlib import Path

from api.core.config import settings


def save_artifact(ticket_id: uuid.UUID, filename: str, content: bytes) -> str:
    ticket_dir = Path(settings.artifact_storage_path) / str(ticket_id)
    ticket_dir.mkdir(parents=True, exist_ok=True)
    safe_filename = f"{uuid.uuid4().hex}_{filename}"
    file_path = ticket_dir / safe_filename
    file_path.write_bytes(content)
    return str(file_path)


def read_artifact(storage_path: str) -> bytes:
    return Path(storage_path).read_bytes()
