# AI Chat Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a streaming AI chat assistant to the TicketDetail page that proxies to any OpenAI-compatible LLM endpoint, with per-ticket conversation persistence.

**Architecture:** Backend adds a chat router with streaming proxy (httpx + SSE), a ChatMessage ORM model for persistence, and configuration via env vars. Frontend adds a ChatWidget component with a floating button, expandable panel, and streaming message display.

**Tech Stack:** FastAPI StreamingResponse, httpx (async HTTP client), Server-Sent Events, React state management

---

## File Structure

```
api/
├── core/config.py              # MODIFY: add LLM env vars
├── db/models.py                # MODIFY: add ChatMessage model
├── models/chat.py              # NEW: Pydantic schemas
├── routes/chat.py              # NEW: chat endpoints with streaming proxy
├── main.py                     # MODIFY: mount chat router
tests/
└── test_chat.py                # NEW: chat endpoint tests
frontend/src/
├── types.ts                    # MODIFY: add ChatMessage interface
├── api/client.ts               # MODIFY: add chat API methods
├── components/ChatWidget.tsx   # NEW: floating chat panel
└── pages/TicketDetail.tsx      # MODIFY: render ChatWidget
```

---

## Task 1: Backend — Config, ORM Model, and Migration

**Files:**
- Modify: `api/core/config.py`
- Modify: `api/db/models.py`
- Modify: `.env.example`

- [ ] **Step 1: Add LLM config to Settings**

In `api/core/config.py`, add three fields to the `Settings` class after `artifact_storage_path`:

```python
    llm_base_url: str | None = None
    llm_api_key: str | None = None
    llm_model: str = "gpt-4o"
```

- [ ] **Step 2: Add ChatMessage ORM model**

Append to `api/db/models.py`, after the `Webhook` class:

```python
class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tickets.id"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
```

- [ ] **Step 3: Update .env.example**

Append to `.env.example`:

```
# LLM Chat (optional — set KIRA_LLM_BASE_URL to enable)
# KIRA_LLM_BASE_URL=https://api.openai.com/v1
# KIRA_LLM_API_KEY=sk-...
# KIRA_LLM_MODEL=gpt-4o
```

- [ ] **Step 4: Add httpx dependency**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/tok-jira/tok-jira
uv add httpx
```

- [ ] **Step 5: Generate Alembic migration**

```bash
uv run alembic revision --autogenerate -m "add chat_messages table"
uv run alembic upgrade head
```

- [ ] **Step 6: Commit**

```bash
git add api/core/config.py api/db/models.py .env.example pyproject.toml uv.lock api/db/alembic/versions/
git commit -m "feat: add ChatMessage model, LLM config, and httpx dependency"
```

---

## Task 2: Backend — Pydantic Schemas and Chat Routes

**Files:**
- Create: `api/models/chat.py`
- Create: `api/routes/chat.py`
- Modify: `api/main.py`

- [ ] **Step 1: Create chat Pydantic schemas**

`api/models/chat.py`:

```python
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class ChatSendRequest(BaseModel):
    message: str
    include_context: bool = True


class ChatMessageResponse(BaseModel):
    id: UUID
    ticket_id: UUID
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatInfoResponse(BaseModel):
    enabled: bool
    model: str | None = None
