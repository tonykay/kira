# Human Ticket Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "New Ticket" button and form page so human operators can create tickets from the frontend UI.

**Architecture:** New CreateTicket page with form fields, risk/confidence sliders with info popovers (reusing existing components), mandatory comment. No backend changes — uses existing POST /tickets and POST /comments endpoints.

**Tech Stack:** React, existing Lozenge/InfoPopover components

---

## File Structure

```
frontend/src/
├── api/client.ts               # MODIFY: add createTicket method
├── components/Layout.tsx        # MODIFY: add "New Ticket" nav button
├── pages/CreateTicket.tsx       # NEW: ticket creation form
└── App.tsx                      # MODIFY: add /tickets/new route
```

---

## Task 1: API Client Method

**Files:**
- Modify: `frontend/src/api/client.ts`

- [ ] **Step 1: Add createTicket method to api object**

In `frontend/src/api/client.ts`, add before the `getEnums` line:

```typescript
  createTicket: (data: {
    title: string;
    description: string;
    area: string;
    confidence: number;
    risk: number;
    recommended_action: string;
    skills: string[];
    affected_systems: string[];
    source: string;
  }) =>
    request<import("../types").Ticket>("/tickets", {
      method: "POST",
      body: JSON.stringify(data),
    }),
```

- [ ] **Step 2: Verify compile**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/tok-jira/tok-jira/frontend
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/client.ts
git commit -m "feat: add createTicket method to API client"
```

---

## Task 2: CreateTicket Page

**Files:**
- Create: `frontend/src/pages/CreateTicket.tsx`

- [ ] **Step 1: Create the form page**

`frontend/src/pages/CreateTicket.tsx`:

```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { RiskLozenge, ConfidenceLozenge } from "../components/Lozenge";
import { InfoPopover } from "../components/InfoPopover";
import type { Area } from "../types";

const AREAS: Area[] = ["linux", "kubernetes", "networking", "database", "storage", "security", "application"];

