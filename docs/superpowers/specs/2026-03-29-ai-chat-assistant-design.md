# AI Chat Assistant Design Spec

## Purpose

Add a pop-up AI chat assistant to the TicketDetail page so SREs can consult with a remote LLM while examining a ticket. The chatbot auto-injects ticket context, streams responses, and persists conversation history per ticket in the database.

## User Experience

### Collapsed State
A floating button in the bottom-right corner of the TicketDetail page. Shows a chat icon. Only appears when chat is enabled (LLM endpoint configured).

### Expanded State
A panel (~350px wide, ~450px tall) anchored bottom-right, overlaying page content:
- **Header bar:** model name (e.g., "gpt-4o"), clear context button, minimize button
- **Message list:** scrollable, user messages right-aligned, assistant messages left-aligned. Messages stream in token-by-token.
- **Input area:** text input with send button. Disabled while a response is streaming.

### Context Behavior
On first open for a ticket, the system prompt is auto-injected with ticket context. A "clear context" button in the header resets the system prompt so subsequent messages go without ticket context. Chat history for that ticket is preserved regardless.

## Backend

### Configuration

Three new optional env vars in `api/core/config.py`:

| Variable | Default | Description |
|----------|---------|-------------|
| `KIRA_LLM_BASE_URL` | `None` | OpenAI-compatible base URL (e.g., `https://api.openai.com/v1`) |
| `KIRA_LLM_API_KEY` | `None` | API key for the LLM provider |
| `KIRA_LLM_MODEL` | `gpt-4o` | Model identifier |

If `KIRA_LLM_BASE_URL` is not set, chat is disabled — the info endpoint returns `enabled: false` and the frontend hides the chat button.

### Data Model

New `chat_messages` table:

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| ticket_id | FK → tickets | |
| user_id | FK → users | Who sent/received this message |
| role | varchar(20) | `user`, `assistant`, or `system` |
| content | text | Message content |
| created_at | timestamptz | |

### API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/chat/info` | Session | Returns `{ enabled, model }` |
| `GET` | `/chat/{ticket_id}/history` | Session | Returns conversation history for a ticket |
| `POST` | `/chat/{ticket_id}/send` | Session | Send a message, get streamed response |
| `DELETE` | `/chat/{ticket_id}/history` | Session | Clear chat history for a ticket |

### POST /chat/{ticket_id}/send

Request body:
```json
{
  "message": "What could cause this OOM issue besides a memory leak?",
  "include_context": true
}
```

Behavior:
1. Load ticket from database
2. Load existing chat history for this ticket + user
3. Build messages array:
   - If `include_context` is true: system prompt with ticket context
   - All previous messages (role + content)
   - New user message
4. Save user message to `chat_messages`
5. Call LLM via `httpx` streaming POST to `{base_url}/chat/completions` with `stream: true`
6. Return `StreamingResponse` with `text/event-stream` content type, forwarding SSE chunks
7. After stream completes, save full assistant response to `chat_messages`

### System Prompt Template

```
You are an AI assistant helping an SRE troubleshoot a ticket in the Kira ticket management system.

Ticket: {title}
Area: {area}
Risk: {risk} | Confidence: {confidence}
Skills: {skills}
Status: {status}
Recommended Action: {recommended_action}
Affected Systems: {affected_systems}

Analysis:
{description}

Help the SRE understand this issue, validate the diagnosis, and plan remediation. Be concise and practical.
```

### Streaming Format

The endpoint forwards SSE chunks from the LLM provider in standard OpenAI streaming format:
```
data: {"choices":[{"delta":{"content":"token"}}]}
```

The final chunk:
```
data: [DONE]
```

## Frontend

### ChatWidget Component

A self-contained component rendered on TicketDetail only. Manages its own state (open/closed, messages, streaming).

**Props:** `ticketId: string`, `ticket: Ticket` (for context injection)

**Behavior:**
- On mount, calls `GET /chat/info` — if `enabled: false`, renders nothing
- On open, calls `GET /chat/{ticketId}/history` to load existing messages
- On send, calls `POST /chat/{ticketId}/send` with `ReadableStream` reader to append tokens incrementally
- Tracks `includeContext` state (defaults to `true`, toggled by clear context button)
- Auto-scrolls to bottom on new messages

### API Client Additions

```typescript
chatInfo: () => request<{ enabled: boolean; model: string }>("/chat/info"),
chatHistory: (ticketId: string) => request<ChatMessage[]>(`/chat/${ticketId}/history`),
chatSend: (ticketId: string, message: string, includeContext: boolean) => {
  // Returns raw Response for streaming — not the normal request() wrapper
},
chatClear: (ticketId: string) => request(`/chat/${ticketId}/history`, { method: "DELETE" }),
```

### TypeScript Types

```typescript
interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}
```

## Dependencies

New Python dependency: `httpx` for async streaming HTTP client to call the LLM endpoint.

```bash
uv add httpx
```

## Files

### New Files
- `api/models/chat.py` — Pydantic schemas (ChatSendRequest, ChatMessageResponse)
- `api/routes/chat.py` — chat endpoints with streaming proxy
- `frontend/src/components/ChatWidget.tsx` — floating chat panel

### Modified Files
- `api/core/config.py` — add LLM env vars
- `api/db/models.py` — add ChatMessage model
- `api/main.py` — mount chat router
- `api/routes/__init__.py` — (if needed)
- `frontend/src/types.ts` — add ChatMessage interface
- `frontend/src/api/client.ts` — add chat API methods
- `frontend/src/pages/TicketDetail.tsx` — render ChatWidget
- `.env.example` — add LLM env vars
- New Alembic migration for chat_messages table

### Tests
- `tests/test_chat.py` — test info endpoint, send (mocked LLM), history, clear

## Out of Scope

- Multi-user conversations (each user has their own chat per ticket)
- Chat in TicketList or Dashboard views
- File/image attachments in chat
- Tool calling or function execution
- Chat export or sharing
- Rate limiting on LLM calls
- Token usage tracking or cost management
