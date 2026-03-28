import type { AuditEntry } from "../types";

export function AuditTimeline({ entries }: { entries: AuditEntry[] }) {
  return (
    <div>
      {entries.map((entry) => (
        <div
          key={entry.id}
          style={{
            display: "flex",
            gap: "12px",
            padding: "10px 0",
            borderBottom: "1px solid #222",
            fontSize: "12px",
          }}
        >
          <div style={{ color: "#888", minWidth: "140px", whiteSpace: "nowrap" }}>
            {new Date(entry.timestamp).toLocaleString()}
          </div>
          <div>
            <span
              style={{
                background: entry.actor_source === "agent" ? "#2563eb22" : "#7c3aed22",
                color: entry.actor_source === "agent" ? "#2563eb" : "#7c3aed",
                padding: "1px 6px",
                borderRadius: "4px",
                fontSize: "10px",
                marginRight: "6px",
              }}
            >
              {entry.actor_source}
            </span>
            <span style={{ color: "#ccc" }}>{entry.actor_name}</span>
            {entry.actor_tier && (
              <span style={{ color: "#666", marginLeft: "4px" }}>({entry.actor_tier})</span>
            )}
            <span style={{ color: "#999", marginLeft: "8px" }}>
              {entry.action.replace(/_/g, " ")}
            </span>
            {entry.old_value && entry.new_value && (
              <span style={{ color: "#666", marginLeft: "8px" }}>
                {JSON.stringify(entry.old_value)} → {JSON.stringify(entry.new_value)}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
