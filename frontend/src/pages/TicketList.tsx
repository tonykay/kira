import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { AreaLozenge, ConfidenceLozenge, RiskLozenge, StageLozenge, StatusLozenge } from "../components/Lozenge";
import { SkillTag } from "../components/SkillTag";
import type { Ticket, Area, Status } from "../types";

export function TicketList() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();

  const area = searchParams.get("area") as Area | null;
  const status = searchParams.get("status") as Status | null;

  useEffect(() => {
    const params = new URLSearchParams();
    if (area) params.set("area", area);
    if (status) params.set("status", status);
    params.set("per_page", "50");
    api.getTickets(params.toString()).then((r) => {
      setTickets(r.items);
      setTotal(r.total);
    });
  }, [area, status]);

  const setFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    setSearchParams(params);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2 style={{ margin: 0, fontSize: "18px" }}>Tickets ({total})</h2>
        <div style={{ display: "flex", gap: "8px" }}>
          <select
            value={area || ""}
            onChange={(e) => setFilter("area", e.target.value || null)}
            style={{ background: "var(--kira-bg-card)", color: "var(--kira-text-secondary)", border: "1px solid var(--kira-border)", borderRadius: "4px", padding: "6px" }}
          >
            <option value="">All Areas</option>
            <option value="linux">Linux</option>
            <option value="kubernetes">Kubernetes</option>
            <option value="networking">Networking</option>
            <option value="database">Database</option>
            <option value="storage">Storage</option>
            <option value="security">Security</option>
            <option value="application">Application</option>
          </select>
          <select
            value={status || ""}
            onChange={(e) => setFilter("status", e.target.value || null)}
            style={{ background: "var(--kira-bg-card)", color: "var(--kira-text-secondary)", border: "1px solid var(--kira-border)", borderRadius: "4px", padding: "6px" }}
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      <div style={{ background: "var(--kira-bg-card)", borderRadius: "6px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr style={{ color: "var(--kira-text-muted)", textTransform: "uppercase", fontSize: "11px" }}>
              <th style={{ textAlign: "left", padding: "8px 12px" }}>Title</th>
              <th style={{ textAlign: "left", padding: "8px 12px" }}>Area</th>
              <th style={{ textAlign: "left", padding: "8px 12px" }}>Stage</th>
              <th style={{ textAlign: "left", padding: "8px 12px" }}>Skills</th>
              <th style={{ textAlign: "left", padding: "8px 12px" }}>Risk</th>
              <th style={{ textAlign: "left", padding: "8px 12px" }}>Confidence</th>
              <th style={{ textAlign: "left", padding: "8px 12px" }}>Status</th>
              <th style={{ textAlign: "left", padding: "8px 12px" }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id} style={{ borderTop: "1px solid var(--kira-border-subtle)" }}>
                <td style={{ padding: "10px 12px" }}>
                  <Link to={`/tickets/${t.id}`} style={{ color: "var(--kira-link)", textDecoration: "none" }}>
                    {t.title}
                  </Link>
                </td>
                <td style={{ padding: "10px 12px" }}><AreaLozenge area={t.area} /></td>
                <td style={{ padding: "10px 12px" }}><StageLozenge stage={t.stage} /></td>
                <td style={{ padding: "10px 12px" }}>
                  <div style={{ display: "flex", gap: "3px", flexWrap: "wrap" }}>
                    {t.skills.map((s) => <SkillTag key={s} skill={s} />)}
                  </div>
                </td>
                <td style={{ padding: "10px 12px" }}><RiskLozenge value={t.risk} /></td>
                <td style={{ padding: "10px 12px" }}><ConfidenceLozenge value={t.confidence} /></td>
                <td style={{ padding: "10px 12px" }}><StatusLozenge status={t.status} /></td>
                <td style={{ padding: "10px 12px", color: "var(--kira-text-muted)" }}>
                  {new Date(t.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
