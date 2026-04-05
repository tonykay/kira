import { useState } from "react";
import { MarkdownRenderer } from "./MarkdownRenderer";
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

interface IssueCardProps {
  issue: Issue;
  user: User | null;
  onPromote: (issueId: string, priority: number) => Promise<void>;
  onDismiss: (issueId: string) => Promise<void>;
  onUpdate: (issueId: string, data: Record<string, unknown>) => Promise<void>;
}

export function IssueCard({ issue, user, onPromote, onDismiss, onUpdate }: IssueCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [promoteDialog, setPromoteDialog] = useState(false);
  const [priority, setPriority] = useState(3);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(issue.title);
  const [editSeverity, setEditSeverity] = useState(issue.severity);
  const [editDescription, setEditDescription] = useState(issue.description);
  const [editFix, setEditFix] = useState(issue.fix);

  const canEdit = user && user.role !== "viewer";
  const isPromoted = issue.status !== "identified" && issue.status !== "dismissed";

  const handleSaveEdit = async () => {
    await onUpdate(issue.id, {
      title: editTitle,
      severity: editSeverity,
      description: editDescription,
      fix: editFix,
    });
    setEditing(false);
  };

  return (
    <div
      style={{
        border: "1px solid var(--kira-border)",
        borderRadius: "6px",
        marginBottom: "8px",
        overflow: "hidden",
        borderLeft: `3px solid ${SEVERITY_COLORS[issue.severity]}`,
      }}
    >
      {/* Collapsed header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "10px 14px",
          cursor: "pointer",
          background: "var(--kira-bg-card)",
        }}
      >
        <span style={{ fontSize: "12px", color: "var(--kira-text-muted)" }}>
          {expanded ? "\u25BC" : "\u25B6"}
        </span>
        <span
          style={{
            background: SEVERITY_COLORS[issue.severity],
            color: "white",
            padding: "2px 8px",
            borderRadius: "10px",
            fontSize: "10px",
            fontWeight: 500,
            textTransform: "uppercase",
          }}
        >
          {issue.severity}
        </span>
        <span style={{ flex: 1, fontSize: "13px", fontWeight: 500 }}>{issue.title}</span>
        {issue.priority && (
          <span
            style={{
              fontSize: "11px",
              color: "var(--kira-text-muted)",
              background: "var(--kira-bg-input)",
              padding: "2px 6px",
              borderRadius: "4px",
            }}
          >
            P{issue.priority}
          </span>
        )}
        <span
          style={{
            background: `${STATUS_COLORS[issue.status]}22`,
            color: STATUS_COLORS[issue.status],
            padding: "2px 8px",
            borderRadius: "10px",
            fontSize: "10px",
            fontWeight: 500,
          }}
        >
          {issue.status.replace("_", " ")}
        </span>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: "14px", background: "var(--kira-bg-page)", borderTop: "1px solid var(--kira-border)" }}>
          {editing ? (
            <div>
              <div style={{ marginBottom: "10px" }}>
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
                    padding: "6px 8px",
                    fontSize: "13px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ marginBottom: "10px" }}>
                <label style={{ fontSize: "11px", color: "var(--kira-text-muted)", display: "block", marginBottom: "4px" }}>Severity</label>
                <select
                  value={editSeverity}
                  onChange={(e) => setEditSeverity(e.target.value as Severity)}
                  style={{
                    background: "var(--kira-bg-input)",
                    border: "1px solid var(--kira-border)",
                    borderRadius: "4px",
                    color: "var(--kira-text-primary)",
                    padding: "6px 8px",
                    fontSize: "13px",
                  }}
                >
                  {(["critical", "high", "medium", "low", "info"] as Severity[]).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: "10px" }}>
                <label style={{ fontSize: "11px", color: "var(--kira-text-muted)", display: "block", marginBottom: "4px" }}>Description (markdown)</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={6}
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
              <div style={{ marginBottom: "10px" }}>
                <label style={{ fontSize: "11px", color: "var(--kira-text-muted)", display: "block", marginBottom: "4px" }}>Fix (markdown)</label>
                <textarea
                  value={editFix}
                  onChange={(e) => setEditFix(e.target.value)}
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
              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setEditing(false)}
                  style={{
                    padding: "6px 12px",
                    background: "var(--kira-btn-bg)",
                    border: "1px solid var(--kira-btn-border)",
                    borderRadius: "4px",
                    color: "var(--kira-btn-text)",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  style={{
                    padding: "6px 12px",
                    background: "var(--kira-accent)",
                    border: "none",
                    borderRadius: "4px",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "11px", color: "var(--kira-text-muted)", textTransform: "uppercase", marginBottom: "6px" }}>
                  Description
                </div>
                <div style={{ fontSize: "13px" }}>
                  <MarkdownRenderer content={issue.description} />
                </div>
              </div>
              <div style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "11px", color: "var(--kira-text-muted)", textTransform: "uppercase", marginBottom: "6px" }}>
                  Proposed Fix
                </div>
                <div style={{ fontSize: "13px" }}>
                  <MarkdownRenderer content={issue.fix} />
                </div>
              </div>

              {/* Action buttons */}
              {canEdit && (
                <div style={{ display: "flex", gap: "8px", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--kira-border-subtle)" }}>
                  {issue.status === "identified" && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); setPromoteDialog(true); }}
                        style={{
                          padding: "6px 12px",
                          background: "#8b5cf6",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                      >
                        Add to Backlog
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDismiss(issue.id); }}
                        style={{
                          padding: "6px 12px",
                          background: "var(--kira-btn-bg)",
                          border: "1px solid var(--kira-btn-border)",
                          borderRadius: "4px",
                          color: "var(--kira-btn-text)",
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                      >
                        Dismiss
                      </button>
                    </>
                  )}
                  {isPromoted && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
                      <span style={{ color: "var(--kira-text-muted)" }}>Priority:</span>
                      <select
                        value={issue.priority || 3}
                        onChange={(e) => onUpdate(issue.id, { priority: parseInt(e.target.value) })}
                        style={{
                          background: "var(--kira-bg-input)",
                          border: "1px solid var(--kira-border)",
                          borderRadius: "4px",
                          color: "var(--kira-text-primary)",
                          padding: "4px 6px",
                          fontSize: "12px",
                        }}
                      >
                        {[1, 2, 3, 4, 5].map((p) => (
                          <option key={p} value={p}>P{p}</option>
                        ))}
                      </select>
                      <span style={{ color: "var(--kira-text-muted)" }}>Status:</span>
                      <select
                        value={issue.status}
                        onChange={(e) => onUpdate(issue.id, { status: e.target.value })}
                        style={{
                          background: "var(--kira-bg-input)",
                          border: "1px solid var(--kira-border)",
                          borderRadius: "4px",
                          color: "var(--kira-text-primary)",
                          padding: "4px 6px",
                          fontSize: "12px",
                        }}
                      >
                        <option value="backlog">Backlog</option>
                        <option value="in_progress">In Progress</option>
                        <option value="done">Done</option>
                      </select>
                    </div>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditing(true); }}
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
                    Edit
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Promote dialog */}
          {promoteDialog && (
            <div
              style={{
                marginTop: "12px",
                padding: "14px",
                background: "var(--kira-bg-card)",
                borderRadius: "6px",
                border: "1px solid var(--kira-border)",
              }}
            >
              <div style={{ fontSize: "13px", fontWeight: 500, marginBottom: "10px" }}>Set Priority</div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: "14px", fontWeight: 600, minWidth: "24px" }}>P{priority}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "var(--kira-text-muted)", marginBottom: "12px" }}>
                <span>1 = Highest</span>
                <span>5 = Lowest</span>
              </div>
              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setPromoteDialog(false)}
                  style={{
                    padding: "6px 12px",
                    background: "var(--kira-btn-bg)",
                    border: "1px solid var(--kira-btn-border)",
                    borderRadius: "4px",
                    color: "var(--kira-btn-text)",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await onPromote(issue.id, priority);
                    setPromoteDialog(false);
                  }}
                  style={{
                    padding: "6px 12px",
                    background: "#8b5cf6",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  Promote
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { SEVERITY_COLORS, STATUS_COLORS };