```

- [ ] **Step 2: Create chat routes**

`api/routes/chat.py`:

```python
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
    return ChatInfoResponse(
        enabled=enabled,
        model=settings.llm_model if enabled else None,
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
                    "model": settings.llm_model,
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
```

- [ ] **Step 3: Mount chat router in main.py**

In `api/main.py`, add to the imports:

```python
from api.routes import artifacts, auth, audit, chat, comments, dashboard, enums, tickets, users, webhooks
```

Add after the webhooks router line:

```python
app.include_router(chat.router, prefix="/api/v1")
```

- [ ] **Step 4: Verify imports work**

```bash
uv run python -c "from api.routes.chat import router; print('OK')"
```

Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add api/models/chat.py api/routes/chat.py api/main.py
git commit -m "feat: add chat routes with streaming LLM proxy and history persistence"
```

---

## Task 3: Backend — Chat Tests

**Files:**
- Create: `tests/test_chat.py`

- [ ] **Step 1: Create chat tests**

`tests/test_chat.py`:

```python
from unittest.mock import patch


TICKET_PAYLOAD = {
    "title": "OOM kills on payment-service pod",
    "description": "Analysis details",
    "area": "kubernetes",
    "confidence": 0.92,
    "risk": 0.8,
    "recommended_action": "Increase memory limits",
    "affected_systems": [],
    "skills": ["kubernetes", "helm"],
    "source": "agent",
}


def _create_ticket(client, api_key_headers):
    resp = client.post("/api/v1/tickets", json=TICKET_PAYLOAD, headers=api_key_headers)
    return resp.json()["id"]


def test_chat_info_disabled(auth_client):
    resp = auth_client.get("/api/v1/chat/info")
    assert resp.status_code == 200
    data = resp.json()
    assert data["enabled"] is False
    assert data["model"] is None


def test_chat_info_enabled(auth_client, monkeypatch):
    monkeypatch.setattr("api.routes.chat.settings.llm_base_url", "http://fake:8000/v1")
    monkeypatch.setattr("api.routes.chat.settings.llm_model", "test-model")
    resp = auth_client.get("/api/v1/chat/info")
    assert resp.status_code == 200
    data = resp.json()
    assert data["enabled"] is True
    assert data["model"] == "test-model"


def test_chat_info_unauthenticated(client):
    resp = client.get("/api/v1/chat/info")
    assert resp.status_code == 401


def test_chat_history_empty(auth_client, client, api_key_headers):
    ticket_id = _create_ticket(client, api_key_headers)
    resp = auth_client.get(f"/api/v1/chat/{ticket_id}/history")
    assert resp.status_code == 200
    assert resp.json() == []


def test_chat_send_not_configured(auth_client, client, api_key_headers):
    ticket_id = _create_ticket(client, api_key_headers)
    resp = auth_client.post(
        f"/api/v1/chat/{ticket_id}/send",
        json={"message": "What is this issue?"},
    )
    assert resp.status_code == 503


def test_chat_clear_history(auth_client, client, api_key_headers, db_session):
    from api.db.models import ChatMessage

    ticket_id = _create_ticket(client, api_key_headers)
    # Manually add a chat message
    msg = ChatMessage(
        ticket_id=ticket_id,
        user_id=auth_client.__test_user_id__,
        role="user",
        content="test message",
    )
    db_session.add(msg)
    db_session.commit()

    resp = auth_client.delete(f"/api/v1/chat/{ticket_id}/history")
    assert resp.status_code == 200

    resp = auth_client.get(f"/api/v1/chat/{ticket_id}/history")
    assert resp.json() == []
```

Note: The `test_chat_clear_history` test needs the user ID. Add a small fixture to `tests/conftest.py` — in the `auth_client` fixture, after login, attach the user ID:

In `tests/conftest.py`, update the `auth_client` fixture:

```python
@pytest.fixture
def auth_client(client, test_user):
    client.post("/api/v1/auth/login", json={"username": "testuser", "password": "testpass123"})
    client.__test_user_id__ = test_user.id
    return client
```

- [ ] **Step 2: Run tests**

```bash
uv run pytest tests/test_chat.py -v
```

Expected: All 6 tests pass

- [ ] **Step 3: Run full test suite**

```bash
uv run pytest tests/ -v
```

Expected: All tests pass (38 existing + 6 new = 44)

- [ ] **Step 4: Commit**

```bash
git add tests/test_chat.py tests/conftest.py
git commit -m "feat: add chat endpoint tests"
```

---

## Task 4: Frontend — Types and API Client

**Files:**
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/api/client.ts`

- [ ] **Step 1: Add ChatMessage interface to types.ts**

Append to `frontend/src/types.ts` before the closing (at the end of file):

```typescript
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

export interface ChatInfo {
  enabled: boolean;
  model: string | null;
}
```

- [ ] **Step 2: Add chat methods to API client**

In `frontend/src/api/client.ts`, add these methods to the `api` object (before the closing `};`):

```typescript
  chatInfo: () => request<import("../types").ChatInfo>("/chat/info"),
  chatHistory: (ticketId: string) =>
    request<import("../types").ChatMessage[]>(`/chat/${ticketId}/history`),
  chatSend: async (ticketId: string, message: string, includeContext: boolean) => {
    const resp = await fetch(`${BASE}/chat/${ticketId}/send`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, include_context: includeContext }),
    });
    if (!resp.ok) {
      if (resp.status === 401) window.location.href = "/login";
      throw new Error(`${resp.status}: ${await resp.text()}`);
    }
    return resp;
  },
  chatClear: (ticketId: string) =>
    request(`/chat/${ticketId}/history`, { method: "DELETE" }),
