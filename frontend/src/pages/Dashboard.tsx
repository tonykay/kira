import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { api } from "../api/client";
import { AreaLozenge, ConfidenceLozenge, RiskLozenge, StatusLozenge } from "../components/Lozenge";
import { SkillTag } from "../components/SkillTag";
import type { DashboardStats, Ticket } from "../types";

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    api.getDashboard().then(setStats);
    api.getTickets("per_page=10").then((r) => setTickets(r.items));
  }, []);

  if (!stats) return <div style={{ color: "var(--kira-text-muted)" }}>Loading...</div>;

  const areaData = Object.entries(stats.by_area).map(([name, count]) => ({ name, count }));
  const AREA_CHART_COLORS: Record<string, string> = {
    linux: "#7c3aed",
    kubernetes: "#2563eb",
    networking: "#0891b2",
    database: "#059669",
    storage: "#d97706",
    security: "#dc2626",
    application: "#6366f1",
  };
  const riskData = [
    { name: "High", count: stats.risk_distribution.high, fill: "#dc2626" },
    { name: "Med", count: stats.risk_distribution.medium, fill: "#d97706" },
    { name: "Low", count: stats.risk_distribution.low, fill: "#16a34a" },
  ];

  const cards = [
    { label: "Open", value: stats.open, color: "#dc2626" },
    { label: "In Progress", value: stats.in_progress, color: "#2563eb" },
    { label: "Resolved", value: stats.resolved, color: "#16a34a" },
    { label: "Avg Confidence", value: stats.avg_confidence?.toFixed(2) ?? "\u2014", color: "var(--kira-accent)" },
  ];

  return (
    <div>
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
        {cards.map((c) => (
          <div
            key={c.label}
            style={{
              flex: 1,
              minWidth: "120px",
              background: "var(--kira-bg-card)",
              borderRadius: "8px",
              padding: "14px",
              boxShadow: "var(--kira-shadow-sm)",
              border: "1px solid var(--kira-border)",
            }}
          >
            <div style={{ fontSize: "11px", color: "var(--kira-text-muted)", textTransform: "uppercase" }}>{c.label}</div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: "300px", background: "var(--kira-bg-card)", borderRadius: "8px", padding: "14px", boxShadow: "var(--kira-shadow-sm)", border: "1px solid var(--kira-border)" }}>
          <div style={{ fontSize: "12px", color: "var(--kira-text-muted)", marginBottom: "12px" }}>Tickets by Area</div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={areaData}>
              <XAxis dataKey="name" tick={{ fill: "var(--kira-text-muted)", fontSize: 10 }} />
              <YAxis tick={{ fill: "var(--kira-text-muted)", fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {areaData.map((entry, index) => (
                  <Cell key={index} fill={AREA_CHART_COLORS[entry.name] || "#6366f1"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ flex: 1, minWidth: "300px", background: "var(--kira-bg-card)", borderRadius: "8px", padding: "14px", boxShadow: "var(--kira-shadow-sm)", border: "1px solid var(--kira-border)" }}>
          <div style={{ fontSize: "12px", color: "var(--kira-text-muted)", marginBottom: "12px" }}>Risk Distribution</div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={riskData} layout="vertical">
              <XAxis type="number" tick={{ fill: "var(--kira-text-muted)", fontSize: 10 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: "var(--kira-text-muted)", fontSize: 10 }} width={40} />
              <Tooltip />
              <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                {riskData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ background: "var(--kira-bg-card)", borderRadius: "8px", overflow: "hidden", boxShadow: "var(--kira-shadow-sm)", border: "1px solid var(--kira-border)" }}>
        <div style={{ fontSize: "12px", color: "var(--kira-text-muted)", padding: "12px", borderBottom: "1px solid var(--kira-border)" }}>
          Recent Tickets
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr style={{ color: "var(--kira-text-muted)", textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.5px", fontWeight: 600 }}>
              <th style={{ textAlign: "left", padding: "8px 12px", width: "50px" }}>#</th>
              <th style={{ textAlign: "left", padding: "8px 12px" }}>Title</th>
              <th style={{ textAlign: "left", padding: "8px 12px" }}>Area</th>
              <th style={{ textAlign: "left", padding: "8px 12px" }}>Skills</th>
              <th style={{ textAlign: "left", padding: "8px 12px" }}>Risk</th>
              <th style={{ textAlign: "left", padding: "8px 12px" }}>Confidence</th>
              <th style={{ textAlign: "left", padding: "8px 12px" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id} style={{ borderTop: "1px solid var(--kira-border-subtle)" }}>
                <td style={{ padding: "10px 12px", color: "var(--kira-accent)", fontWeight: 600 }}>
                  #{t.ticket_number}
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <Link to={`/tickets/${t.id}`} style={{ color: "var(--kira-link)", textDecoration: "none" }}>
                    {t.title}
                  </Link>
                </td>
                <td style={{ padding: "10px 12px" }}><AreaLozenge area={t.area} /></td>
                <td style={{ padding: "10px 12px" }}>
                  <div style={{ display: "flex", gap: "3px", flexWrap: "wrap" }}>
                    {t.skills.map((s) => <SkillTag key={s} skill={s} />)}
                  </div>
                </td>
                <td style={{ padding: "10px 12px" }}><RiskLozenge value={t.risk} /></td>
                <td style={{ padding: "10px 12px" }}><ConfidenceLozenge value={t.confidence} /></td>
                <td style={{ padding: "10px 12px" }}><StatusLozenge status={t.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
