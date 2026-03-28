# Kira Theming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a theme system with Solarized-inspired dark default and light theme option, toggled via nav bar button.

**Architecture:** CSS custom properties defined per theme, injected via a React Context provider. A `useTheme()` hook gives components access to the toggle. All hardcoded hex colors in inline styles are replaced with `var(--kira-*)` references.

**Tech Stack:** React Context, CSS custom properties, localStorage

---

## File Structure

```
frontend/src/
├── theme/
│   ├── themes.ts              # Dark + light palette definitions
│   └── ThemeProvider.tsx       # Context, CSS var injection, useTheme hook
├── components/
│   ├── Layout.tsx              # MODIFY: use vars, add toggle button
│   ├── Lozenge.tsx             # MODIFY: status lozenge theme-aware opacity
│   └── AuditTimeline.tsx       # MODIFY: use vars
├── pages/
│   ├── Login.tsx               # MODIFY: use vars
│   ├── Dashboard.tsx           # MODIFY: use vars
│   ├── TicketList.tsx          # MODIFY: use vars
│   └── TicketDetail.tsx        # MODIFY: use vars
└── App.tsx                     # MODIFY: wrap with ThemeProvider
```

---

## Task 1: Theme Definitions and Provider

**Files:**
- Create: `frontend/src/theme/themes.ts`
- Create: `frontend/src/theme/ThemeProvider.tsx`

- [ ] **Step 1: Create theme token definitions**

`frontend/src/theme/themes.ts`:

```typescript
export interface ThemeTokens {
  "--kira-bg-page": string;
  "--kira-bg-card": string;
  "--kira-bg-input": string;
  "--kira-text-primary": string;
  "--kira-text-secondary": string;
  "--kira-text-muted": string;
  "--kira-border": string;
  "--kira-border-subtle": string;
  "--kira-accent": string;
  "--kira-nav-bg": string;
  "--kira-link": string;
  "--kira-btn-bg": string;
  "--kira-btn-border": string;
  "--kira-btn-text": string;
  "--kira-status-opacity": string;
}

export const darkTheme: ThemeTokens = {
  "--kira-bg-page": "#002b36",
  "--kira-bg-card": "#073642",
  "--kira-bg-input": "#002b36",
  "--kira-text-primary": "#93a1a1",
  "--kira-text-secondary": "#839496",
  "--kira-text-muted": "#586e75",
  "--kira-border": "rgba(42, 161, 152, 0.2)",
  "--kira-border-subtle": "rgba(42, 161, 152, 0.1)",
  "--kira-accent": "#268bd2",
  "--kira-nav-bg": "#073642",
  "--kira-link": "#93a1a1",
  "--kira-btn-bg": "transparent",
  "--kira-btn-border": "#586e75",
  "--kira-btn-text": "#839496",
  "--kira-status-opacity": "0.13",
};

export const lightTheme: ThemeTokens = {
  "--kira-bg-page": "#fdf6e3",
  "--kira-bg-card": "#eee8d5",
  "--kira-bg-input": "#fdf6e3",
  "--kira-text-primary": "#073642",
  "--kira-text-secondary": "#586e75",
  "--kira-text-muted": "#93a1a1",
  "--kira-border": "rgba(147, 161, 161, 0.3)",
  "--kira-border-subtle": "rgba(147, 161, 161, 0.15)",
  "--kira-accent": "#268bd2",
  "--kira-nav-bg": "#eee8d5",
  "--kira-link": "#073642",
  "--kira-btn-bg": "transparent",
  "--kira-btn-border": "#93a1a1",
  "--kira-btn-text": "#586e75",
  "--kira-status-opacity": "0.15",
};

export type ThemeName = "dark" | "light";

export const themes: Record<ThemeName, ThemeTokens> = {
  dark: darkTheme,
  light: lightTheme,
};
```

- [ ] **Step 2: Create ThemeProvider**

`frontend/src/theme/ThemeProvider.tsx`:

```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { themes, type ThemeName, type ThemeTokens } from "./themes";

interface ThemeContextValue {
  theme: ThemeName;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function applyTheme(name: ThemeName) {
  const tokens: ThemeTokens = themes[name];
  const root = document.documentElement;
  for (const [key, value] of Object.entries(tokens)) {
    root.style.setProperty(key, value);
  }
  root.setAttribute("data-theme", name);
}

function getInitialTheme(): ThemeName {
  const stored = localStorage.getItem("kira-theme");
  if (stored === "dark" || stored === "light") return stored;
  return "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("kira-theme", next);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

- [ ] **Step 3: Verify files compile**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/tok-jira/tok-jira/frontend
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/theme/
git commit -m "feat: add theme definitions and ThemeProvider with dark/light support"
```

---

