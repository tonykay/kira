import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { api } from "../api/client";
import { AreaLozenge, ConfidenceLozenge, RiskLozenge, StatusLozenge } from "../components/Lozenge";
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
  const riskData = [
    { name: "High", count: stats.risk_distribution.high, fill: "#ef4444" },
    { name: "Med", count: stats.risk_distribution.medium, fill: "#f59e0b" },
    { name: "Low", count: stats.risk_distribution.low, fill: "#22c55e" },
  ];

  const cards = [
    { label: "Open", value: stats.open, color: "#ef4444" },
    { label: "In Progress", value: stats.in_progress, color: "#f59e0b" },
    { label: "Resolved", value: stats.resolved, color: "#22c55e" },
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
              borderRadius: "6px",
              padding: "14px",
              borderLeft: `3px solid ${c.color}`,
            }}
          >
            <div style={{ fontSize: "11px", color: "var(--kira-text-muted)", textTransform: "uppercase" }}>{c.label}</div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: "300px", background: "var(--kira-bg-card)", borderRadius: "6px", padding: "14px" }}>
          <div style={{ fontSize: "12px", color: "var(--kira-text-muted)", marginBottom: "12px" }}>Tickets by Area</div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={areaData}>
              <XAxis dataKey="name" tick={{ fill: "var(--kira-text-muted)", fontSize: 10 }} />
              <YAxis tick={{ fill: "var(--kira-text-muted)", fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="var(--kira-accent)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ flex: 1, minWidth: "300px", background: "var(--kira-bg-card)", borderRadius: "6px", padding: "14px" }}>
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

      <div style={{ background: "var(--kira-bg-card)", borderRadius: "6px", overflow: "hidden" }}>
        <div style={{ fontSize: "12px", color: "var(--kira-text-muted)", padding: "12px", borderBottom: "1px solid var(--kira-border)" }}>
          Recent Tickets
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr style={{ color: "var(--kira-text-muted)", textTransform: "uppercase", fontSize: "11px" }}>
              <th style={{ textAlign: "left", padding: "8px 12px" }}>Title</th>
              <th style={{ textAlign: "left", padding: "8px 12px" }}>Area</th>
              <th style={{ textAlign: "left", padding: "8px 12px" }}>Risk</th>
              <th style={{ textAlign: "left", padding: "8px 12px" }}>Confidence</th>
              <th style={{ textAlign: "left", padding: "8px 12px" }}>Status</th>
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
