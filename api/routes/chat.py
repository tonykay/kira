import json
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from api.core.config import settings
from api.core.deps import get_current_user
from api.db.models import ChatMessage, Ticket, User
from api.db.session import get_db
from api.models.chat import ChatInfoResponse, ChatMessageResponse, ChatSendRequest

router = APIRouter(prefix="/chat", tags=["chat"])


def _build_system_prompt(ticket: Ticket) -> str:
    skills = ", ".join(ticket.skills) if ticket.skills else "none specified"
    affected = ", ".join(ticket.affected_systems) if ticket.affected_systems else "none specified"
    return f"""You are an AI assistant helping an SRE troubleshoot a ticket in the Kira ticket management system.

Ticket: {ticket.title}
Area: {ticket.area}
Risk: {ticket.risk} | Confidence: {ticket.confidence}
Skills: {skills}
Status: {ticket.status}
Recommended Action: {ticket.recommended_action}
Affected Systems: {affected}

Analysis:
{ticket.description}

Help the SRE understand this issue, validate the diagnosis, and plan remediation. Be concise and practical."""


@router.get("/info", response_model=ChatInfoResponse)
def chat_info(user: User = Depends(get_current_user)):
    enabled = settings.llm_base_url is not None
    models = []
    if enabled:
        try:
            resp = httpx.get(
                f"{settings.llm_base_url}/models",
                headers={"Authorization": f"Bearer {settings.llm_api_key}"},
                timeout=10.0,
            )
            if resp.status_code == 200:
                data = resp.json()
                models = [m["id"] for m in data.get("data", [])]
        except Exception:
            pass
    return ChatInfoResponse(
        enabled=enabled,
        model=settings.llm_model if enabled else None,
        models=models,
    )


@router.get("/{ticket_id}/history", response_model=list[ChatMessageResponse])
def chat_history(
    ticket_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.ticket_id == ticket_id, ChatMessage.user_id == user.id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    return messages


@router.delete("/{ticket_id}/history")
def clear_chat_history(
    ticket_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    db.query(ChatMessage).filter(
        ChatMessage.ticket_id == ticket_id, ChatMessage.user_id == user.id
    ).delete()
    db.commit()
    return {"detail": "Chat history cleared"}


@router.post("/{ticket_id}/send")
def chat_send(
    ticket_id: UUID,
    body: ChatSendRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not settings.llm_base_url:
        raise HTTPException(status_code=503, detail="Chat not configured")

    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # Save user message
    user_msg = ChatMessage(
        ticket_id=ticket_id,
        user_id=user.id,
        role="user",
        content=body.message,
    )
    db.add(user_msg)
    db.commit()

    # Build messages array for LLM
    history = (
        db.query(ChatMessage)
        .filter(ChatMessage.ticket_id == ticket_id, ChatMessage.user_id == user.id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )

    messages = []
    if body.include_context:
        messages.append({"role": "system", "content": _build_system_prompt(ticket)})

    for msg in history:
        if msg.role in ("user", "assistant"):
            messages.append({"role": msg.role, "content": msg.content})

    # Stream from LLM
    def stream_response():
        full_content = []
        with httpx.Client(timeout=60.0) as client:
            with client.stream(
                "POST",
                f"{settings.llm_base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.llm_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": body.model or settings.llm_model,
                    "messages": messages,
                    "stream": True,
                },
            ) as response:
                if response.status_code != 200:
                    error_body = response.read().decode()
                    yield f"data: {json.dumps({'error': error_body})}\n\n"
                    return
                for line in response.iter_lines():
                    if not line.strip():
                        continue
                    yield f"{line}\n\n"
                    # Extract content for saving
                    if line.startswith("data: ") and line.strip() != "data: [DONE]":
                        try:
                            chunk = json.loads(line[6:])
                            delta = chunk.get("choices", [{}])[0].get("delta", {})
                            token = delta.get("content", "")
                            if token:
                                full_content.append(token)
                        except (json.JSONDecodeError, IndexError, KeyError):
                            pass

        # Save assistant message after stream completes
        if full_content:
            assistant_msg = ChatMessage(
                ticket_id=ticket_id,
                user_id=user.id,
                role="assistant",
                content="".join(full_content),
            )
            save_db = next(get_db_for_save())
            save_db.add(assistant_msg)
            save_db.commit()
            save_db.close()

    # We need a separate db session for the post-stream save since the
    # original session may be closed by the time the generator finishes
    from api.db.session import SessionLocal

    def get_db_for_save():
        session = SessionLocal()
        yield session

    return StreamingResponse(
        stream_response(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
