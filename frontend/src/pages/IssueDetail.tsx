import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client";
import { MarkdownRenderer } from "../components/MarkdownRenderer";
import type { Issue, Severity, IssueStatus, User } from "../types";

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#f59e0b",
  low: "#3b82f6",
  info: "#6b7280",
};

const STATUS_COLORS: Record<IssueStatus, string> = {
  identified: "#6b7280",
  backlog: "#8b5cf6",
  in_progress: "#3b82f6",
  done: "#22c55e",
  dismissed: "#9ca3af",
};

const EDITABLE_STATUSES: IssueStatus[] = ["identified", "backlog", "in_progress", "done", "dismissed"];

export function IssueDetail() {
  const { id } = useParams<{ id: string }>();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editSeverity, setEditSeverity] = useState<Severity>("medium");
  const [editDescription, setEditDescription] = useState("");
  const [editFix, setEditFix] = useState("");

  useEffect(() => {
    if (!id) return;
    api.getIssue(id).then((i) => {
      setIssue(i);
      setEditTitle(i.title);
      setEditSeverity(i.severity);
      setEditDescription(i.description);
      setEditFix(i.fix);
    });
    api.me().then(setUser);
  }, [id]);

  if (!issue) return <div style={{ color: "var(--kira-text-muted)" }}>Loading...</div>;

  const canEdit = user && user.role !== "viewer";

  const handleUpdate = async (data: Record<string, unknown>) => {
    if (!id) return;
    const updated = await api.updateIssue(id, data);
    setIssue(updated);
  };

  const handleSaveEdit = async () => {
    await handleUpdate({
      title: editTitle,
      severity: editSeverity,
      description: editDescription,
      fix: editFix,
    });
    setEditing(false);
  };

  const sectionStyle = {
    background: "var(--kira-bg-card)",
    borderRadius: "6px",
    padding: "16px",
    marginBottom: "12px",
  };

  return (
    <div>
      {/* Header */}
      <div style={{ ...sectionStyle }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
          <h2 style={{ margin: 0, fontSize: "18px" }}>{issue.title}</h2>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span
              style={{
                background: SEVERITY_COLORS[issue.severity],
                color: "white",
                padding: "2px 8px",
                borderRadius: "10px",
                fontSize: "11px",
                fontWeight: 500,
                textTransform: "uppercase",
              }}
            >
              {issue.severity}
            </span>
            <span
              style={{
                background: `${STATUS_COLORS[issue.status]}22`,
                color: STATUS_COLORS[issue.status],
                padding: "2px 8px",
                borderRadius: "10px",
                fontSize: "11px",
                fontWeight: 500,
              }}
            >
              {issue.status.replace("_", " ")}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "24px", fontSize: "13px", flexWrap: "wrap" }}>
          <div>
            <span style={{ color: "var(--kira-text-muted)" }}>Ticket: </span>
            <Link to={`/tickets/${issue.ticket_id}`} style={{ color: "var(--kira-link)", textDecoration: "none" }}>
              {issue.ticket_title}
            </Link>
          </div>
          <div>
            <span style={{ color: "var(--kira-text-muted)" }}>Priority: </span>
            <span>{issue.priority ? `P${issue.priority}` : "\u2014"}</span>
          </div>
          <div>
            <span style={{ color: "var(--kira-text-muted)" }}>Created: </span>
            <span>{new Date(issue.created_at).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      {canEdit && (
        <div style={{ ...sectionStyle }}>
          <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
              <span style={{ color: "var(--kira-text-muted)" }}>Status:</span>
              <select
                value={issue.status}
                onChange={(e) => handleUpdate({ status: e.target.value })}
                style={{
                  background: "var(--kira-bg-input)",
                  border: "1px solid var(--kira-border)",
                  borderRadius: "4px",
                  color: "var(--kira-text-primary)",
                  padding: "6px 8px",
                  fontSize: "12px",
                }}
              >
                {EDITABLE_STATUSES.map((s) => (
                  <option key={s} value={s}>{s.replace("_", " ")}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
              <span style={{ color: "var(--kira-text-muted)" }}>Priority:</span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={issue.priority || 3}
                  onChange={(e) => handleUpdate({ priority: parseInt(e.target.value) })}
                  style={{ width: "120px" }}
                />
                <span style={{ fontSize: "13px", fontWeight: 600, minWidth: "24px" }}>
                  P{issue.priority || "\u2014"}
                </span>
              </div>
            </div>
            <button
              onClick={() => setEditing(!editing)}
              style={{
                padding: "6px 12px",
                background: "var(--kira-btn-bg)",
                border: "1px solid var(--kira-btn-border)",
                borderRadius: "4px",
                color: "var(--kira-btn-text)",
                cursor: "pointer",
                fontSize: "12px",
                marginLeft: "auto",
              }}
            >
              {editing ? "Cancel Edit" : "Edit"}
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {editing ? (
        <div style={{ ...sectionStyle }}>
          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "11px", color: "var(--kira-text-muted)", display: "block", marginBottom: "4px" }}>Title</label>
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              style={{
                width: "100%",
                background: "var(--kira-bg-input)",
                border: "1px solid var(--kira-border)",
                borderRadius: "4px",
                color: "var(--kira-text-primary)",
                padding: "8px",
                fontSize: "13px",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "11px", color: "var(--kira-text-muted)", display: "block", marginBottom: "4px" }}>Severity</label>
            <select
              value={editSeverity}
              onChange={(e) => setEditSeverity(e.target.value as Severity)}
              style={{
                background: "var(--kira-bg-input)",
                border: "1px solid var(--kira-border)",
                borderRadius: "4px",
                color: "var(--kira-text-primary)",
                padding: "8px",
                fontSize: "13px",
              }}
            >
              {(["critical", "high", "medium", "low", "info"] as Severity[]).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "11px", color: "var(--kira-text-muted)", display: "block", marginBottom: "4px" }}>Description (markdown)</label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={8}
              style={{
                width: "100%",
                background: "var(--kira-bg-input)",
                border: "1px solid var(--kira-border)",
                borderRadius: "4px",
                color: "var(--kira-text-primary)",
                padding: "8px",
                fontSize: "13px",
                resize: "vertical",
                boxSizing: "border-box",
                fontFamily: "monospace",
              }}
            />
          </div>
          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "11px", color: "var(--kira-text-muted)", display: "block", marginBottom: "4px" }}>Fix (markdown)</label>
            <textarea
              value={editFix}
              onChange={(e) => setEditFix(e.target.value)}
              rows={10}
              style={{
                width: "100%",
                background: "var(--kira-bg-input)",
                border: "1px solid var(--kira-border)",
                borderRadius: "4px",
                color: "var(--kira-text-primary)",
                padding: "8px",
                fontSize: "13px",
                resize: "vertical",
                boxSizing: "border-box",
                fontFamily: "monospace",
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={handleSaveEdit}
              style={{
                padding: "8px 16px",
                background: "var(--kira-accent)",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              Save Changes
            </button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ ...sectionStyle }}>
            <div style={{ fontSize: "11px", color: "var(--kira-text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>
              Description
            </div>
            <div style={{ fontSize: "13px" }}>
              <MarkdownRenderer content={issue.description} />
            </div>
          </div>
          <div style={{ ...sectionStyle, borderLeft: `3px solid ${SEVERITY_COLORS[issue.severity]}` }}>
            <div style={{ fontSize: "11px", color: "var(--kira-text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>
              Proposed Fix
            </div>
            <div style={{ fontSize: "13px" }}>
              <MarkdownRenderer content={issue.fix} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
