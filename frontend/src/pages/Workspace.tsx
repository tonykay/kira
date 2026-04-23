import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import type { ChatInfo, ChatMessage } from "../types";

const DEFAULT_SPLIT = 50;
const MIN_SPLIT = 20;
const MAX_SPLIT = 80;

export function Workspace() {
  const [splitPercent, setSplitPercent] = useState(DEFAULT_SPLIT);
  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Chat state
  const [info, setInfo] = useState<ChatInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      const resp = await api.chatSendGeneral(userMessage, selectedModel);
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const pct = Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, (y / rect.height) * 100));
    setSplitPercent(pct);
  }, []);

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 60px)",
        background: "var(--kira-bg)",
        borderRadius: "6px",
        overflow: "hidden",
      }}
    >
      {/* Chat (top) */}
      <div style={{ height: `${splitPercent}%`, display: "flex", flexDirection: "column" }}>
        <div
          style={{
            padding: "8px 12px",
            background: "var(--kira-bg-card)",
            borderBottom: "1px solid var(--kira-border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--kira-text-primary)" }}>
              AI Assistant
            </span>
            {info && info.models.length > 1 && (
              <select
                value={selectedModel}
                onChange={(e) => handleModelChange(e.target.value)}
                style={{
                  background: "var(--kira-bg-input)",
                  border: "1px solid var(--kira-btn-border)",
                  color: "var(--kira-text)",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  fontSize: "11px",
                }}
              >
                {info.models.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            )}
          </div>
          <button
            onClick={() => setMessages([])}
            style={{
              background: "none",
              border: "1px solid var(--kira-btn-border)",
              color: "var(--kira-btn-text)",
              padding: "2px 8px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "11px",
            }}
          >
            Clear
          </button>
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
            background: "var(--kira-bg-card)",
          }}
        >
          {messages.length === 0 && (
            <div style={{ color: "var(--kira-text-muted)", fontSize: "13px", textAlign: "center", marginTop: "40px" }}>
              Ask the AI assistant anything — no ticket context attached.
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
                  fontSize: "13px",
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {msg.content || (streaming ? "█" : "")}
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
            background: "var(--kira-bg-card)",
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={streaming ? "Waiting for response..." : "Ask anything..."}
            disabled={streaming}
            style={{
              flex: 1,
              background: "var(--kira-bg-input)",
              border: "1px solid var(--kira-border)",
              borderRadius: "4px",
              color: "var(--kira-text-primary)",
              padding: "8px",
              fontSize: "13px",
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
              padding: "8px 14px",
              cursor: streaming || !input.trim() ? "not-allowed" : "pointer",
              fontSize: "13px",
            }}
          >
            Send
          </button>
        </div>
      </div>

      {/* Drag handle */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          height: "6px",
          cursor: "ns-resize",
          background: "#30363d",
          flexShrink: 0,
        }}
      />

      {/* Terminal (bottom) */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div
          style={{
            padding: "4px 12px",
            background: "#161b22",
            borderBottom: "1px solid #30363d",
            fontSize: "11px",
            color: "#8b949e",
            fontFamily: "monospace",
            flexShrink: 0,
          }}
        >
          Terminal
        </div>
        <iframe
          src="/ttyd2/"
          title="Workspace Terminal"
          style={{ flex: 1, border: "none", width: "100%", background: "#0d1117" }}
        />
      </div>
    </div>
  );
}
