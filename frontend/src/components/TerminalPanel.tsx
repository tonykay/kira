import { useCallback, useEffect, useRef, useState } from "react";
import type { Ticket } from "../types";

interface TerminalPanelProps {
  ticket: Ticket;
  onHeightChange: (height: number) => void;
  onClose: () => void;
}

const MIN_HEIGHT = 150;
const MAX_HEIGHT_RATIO = 0.8;
const DEFAULT_HEIGHT_RATIO = 0.33;

export function TerminalPanel({ ticket, onHeightChange, onClose }: TerminalPanelProps) {
  const [height, setHeight] = useState(Math.round(window.innerHeight * DEFAULT_HEIGHT_RATIO));
  const dragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  const ttydUrl = buildTtydUrl(ticket);

  useEffect(() => {
    onHeightChange(height);
    return () => onHeightChange(0);
  }, [height, onHeightChange]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    startY.current = e.clientY;
    startHeight.current = height;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [height]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const delta = startY.current - e.clientY;
    const maxHeight = Math.round(window.innerHeight * MAX_HEIGHT_RATIO);
    const newHeight = Math.min(maxHeight, Math.max(MIN_HEIGHT, startHeight.current + delta));
    setHeight(newHeight);
  }, []);

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const handlePopOut = () => {
    window.open(ttydUrl, "_blank", "width=900,height=600");
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: `${height}px`,
        background: "#0d1117",
        borderTop: "2px solid var(--kira-border)",
        display: "flex",
        flexDirection: "column",
        zIndex: 200,
      }}
    >
      {/* Drag handle */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          height: "6px",
          cursor: "ns-resize",
          background: "var(--kira-border)",
          flexShrink: 0,
        }}
      />

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "4px 12px",
          background: "#161b22",
          borderBottom: "1px solid #30363d",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: "11px", color: "#8b949e", fontFamily: "monospace" }}>
          Terminal — {ticket.title.slice(0, 50)}
        </span>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={handlePopOut}
            style={{
              background: "none",
              border: "1px solid #30363d",
              color: "#8b949e",
              padding: "2px 8px",
              borderRadius: "3px",
              cursor: "pointer",
              fontSize: "10px",
            }}
          >
            Pop Out
          </button>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "1px solid #30363d",
              color: "#8b949e",
              padding: "2px 8px",
              borderRadius: "3px",
              cursor: "pointer",
              fontSize: "10px",
            }}
          >
            Close
          </button>
        </div>
      </div>

      {/* ttyd iframe */}
      <iframe
        src={ttydUrl}
        title="Terminal"
        style={{
          flex: 1,
          border: "none",
          width: "100%",
          background: "#0d1117",
        }}
      />
    </div>
  );
}

function buildTtydUrl(ticket: Ticket): string {
  const params = new URLSearchParams();
  params.set("arg", ticket.id);
  params.append("arg", ticket.title);
  params.append("arg", ticket.area);
  params.append("arg", ticket.affected_systems.join(","));
  params.append("arg", ticket.skills.join(","));
  return `/ttyd/?${params.toString()}`;
}
