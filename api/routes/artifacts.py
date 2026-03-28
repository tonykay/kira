from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

from api.core.deps import get_current_user_or_api_key
from api.db.models import Artifact, Ticket, User
from api.db.session import get_db
from api.models.artifacts import ArtifactResponse
from api.services.artifacts import read_artifact, save_artifact
from api.services.audit import create_audit_entry

router = APIRouter(tags=["artifacts"])


@router.post("/tickets/{ticket_id}/artifacts", response_model=ArtifactResponse, status_code=201)
async def upload_artifact(
    ticket_id: UUID,
    file: UploadFile,
    db: Session = Depends(get_db),
    auth: User | str = Depends(get_current_user_or_api_key),
):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    content = await file.read()
    storage_path = save_artifact(ticket_id, file.filename, content)
    source = "human" if isinstance(auth, User) else "agent"

    artifact = Artifact(
        ticket_id=ticket_id,
        filename=file.filename,
        storage_path=storage_path,
        content_type=file.content_type or "application/octet-stream",
        uploaded_by_source=source,
    )
    db.add(artifact)

    create_audit_entry(
        db, ticket_id, "artifact_uploaded", auth,
        new_value={"filename": file.filename},
    )
    db.commit()
    db.refresh(artifact)
    return artifact


@router.get("/tickets/{ticket_id}/artifacts", response_model=list[ArtifactResponse])
def list_artifacts(
    ticket_id: UUID,
    db: Session = Depends(get_db),
    auth: User | str = Depends(get_current_user_or_api_key),
):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return db.query(Artifact).filter(Artifact.ticket_id == ticket_id).all()


@router.get("/artifacts/{artifact_id}/download")
def download_artifact(
    artifact_id: UUID,
    db: Session = Depends(get_db),
    auth: User | str = Depends(get_current_user_or_api_key),
):
    artifact = db.get(Artifact, artifact_id)
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")
    content = read_artifact(artifact.storage_path)
    return Response(
        content=content,
        media_type=artifact.content_type,
        headers={"Content-Disposition": f'attachment; filename="{artifact.filename}"'},
    )