```

- [ ] **Step 3: Verify compile**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/tok-jira/tok-jira/frontend
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types.ts frontend/src/api/client.ts
git commit -m "feat: add chat types and API client methods with streaming support"
```

---

## Task 5: Frontend — ChatWidget Component

**Files:**
- Create: `frontend/src/components/ChatWidget.tsx`

- [ ] **Step 1: Create ChatWidget**

`frontend/src/components/ChatWidget.tsx`:

```tsx
import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import type { ChatInfo, ChatMessage, Ticket } from "../types";

interface ChatWidgetProps {
  ticketId: string;
  ticket: Ticket;
}

export function ChatWidget({ ticketId, ticket }: ChatWidgetProps) {
  const [info, setInfo] = useState<ChatInfo | null>(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [includeContext, setIncludeContext] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.chatInfo().then(setInfo).catch(() => setInfo({ enabled: false, model: null }));
  }, []);

  useEffect(() => {
    if (open && !loaded) {
      api.chatHistory(ticketId).then((msgs) => {
        setMessages(msgs);
        setLoaded(true);
      });
    }
  }, [open, loaded, ticketId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!info?.enabled) return null;

  const handleSend = async () => {
    if (!input.trim() || streaming) return;
    const userMessage = input.trim();
    setInput("");

    const tempUserMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setStreaming(true);

    const tempAssistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempAssistantMsg]);

    try {
      const resp = await api.chatSend(ticketId, userMessage, includeContext);
      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value, { stream: true });
          const lines = text.split("\n");
          for (const line of lines) {
            if (!line.startsWith("data: ") || line.trim() === "data: [DONE]") continue;
            try {
              const chunk = JSON.parse(line.slice(6));
              const token = chunk.choices?.[0]?.delta?.content || "";
              if (token) {
                fullContent += token;
                const captured = fullContent;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === tempAssistantMsg.id ? { ...m, content: captured } : m
                  )
                );
              }
            } catch {
              // skip malformed chunks
            }
          }
        }
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempAssistantMsg.id
            ? { ...m, content: `Error: ${err instanceof Error ? err.message : "Failed to get response"}` }
            : m
        )
      );
    }

    setStreaming(false);
  };

  const handleClearContext = () => {
    setIncludeContext(false);
  };

  const handleClearHistory = async () => {
    await api.chatClear(ticketId);
    setMessages([]);
    setIncludeContext(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Open AI Assistant"
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          background: "var(--kira-accent)",
          color: "white",
          border: "none",
          cursor: "pointer",
          fontSize: "20px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 300,
        }}
      >
        {"\u{1F4AC}"}
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        width: "360px",
        height: "460px",
        background: "var(--kira-bg-card)",
        border: "1px solid var(--kira-border)",
        borderRadius: "8px",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        zIndex: 300,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "10px 12px",
          borderBottom: "1px solid var(--kira-border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--kira-text-primary)" }}>
            AI Assistant
          </span>
          <span style={{ fontSize: "10px", color: "var(--kira-text-muted)" }}>
            {info.model}
          </span>
          {includeContext && (
            <span
              style={{
                fontSize: "9px",
                background: "var(--kira-accent)",
                color: "white",
                padding: "1px 5px",
                borderRadius: "6px",
              }}
            >
              ticket context
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: "4px" }}>
          {includeContext && (
            <button
              onClick={handleClearContext}
              title="Clear ticket context"
              style={{
                background: "none",
                border: "1px solid var(--kira-btn-border)",
                color: "var(--kira-btn-text)",
                padding: "2px 6px",
                borderRadius: "3px",
                cursor: "pointer",
                fontSize: "9px",
              }}
            >
              clear context
            </button>
          )}
          <button
            onClick={handleClearHistory}
            title="Clear chat history"
            style={{
              background: "none",
              border: "1px solid var(--kira-btn-border)",
              color: "var(--kira-btn-text)",
              padding: "2px 6px",
              borderRadius: "3px",
              cursor: "pointer",
              fontSize: "9px",
            }}
          >
            clear history
          </button>
          <button
            onClick={() => setOpen(false)}
            title="Minimize"
            style={{
              background: "none",
              border: "none",
              color: "var(--kira-text-muted)",
              cursor: "pointer",
              fontSize: "16px",
              padding: "0 4px",
              lineHeight: 1,
            }}
          >
            {"\u2015"}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {messages.length === 0 && (
          <div style={{ color: "var(--kira-text-muted)", fontSize: "12px", textAlign: "center", marginTop: "40px" }}>
            Ask the AI assistant about this ticket.
            {includeContext && (
              <div style={{ marginTop: "8px", fontSize: "10px" }}>
                Ticket context is attached automatically.
              </div>
            )}
          </div>
        )}
        {messages.filter((m) => m.role !== "system").map((msg) => (
          <div
            key={msg.id}
            style={{
              alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "85%",
            }}
          >
            <div
              style={{
                background: msg.role === "user" ? "var(--kira-accent)" : "var(--kira-bg-input)",
                color: msg.role === "user" ? "white" : "var(--kira-text-primary)",
                padding: "8px 12px",
                borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                fontSize: "12px",
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {msg.content || (streaming ? "\u2588" : "")}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        style={{
          padding: "10px 12px",
          borderTop: "1px solid var(--kira-border)",
          display: "flex",
          gap: "8px",
          flexShrink: 0,
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={streaming ? "Waiting for response..." : "Ask about this ticket..."}
          disabled={streaming}
          style={{
            flex: 1,
            background: "var(--kira-bg-input)",
            border: "1px solid var(--kira-border)",
            borderRadius: "4px",
            color: "var(--kira-text-primary)",
            padding: "8px",
            fontSize: "12px",
            outline: "none",
          }}
        />
        <button
          onClick={handleSend}
          disabled={streaming || !input.trim()}
          style={{
            background: streaming || !input.trim() ? "var(--kira-border)" : "var(--kira-accent)",
            color: streaming || !input.trim() ? "var(--kira-text-muted)" : "white",
            border: "none",
            borderRadius: "4px",
            padding: "8px 12px",
            cursor: streaming || !input.trim() ? "not-allowed" : "pointer",
            fontSize: "12px",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify compile**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/tok-jira/tok-jira/frontend
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ChatWidget.tsx
git commit -m "feat: add ChatWidget component with streaming and history support"
```

---

## Task 6: Frontend — Wire ChatWidget into TicketDetail

**Files:**
- Modify: `frontend/src/pages/TicketDetail.tsx`

- [ ] **Step 1: Add ChatWidget import and render**

In `frontend/src/pages/TicketDetail.tsx`, add to the imports (after the SkillEditor import):

```tsx
import { ChatWidget } from "../components/ChatWidget";
```

At the very end of the component's return JSX, just before the closing `</div>` of the root element, add:

```tsx
      <ChatWidget ticketId={ticket.id} ticket={ticket} />
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/tok-jira/tok-jira/frontend
npm run build
```

Expected: Build succeeds

- [ ] **Step 3: Run full test suite**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/tok-jira/tok-jira
uv run pytest tests/ -v
```

Expected: All 44 tests pass

- [ ] **Step 4: Commit and push**

```bash
git add frontend/src/pages/TicketDetail.tsx
git commit -m "feat: render ChatWidget on TicketDetail page"
git push
```
