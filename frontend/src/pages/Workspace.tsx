import { useCallback, useRef, useState } from "react";

const DEFAULT_SPLIT = 50; // percent
const MIN_SPLIT = 15;
const MAX_SPLIT = 85;

export function Workspace() {
  const [splitPercent, setSplitPercent] = useState(DEFAULT_SPLIT);
  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
        background: "#0d1117",
        borderRadius: "6px",
        overflow: "hidden",
      }}
    >
      {/* Terminal 1 (top) */}
      <div style={{ height: `${splitPercent}%`, display: "flex", flexDirection: "column" }}>
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
          Terminal 1
        </div>
        <iframe
          src="/ttyd2/"
          title="Workspace Terminal 1"
          style={{ flex: 1, border: "none", width: "100%", background: "#0d1117" }}
        />
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

      {/* Terminal 2 (bottom) */}
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
          Terminal 2
        </div>
        <iframe
          src="/ttyd3/"
          title="Workspace Terminal 2"
          style={{ flex: 1, border: "none", width: "100%", background: "#0d1117" }}
        />
      </div>
    </div>
  );
}
