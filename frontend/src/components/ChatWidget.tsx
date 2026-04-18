import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import type { ChatInfo, ChatMessage, Ticket } from "../types";

interface ChatWidgetProps {
  ticketId: string;
  ticket: Ticket;
  bottomOffset?: number;
}

export function ChatWidget({ ticketId, bottomOffset = 0 }: ChatWidgetProps) {
  const [info, setInfo] = useState<ChatInfo | null>(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [includeContext, setIncludeContext] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.chatInfo().then((i) => {
      setInfo(i);
      const stored = localStorage.getItem("kira-chat-model");
      if (stored && i.models.includes(stored)) {
        setSelectedModel(stored);
      } else if (i.models.length > 0) {
        setSelectedModel(i.models[0]);
      } else if (i.model) {
        setSelectedModel(i.model);
      }
    }).catch(() => setInfo({ enabled: false, model: null, models: [] }));
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

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    localStorage.setItem("kira-chat-model", model);
  };

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
      const resp = await api.chatSend(ticketId, userMessage, includeContext, selectedModel);
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
          bottom: `${24 + bottomOffset}px`,
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
        bottom: `${24 + bottomOffset}px`,
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
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--kira-text-primary)" }}>
            Chat
          </span>
          {info.models.length > 1 ? (
            <select
              value={selectedModel}
              onChange={(e) => handleModelChange(e.target.value)}
              style={{
                background: "var(--kira-bg-input)",
                border: "1px solid var(--kira-btn-border)",
                color: "var(--kira-text-muted)",
                padding: "1px 4px",
                borderRadius: "3px",
                fontSize: "9px",
                maxWidth: "120px",
              }}
            >
              {info.models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          ) : (
            <span style={{ fontSize: "10px", color: "var(--kira-text-muted)" }}>
              {selectedModel || info.model}
            </span>
          )}
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
