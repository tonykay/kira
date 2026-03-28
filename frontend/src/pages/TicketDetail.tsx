import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { AreaLozenge, ConfidenceLozenge, RiskLozenge, StatusLozenge } from "../components/Lozenge";
import { AuditTimeline } from "../components/AuditTimeline";
import type { Ticket, Comment, AuditEntry, Artifact, Status } from "../types";

const STATUSES: Status[] = ["open", "acknowledged", "in_progress", "resolved", "closed"];

export function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [newComment, setNewComment] = useState("");
  const [activeTab, setActiveTab] = useState<"comments" | "audit" | "artifacts">("comments");

  useEffect(() => {
    if (!id) return;
    api.getTicket(id).then(setTicket);
    api.getComments(id).then(setComments);
    api.getAudit(id).then(setAudit);
    api.getArtifacts(id).then(setArtifacts);
  }, [id]);

  if (!ticket) return <div style={{ color: "var(--kira-text-muted)" }}>Loading...</div>;

  const handleStatusChange = async (status: Status) => {
    const updated = await api.updateTicket(ticket.id, { status });
    setTicket(updated);
    api.getAudit(ticket.id).then(setAudit);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    await api.addComment(ticket.id, newComment);
    setNewComment("");
    api.getComments(ticket.id).then(setComments);
    api.getAudit(ticket.id).then(setAudit);
  };

  const sectionStyle = {
    background: "var(--kira-bg-card)",
    borderRadius: "6px",
    padding: "16px",
    marginBottom: "12px",
  };

  return (
    <div>
      <div style={{ ...sectionStyle }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
          <h2 style={{ margin: 0, fontSize: "18px" }}>{ticket.title}</h2>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <AreaLozenge area={ticket.area} />
            <StatusLozenge status={ticket.status} />
          </div>
        </div>

        <div style={{ display: "flex", gap: "24px", marginBottom: "16px", fontSize: "13px", flexWrap: "wrap" }}>
          <div>
            <span style={{ color: "var(--kira-text-muted)" }}>Risk: </span>
            <RiskLozenge value={ticket.risk} />
          </div>
          <div>
            <span style={{ color: "var(--kira-text-muted)" }}>Confidence: </span>
            <ConfidenceLozenge value={ticket.confidence} />
          </div>
          <div>
            <span style={{ color: "var(--kira-text-muted)" }}>Source: </span>
            <span>{ticket.created_by_source}</span>
          </div>
          <div>
            <span style={{ color: "var(--kira-text-muted)" }}>Created: </span>
            <span>{new Date(ticket.created_at).toLocaleString()}</span>
          </div>
        </div>

        {ticket.affected_systems.length > 0 && (
          <div style={{ marginBottom: "12px", fontSize: "13px" }}>
            <span style={{ color: "var(--kira-text-muted)" }}>Affected: </span>
            {ticket.affected_systems.map((s) => (
              <code key={s} style={{ background: "var(--kira-bg-input)", padding: "2px 6px", borderRadius: "3px", marginRight: "4px", fontSize: "11px" }}>
                {s}
              </code>
            ))}
          </div>
        )}
      </div>

      <div style={{ ...sectionStyle, borderLeft: "3px solid #f59e0b" }}>
        <div style={{ fontSize: "11px", color: "#f59e0b", textTransform: "uppercase", marginBottom: "8px" }}>
          Recommended Action
        </div>
        <div style={{ fontSize: "14px" }}>{ticket.recommended_action}</div>
      </div>

      <div style={{ ...sectionStyle }}>
        <div style={{ fontSize: "11px", color: "var(--kira-text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>
          Analysis
        </div>
        <div style={{ fontSize: "13px", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{ticket.description}</div>
      </div>

      <div style={{ ...sectionStyle }}>
        <div style={{ fontSize: "11px", color: "var(--kira-text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>
          Update Status
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => handleStatusChange(s)}
              disabled={s === ticket.status}
              style={{
                padding: "6px 12px",
                borderRadius: "4px",
                border: "1px solid var(--kira-border)",
                background: s === ticket.status ? "var(--kira-border)" : "var(--kira-bg-input)",
                color: s === ticket.status ? "var(--kira-text-primary)" : "var(--kira-text-muted)",
                cursor: s === ticket.status ? "default" : "pointer",
                fontSize: "12px",
              }}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: "0", marginBottom: "0" }}>
        {(["comments", "audit", "artifacts"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "8px 16px",
              background: activeTab === tab ? "var(--kira-bg-card)" : "transparent",
              color: activeTab === tab ? "var(--kira-accent)" : "var(--kira-text-muted)",
              border: "none",
              borderBottom: activeTab === tab ? "2px solid var(--kira-accent)" : "2px solid transparent",
              cursor: "pointer",
              fontSize: "13px",
              textTransform: "capitalize",
            }}
          >
            {tab} ({tab === "comments" ? comments.length : tab === "audit" ? audit.length : artifacts.length})
          </button>
        ))}
      </div>

      <div style={{ ...sectionStyle, borderTopLeftRadius: 0 }}>
        {activeTab === "comments" && (
          <div>
            {comments.map((c) => (
              <div key={c.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--kira-border-subtle)", fontSize: "13px" }}>
                <div style={{ display: "flex", gap: "8px", marginBottom: "4px" }}>
                  <span style={{ color: "var(--kira-text-secondary)", fontWeight: 500 }}>{c.author_name}</span>
                  <span
                    style={{
                      background: c.author_source === "agent" ? "#2563eb22" : "#7c3aed22",
                      color: c.author_source === "agent" ? "#2563eb" : "#7c3aed",
                      padding: "1px 6px",
                      borderRadius: "4px",
                      fontSize: "10px",
                    }}
                  >
                    {c.author_source}
                  </span>
                  <span style={{ color: "var(--kira-text-muted)" }}>{new Date(c.created_at).toLocaleString()}</span>
                </div>
                <div style={{ color: "var(--kira-text-secondary)", whiteSpace: "pre-wrap" }}>{c.body}</div>
              </div>
            ))}
            <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                style={{
                  flex: 1,
                  background: "var(--kira-bg-input)",
                  border: "1px solid var(--kira-border)",
                  borderRadius: "4px",
                  color: "var(--kira-text-primary)",
                  padding: "8px",
                  fontSize: "13px",
                  minHeight: "60px",
                  resize: "vertical",
                }}
              />
              <button
                onClick={handleAddComment}
                style={{
                  alignSelf: "flex-end",
                  padding: "8px 16px",
                  background: "var(--kira-accent)",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "13px",
                }}
              >
                Comment
              </button>
            </div>
          </div>
        )}

        {activeTab === "audit" && <AuditTimeline entries={audit} />}

        {activeTab === "artifacts" && (
          <div>
            {artifacts.length === 0 && <div style={{ color: "var(--kira-text-muted)", fontSize: "13px" }}>No artifacts</div>}
            {artifacts.map((a) => (
              <div key={a.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--kira-border-subtle)", fontSize: "12px" }}>
                <div>
                  <span style={{ color: "var(--kira-text-secondary)" }}>{a.filename}</span>
                  <span style={{ color: "var(--kira-text-muted)", marginLeft: "8px" }}>{a.content_type}</span>
                </div>
                <a
                  href={`/api/v1/artifacts/${a.id}/download`}
                  style={{ color: "var(--kira-accent)", textDecoration: "none" }}
                >
                  Download
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