export function CreateTicket() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [area, setArea] = useState<Area>("linux");
  const [description, setDescription] = useState("");
  const [recommendedAction, setRecommendedAction] = useState("");
  const [risk, setRisk] = useState(0.5);
  const [confidence, setConfidence] = useState(0.5);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [affectedSystems, setAffectedSystems] = useState<string[]>([]);
  const [systemInput, setSystemInput] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canSubmit =
    title.trim() &&
    description.trim() &&
    recommendedAction.trim() &&
    comment.trim() &&
    !submitting;

  const handleAddSkill = () => {
    const val = skillInput.trim().toLowerCase();
    if (val && !skills.includes(val)) {
      setSkills([...skills, val]);
    }
    setSkillInput("");
  };

  const handleAddSystem = () => {
    const val = systemInput.trim();
    if (val && !affectedSystems.includes(val)) {
      setAffectedSystems([...affectedSystems, val]);
    }
    setSystemInput("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");

    try {
      const ticket = await api.createTicket({
        title: title.trim(),
        description: description.trim(),
        area,
        confidence,
        risk,
        recommended_action: recommendedAction.trim(),
        skills,
        affected_systems: affectedSystems,
        source: "human",
      });
      await api.addComment(
        ticket.id,
        `[Ticket created manually] ${comment.trim()}`
      );
      navigate(`/tickets/${ticket.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create ticket");
      setSubmitting(false);
    }
  };

  const sectionStyle = {
    background: "var(--kira-bg-card)",
    borderRadius: "6px",
    padding: "16px",
    marginBottom: "12px",
  };

  const labelStyle = {
    fontSize: "11px",
    color: "var(--kira-text-muted)",
    textTransform: "uppercase" as const,
    marginBottom: "6px",
    display: "block",
  };

  const inputStyle = {
    width: "100%",
    padding: "8px",
    background: "var(--kira-bg-input)",
    border: "1px solid var(--kira-border)",
    borderRadius: "4px",
    color: "var(--kira-text-primary)",
    fontSize: "13px",
    boxSizing: "border-box" as const,
  };

  const textareaStyle = {
    ...inputStyle,
    minHeight: "80px",
    resize: "vertical" as const,
  };

  return (
    <div>
      <h2 style={{ fontSize: "18px", marginBottom: "16px" }}>New Ticket</h2>

      {error && (
        <div style={{ ...sectionStyle, borderLeft: "3px solid #ef4444", color: "#ef4444", fontSize: "13px" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Title and Area */}
        <div style={sectionStyle}>
          <div style={{ marginBottom: "12px" }}>
            <label style={labelStyle}>Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of the issue"
              maxLength={255}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Area *</label>
            <select
              value={area}
              onChange={(e) => setArea(e.target.value as Area)}
              style={{ ...inputStyle, width: "auto", minWidth: "150px" }}
            >
              {AREAS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Description / Analysis *</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Root cause analysis, evidence, timeline..."
            style={textareaStyle}
          />
        </div>

        {/* Recommended Action */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Recommended Action *</label>
          <textarea
            value={recommendedAction}
            onChange={(e) => setRecommendedAction(e.target.value)}
            placeholder="What should be done to resolve this issue"
            style={{ ...textareaStyle, minHeight: "60px" }}
          />
        </div>

        {/* Risk and Confidence */}
        <div style={{ ...sectionStyle, display: "flex", gap: "24px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Risk *</label>
              <InfoPopover type="risk" />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={risk}
                onChange={(e) => setRisk(parseFloat(e.target.value))}
                style={{ flex: 1 }}
              />
              <RiskLozenge value={risk} />
            </div>
          </div>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Confidence *</label>
              <InfoPopover type="confidence" />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={confidence}
                onChange={(e) => setConfidence(parseFloat(e.target.value))}
                style={{ flex: 1 }}
              />
              <ConfidenceLozenge value={confidence} />
            </div>
          </div>
        </div>

        {/* Skills */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Skills</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "8px" }}>
            {skills.map((s) => (
              <span
                key={s}
                style={{
                  background: "var(--kira-border)",
                  color: "var(--kira-text-secondary)",
                  padding: "2px 8px",
                  borderRadius: "8px",
                  fontSize: "11px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                {s}
                <button
                  type="button"
                  onClick={() => setSkills(skills.filter((x) => x !== s))}
                  style={{ background: "none", border: "none", color: "var(--kira-text-muted)", cursor: "pointer", padding: 0, fontSize: "11px" }}
                >
                  {"\u00d7"}
                </button>
              </span>
            ))}
          </div>
          <input
            type="text"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSkill(); } }}
            placeholder="Type skill and press Enter"
            style={{ ...inputStyle, width: "200px" }}
          />
        </div>

        {/* Affected Systems */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Affected Systems</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "8px" }}>
            {affectedSystems.map((s) => (
              <code
                key={s}
                style={{
                  background: "var(--kira-bg-input)",
                  padding: "2px 8px",
                  borderRadius: "3px",
                  fontSize: "11px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                {s}
                <button
                  type="button"
                  onClick={() => setAffectedSystems(affectedSystems.filter((x) => x !== s))}
                  style={{ background: "none", border: "none", color: "var(--kira-text-muted)", cursor: "pointer", padding: 0, fontSize: "11px" }}
                >
                  {"\u00d7"}
                </button>
              </code>
            ))}
          </div>
          <input
            type="text"
            value={systemInput}
            onChange={(e) => setSystemInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSystem(); } }}
            placeholder="Hostname or service, press Enter"
            style={{ ...inputStyle, width: "250px" }}
          />
        </div>

        {/* Comment */}
        <div style={{ ...sectionStyle, borderLeft: "3px solid var(--kira-accent)" }}>
          <label style={labelStyle}>Comment * (why is this ticket being created manually?)</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="e.g., Observed during routine monitoring, not detected by agents"
            style={textareaStyle}
          />
        </div>

        {/* Submit */}
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={() => navigate("/tickets")}
            style={{
              padding: "8px 16px",
              background: "var(--kira-btn-bg)",
              border: "1px solid var(--kira-btn-border)",
              borderRadius: "4px",
              color: "var(--kira-btn-text)",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              padding: "8px 16px",
              background: canSubmit ? "var(--kira-accent)" : "var(--kira-border)",
              color: canSubmit ? "white" : "var(--kira-text-muted)",
              border: "none",
              borderRadius: "4px",
              cursor: canSubmit ? "pointer" : "not-allowed",
              fontSize: "13px",
            }}
          >
            {submitting ? "Creating..." : "Create Ticket"}
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Verify compile**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/tok-jira/tok-jira/frontend
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/CreateTicket.tsx
git commit -m "feat: add CreateTicket page with sliders, info popovers, and mandatory comment"
```

---

## Task 3: Wire Route and Nav Button

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/Layout.tsx`

- [ ] **Step 1: Add route to App.tsx**

Replace `frontend/src/App.tsx` with:

```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./theme/ThemeProvider";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { TicketList } from "./pages/TicketList";
import { CreateTicket } from "./pages/CreateTicket";
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
            <Route path="/tickets/new" element={<CreateTicket />} />
            <Route path="/tickets/:id" element={<TicketDetail />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
```

Note: `/tickets/new` must come BEFORE `/tickets/:id` so React Router matches it as a literal path, not as an `:id` parameter.

- [ ] **Step 2: Add "New Ticket" button to Layout nav**

In `frontend/src/components/Layout.tsx`, replace the nav links div (the `<div style={{ display: "flex", gap: "20px"...` block, lines 35-44) with:

```tsx
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
          {user.role !== "viewer" && (
            <Link
              to="/tickets/new"
              style={{
                background: "var(--kira-accent)",
                color: "white",
                padding: "4px 10px",
                borderRadius: "4px",
                fontSize: "12px",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              + New Ticket
            </Link>
          )}
        </div>
```

- [ ] **Step 3: Verify build**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/tok-jira/tok-jira/frontend
npm run build
```

Expected: Build succeeds

- [ ] **Step 4: Run backend tests**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/tok-jira/tok-jira
uv run pytest tests/ -v
```

Expected: All 44 tests pass

- [ ] **Step 5: Commit and push**

```bash
git add frontend/src/App.tsx frontend/src/components/Layout.tsx
git commit -m "feat: add New Ticket nav button and /tickets/new route"
git push
```