## Task 2: Wire ThemeProvider into App and Update Layout with Toggle

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/Layout.tsx`

- [ ] **Step 1: Wrap App with ThemeProvider**

Replace `frontend/src/App.tsx` with:

```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./theme/ThemeProvider";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { TicketList } from "./pages/TicketList";
import { TicketDetail } from "./pages/TicketDetail";

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tickets" element={<TicketList />} />
            <Route path="/tickets/:id" element={<TicketDetail />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
```

- [ ] **Step 2: Update Layout with theme vars and toggle button**

Replace `frontend/src/components/Layout.tsx` with:

```tsx
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useTheme } from "../theme/ThemeProvider";
import type { User } from "../types";

export function Layout() {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    api.me().then(setUser).catch(() => navigate("/login"));
  }, [navigate]);

  const handleLogout = async () => {
    await api.logout();
    navigate("/login");
  };

  if (!user) return null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--kira-bg-page)", color: "var(--kira-text-primary)" }}>
      <nav
        style={{
          background: "var(--kira-nav-bg)",
          padding: "10px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--kira-border)",
        }}
      >
        <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
          <Link to="/" style={{ fontWeight: "bold", fontSize: "16px", color: "var(--kira-accent)", textDecoration: "none" }}>
            Kira
          </Link>
          <Link to="/" style={{ color: "var(--kira-text-secondary)", fontSize: "13px", textDecoration: "none" }}>
            Dashboard
          </Link>
          <Link to="/tickets" style={{ color: "var(--kira-text-secondary)", fontSize: "13px", textDecoration: "none" }}>
            Tickets
          </Link>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ color: "var(--kira-text-muted)", fontSize: "12px" }}>
            {user.display_name} ({user.tier || user.role})
          </span>
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            style={{
              background: "none",
              border: "1px solid var(--kira-btn-border)",
              color: "var(--kira-btn-text)",
              padding: "4px 8px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
              lineHeight: 1,
            }}
          >
            {theme === "dark" ? "\u2600" : "\u263E"}
          </button>
          <button
            onClick={handleLogout}
            style={{
              background: "var(--kira-btn-bg)",
              border: "1px solid var(--kira-btn-border)",
              color: "var(--kira-btn-text)",
              padding: "4px 10px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            Logout
          </button>
        </div>
      </nav>
      <main style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Verify it compiles and renders**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/tok-jira/tok-jira/frontend
npm run build
```

Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.tsx frontend/src/components/Layout.tsx
git commit -m "feat: wire ThemeProvider, add theme toggle to nav bar"
```

---

## Task 3: Update Login Page

**Files:**
- Modify: `frontend/src/pages/Login.tsx`

- [ ] **Step 1: Replace hardcoded colors with theme vars**

Replace `frontend/src/pages/Login.tsx` with:

```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

export function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.login(username, password);
      navigate("/");
    } catch {
      setError("Invalid credentials");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--kira-bg-page)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: "var(--kira-bg-card)",
          padding: "32px",
          borderRadius: "8px",
          width: "320px",
        }}
      >
        <h2 style={{ color: "var(--kira-accent)", marginBottom: "24px", textAlign: "center" }}>Kira</h2>
        {error && (
          <div style={{ color: "#ef4444", fontSize: "13px", marginBottom: "12px", textAlign: "center" }}>
            {error}
          </div>
        )}
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "12px",
            background: "var(--kira-bg-input)",
            border: "1px solid var(--kira-border)",
            borderRadius: "4px",
            color: "var(--kira-text-primary)",
            fontSize: "14px",
            boxSizing: "border-box",
          }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "16px",
            background: "var(--kira-bg-input)",
            border: "1px solid var(--kira-border)",
            borderRadius: "4px",
            color: "var(--kira-text-primary)",
            fontSize: "14px",
            boxSizing: "border-box",
          }}
        />
        <button
          type="submit"
          style={{
            width: "100%",
            padding: "10px",
            background: "var(--kira-accent)",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          Sign In
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Login.tsx
git commit -m "feat: theme Login page with CSS variables"
```

---

## Task 4: Update Dashboard Page

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx`

- [ ] **Step 1: Replace hardcoded colors with theme vars**

Replace `frontend/src/pages/Dashboard.tsx` with:

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Dashboard.tsx
git commit -m "feat: theme Dashboard page with CSS variables"
```

---

## Task 5: Update Lozenge and AuditTimeline Components

**Files:**
- Modify: `frontend/src/components/Lozenge.tsx`
- Modify: `frontend/src/components/AuditTimeline.tsx`

- [ ] **Step 1: Update StatusLozenge to use theme-aware opacity**

Replace `frontend/src/components/Lozenge.tsx` with:

```tsx
import type { Area } from "../types";

const AREA_COLORS: Record<Area, string> = {
  linux: "#7c3aed",
  kubernetes: "#2563eb",
  networking: "#0891b2",
  database: "#059669",
  storage: "#d97706",
  security: "#dc2626",
  application: "#6366f1",
};

function riskColor(value: number): string {
  if (value >= 0.7) return "#ef4444";
  if (value >= 0.4) return "#f59e0b";
  return "#22c55e";
}

function confidenceColor(value: number): string {
  if (value >= 0.7) return "#22c55e";
  if (value >= 0.4) return "#f59e0b";
  return "#ef4444";
}

function label(value: number): string {
  if (value >= 0.7) return "high";
  if (value >= 0.4) return "med";
  return "low";
}

const style = (bg: string) =>
  ({
    background: bg,
    color: "white",
    padding: "2px 8px",
    borderRadius: "10px",
    fontSize: "11px",
    fontWeight: 500,
    display: "inline-block",
    whiteSpace: "nowrap" as const,
  }) as const;

export function AreaLozenge({ area }: { area: Area }) {
  return <span style={style(AREA_COLORS[area])}>{area}</span>;
}

export function RiskLozenge({ value }: { value: number }) {
  return (
    <span style={style(riskColor(value))}>
      {label(value)} {value.toFixed(1)}
    </span>
  );
}

export function ConfidenceLozenge({ value }: { value: number }) {
  return (
    <span style={style(confidenceColor(value))}>
      {label(value)} {value.toFixed(1)}
    </span>
  );
}

const STATUS_TEXT_COLORS: Record<string, string> = {
  open: "#ef4444",
  acknowledged: "#f59e0b",
  in_progress: "#3b82f6",
  resolved: "#22c55e",
  closed: "#6b7280",
};

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

export function StatusLozenge({ status }: { status: string }) {
  const textColor = STATUS_TEXT_COLORS[status] || STATUS_TEXT_COLORS.open;
  return (
    <span
      style={{
        background: `rgba(${hexToRgb(textColor)}, var(--kira-status-opacity))`,
        color: textColor,
        padding: "2px 8px",
        borderRadius: "10px",
        fontSize: "11px",
        fontWeight: 500,
      }}
    >
      {status.replace("_", " ")}
    </span>
  );
}
```

- [ ] **Step 2: Update AuditTimeline with theme vars**

Replace `frontend/src/components/AuditTimeline.tsx` with:

```tsx
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
            borderBottom: "1px solid var(--kira-border-subtle)",
            fontSize: "12px",
          }}
        >
          <div style={{ color: "var(--kira-text-muted)", minWidth: "140px", whiteSpace: "nowrap" }}>
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
            <span style={{ color: "var(--kira-text-secondary)" }}>{entry.actor_name}</span>
            {entry.actor_tier && (
              <span style={{ color: "var(--kira-text-muted)", marginLeft: "4px" }}>({entry.actor_tier})</span>
            )}
            <span style={{ color: "var(--kira-text-muted)", marginLeft: "8px" }}>
              {entry.action.replace(/_/g, " ")}
            </span>
            {entry.old_value && entry.new_value && (
              <span style={{ color: "var(--kira-text-muted)", marginLeft: "8px" }}>
                {JSON.stringify(entry.old_value)} → {JSON.stringify(entry.new_value)}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Lozenge.tsx frontend/src/components/AuditTimeline.tsx
git commit -m "feat: theme Lozenge and AuditTimeline components"
```

---

## Task 6: Update TicketList and TicketDetail Pages

**Files:**
- Modify: `frontend/src/pages/TicketList.tsx`
- Modify: `frontend/src/pages/TicketDetail.tsx`

- [ ] **Step 1: Update TicketList with theme vars**

Replace `frontend/src/pages/TicketList.tsx` with:

```tsx
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { AreaLozenge, ConfidenceLozenge, RiskLozenge, StatusLozenge } from "../components/Lozenge";
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
```

- [ ] **Step 2: Update TicketDetail with theme vars**

Replace `frontend/src/pages/TicketDetail.tsx` with:

```tsx
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
```

- [ ] **Step 3: Verify full build**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/tok-jira/tok-jira/frontend
npm run build
```

Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/TicketList.tsx frontend/src/pages/TicketDetail.tsx
git commit -m "feat: theme TicketList and TicketDetail pages"
```

---

## Task 7: Verify and Final Commit

- [ ] **Step 1: Run full frontend build**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/tok-jira/tok-jira/frontend
npm run build
```

Expected: Build succeeds with no TypeScript errors

- [ ] **Step 2: Run backend tests to confirm no regression**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/tok-jira/tok-jira
uv run pytest tests/ -v
```

Expected: All 34 tests pass

- [ ] **Step 3: Push**

```bash
git push
```
