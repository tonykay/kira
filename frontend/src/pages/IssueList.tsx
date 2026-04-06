import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { SEVERITY_COLORS, STATUS_COLORS } from "../components/IssueCard";
import type { Issue, Severity, IssueStatus } from "../types";

const ALL_SEVERITIES: Severity[] = ["critical", "high", "medium", "low", "info"];
const ALL_STATUSES: IssueStatus[] = ["identified", "backlog", "in_progress", "done", "dismissed"];

export function IssueList() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [total, setTotal] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();

  const status = searchParams.get("status") as IssueStatus | null;
  const severity = searchParams.get("severity") as Severity | null;

  useEffect(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (severity) params.set("severity", severity);
    params.set("per_page", "50");
    api.getIssues(params.toString()).then((r) => {
      setIssues(r.items);
      setTotal(r.total);
    });
  }, [status, severity]);

  const setFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    setSearchParams(params);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2 style={{ margin: 0, fontSize: "18px" }}>Backlog ({total})</h2>
        <div style={{ display: "flex", gap: "8px" }}>
          <select
            value={severity || ""}
            onChange={(e) => setFilter("severity", e.target.value || null)}
            style={{ background: "var(--kira-bg-card)", color: "var(--kira-text-secondary)", border: "1px solid var(--kira-border)", borderRadius: "4px", padding: "6px" }}
          >
            <option value="">All Severities</option>
            {ALL_SEVERITIES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={status || ""}
            onChange={(e) => setFilter("status", e.target.value || null)}
            style={{ background: "var(--kira-bg-card)", color: "var(--kira-text-secondary)", border: "1px solid var(--kira-border)", borderRadius: "4px", padding: "6px" }}
          >
            <option value="">All Statuses</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace("_", " ")}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ background: "var(--kira-bg-card)", borderRadius: "6px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr style={{ color: "var(--kira-text-muted)", textTransform: "uppercase", fontSize: "11px" }}>
              <th style={{ textAlign: "left", padding: "8px 12px" }}>Severity</th>
              <th style={{ textAlign: "left", padding: "8px 12px" }}>Title</th>
              <th style={{ textAlign: "left", padding: "8px 12px" }}>Status</th>
              <th style={{ textAlign: "left", padding: "8px 12px" }}>Priority</th>
              <th style={{ textAlign: "left", padding: "8px 12px" }}>Ticket</th>
              <th style={{ textAlign: "left", padding: "8px 12px" }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {issues.map((issue) => (
              <tr key={issue.id} style={{ borderTop: "1px solid var(--kira-border-subtle)" }}>
                <td style={{ padding: "10px 12px" }}>
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
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <Link to={`/issues/${issue.id}`} style={{ color: "var(--kira-link)", textDecoration: "none" }}>
                    {issue.title}
                  </Link>
                </td>
                <td style={{ padding: "10px 12px" }}>
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
                </td>
                <td style={{ padding: "10px 12px", color: "var(--kira-text-muted)" }}>
                  {issue.priority ? `P${issue.priority}` : "\u2014"}
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <Link
                    to={`/tickets/${issue.ticket_id}`}
                    style={{ color: "var(--kira-link)", textDecoration: "none", fontSize: "11px" }}
                    title={issue.ticket_title}
                  >
                    {issue.ticket_title.length > 40 ? issue.ticket_title.slice(0, 40) + "\u2026" : issue.ticket_title}
                  </Link>
                </td>
                <td style={{ padding: "10px 12px", color: "var(--kira-text-muted)" }}>
                  {new Date(issue.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {issues.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: "20px", textAlign: "center", color: "var(--kira-text-muted)" }}>
                  No issues found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
