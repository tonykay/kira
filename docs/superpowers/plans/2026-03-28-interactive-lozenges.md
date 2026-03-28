# Interactive Lozenges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Risk and Confidence lozenges clickable on TicketDetail, with a slider + mandatory comment dialog and info popovers showing scale guidelines.

**Architecture:** Two new components (ValueEditDialog, InfoPopover) plus editable lozenge wrappers in Lozenge.tsx. TicketDetail wires up dialog state and API calls. No backend changes — uses existing PATCH and comment endpoints.

**Tech Stack:** React, CSS custom properties (existing theme system)

---

## File Structure

```
frontend/src/components/
├── ValueEditDialog.tsx      # NEW: Modal with slider, preview lozenge, comment textarea
├── InfoPopover.tsx           # NEW: Scale breakdown popover
├── Lozenge.tsx               # MODIFY: add EditableRiskLozenge, EditableConfidenceLozenge exports
frontend/src/pages/
└── TicketDetail.tsx           # MODIFY: use editable lozenges, manage dialog state
```

---

## Task 1: InfoPopover Component

**Files:**
- Create: `frontend/src/components/InfoPopover.tsx`

- [ ] **Step 1: Create InfoPopover**

`frontend/src/components/InfoPopover.tsx`:

```tsx
import { useEffect, useRef, useState } from "react";

interface ScaleEntry {
  range: string;
  label: string;
  description: string;
}

const RISK_SCALE: ScaleEntry[] = [
  { range: "0.0\u20130.3", label: "Low", description: "Routine issue, minimal blast radius, safe to action" },
  { range: "0.4\u20130.6", label: "Medium", description: "Some risk of disruption, review recommended before action" },
  { range: "0.7\u20131.0", label: "High", description: "Significant risk \u2014 service restart, data impact, or production-affecting. Requires SME validation" },
];

const CONFIDENCE_SCALE: ScaleEntry[] = [
  { range: "0.0\u20130.3", label: "Low", description: "Weak evidence, multiple possible root causes, needs investigation" },
  { range: "0.4\u20130.6", label: "Medium", description: "Partial evidence supports diagnosis, some uncertainty remains" },
  { range: "0.7\u20131.0", label: "High", description: "Strong evidence, diagnosis well-supported, high certainty in root cause" },
];

interface InfoPopoverProps {
  type: "risk" | "confidence";
}

export function InfoPopover({ type }: InfoPopoverProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const scale = type === "risk" ? RISK_SCALE : CONFIDENCE_SCALE;
  const title = type === "risk" ? "Risk Scale" : "Confidence Scale";

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <span style={{ position: "relative", display: "inline-block" }} ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        title={`${title} guidelines`}
        style={{
          background: "none",
          border: "none",
          color: "var(--kira-text-muted)",
          cursor: "pointer",
          fontSize: "11px",
          padding: "0 4px",
          fontStyle: "italic",
          opacity: 0.7,
        }}
      >
        (i)
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            marginTop: "4px",
            background: "var(--kira-bg-card)",
            border: "1px solid var(--kira-border)",
            borderRadius: "6px",
            padding: "12px",
            width: "280px",
            zIndex: 100,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--kira-text-primary)", marginBottom: "8px" }}>
            {title}
          </div>
          {scale.map((entry) => (
            <div key={entry.range} style={{ marginBottom: "8px", fontSize: "11px" }}>
              <div style={{ color: "var(--kira-text-secondary)", fontWeight: 500 }}>
                {entry.range} ({entry.label})
              </div>
              <div style={{ color: "var(--kira-text-muted)", marginTop: "2px" }}>
                {entry.description}
              </div>
            </div>
          ))}
        </div>
      )}
    </span>
  );
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/tok-jira/tok-jira/frontend
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/InfoPopover.tsx
git commit -m "feat: add InfoPopover component with risk/confidence scale guidelines"
```

---

## Task 2: ValueEditDialog Component

**Files:**
- Create: `frontend/src/components/ValueEditDialog.tsx`

- [ ] **Step 1: Create ValueEditDialog**

`frontend/src/components/ValueEditDialog.tsx`:

```tsx
import { useState } from "react";

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

function valueLabel(value: number): string {
  if (value >= 0.7) return "high";
  if (value >= 0.4) return "med";
  return "low";
}

interface ValueEditDialogProps {
  type: "risk" | "confidence";
  currentValue: number;
  onSave: (newValue: number, comment: string) => Promise<void>;
  onCancel: () => void;
}

export function ValueEditDialog({ type, currentValue, onSave, onCancel }: ValueEditDialogProps) {
  const [value, setValue] = useState(currentValue);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const colorFn = type === "risk" ? riskColor : confidenceColor;
  const title = type === "risk" ? "Update Risk" : "Update Confidence";
  const hasChanged = Math.abs(value - currentValue) > 0.001;
  const canSave = hasChanged && comment.trim().length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    await onSave(value, comment.trim());
    setSaving(false);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        style={{
          background: "var(--kira-bg-card)",
          border: "1px solid var(--kira-border)",
          borderRadius: "8px",
          padding: "24px",
          width: "360px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        }}
      >
        <h3 style={{ margin: "0 0 16px", fontSize: "15px", color: "var(--kira-text-primary)" }}>{title}</h3>

        {/* Preview lozenge */}
        <div style={{ textAlign: "center", marginBottom: "16px" }}>
          <span
            style={{
              background: colorFn(value),
              color: "white",
              padding: "4px 12px",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            {valueLabel(value)} {value.toFixed(2)}
          </span>
        </div>

        {/* Slider */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "var(--kira-text-muted)", marginBottom: "4px" }}>
            <span>0.0</span>
            <span>0.5</span>
            <span>1.0</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={value}
            onChange={(e) => setValue(parseFloat(e.target.value))}
            style={{ width: "100%", accentColor: colorFn(value) }}
          />
          <div style={{ fontSize: "11px", color: "var(--kira-text-muted)", marginTop: "4px" }}>
            Previous: {currentValue.toFixed(2)}
          </div>
        </div>

        {/* Comment */}
        <div style={{ marginBottom: "16px" }}>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Reason for change (required)"
            style={{
              width: "100%",
              background: "var(--kira-bg-input)",
              border: "1px solid var(--kira-border)",
              borderRadius: "4px",
              color: "var(--kira-text-primary)",
              padding: "8px",
              fontSize: "13px",
              minHeight: "60px",
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button
            onClick={onCancel}
            style={{
              padding: "6px 14px",
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
            onClick={handleSave}
            disabled={!canSave}
            style={{
              padding: "6px 14px",
              background: canSave ? "var(--kira-accent)" : "var(--kira-border)",
              border: "none",
              borderRadius: "4px",
              color: canSave ? "white" : "var(--kira-text-muted)",
              cursor: canSave ? "pointer" : "not-allowed",
              fontSize: "12px",
            }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/tok-jira/tok-jira/frontend
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ValueEditDialog.tsx
git commit -m "feat: add ValueEditDialog with slider, preview lozenge, and mandatory comment"
```

---

## Task 3: Add Editable Lozenge Variants to Lozenge.tsx

**Files:**
- Modify: `frontend/src/components/Lozenge.tsx`

- [ ] **Step 1: Export color/label functions and add editable variants**

Append the following to the end of `frontend/src/components/Lozenge.tsx` (after the existing `StatusLozenge` component):

```tsx
// --- Exported utilities for ValueEditDialog ---
export { riskColor, confidenceColor, label as valueLabel };

// --- Editable variants (TicketDetail only) ---

interface EditableLozengeProps {
  value: number;
  onClick: () => void;
}

export function EditableRiskLozenge({ value, onClick }: EditableLozengeProps) {
  return (
    <span
      onClick={onClick}
      style={{
        ...style(riskColor(value)),
        cursor: "pointer",
        position: "relative",
      }}
      title="Click to edit risk"
    >
      {label(value)} {value.toFixed(1)} &#9998;
    </span>
  );
}

export function EditableConfidenceLozenge({ value, onClick }: EditableLozengeProps) {
  return (
    <span
      onClick={onClick}
      style={{
        ...style(confidenceColor(value)),
        cursor: "pointer",
        position: "relative",
      }}
      title="Click to edit confidence"
    >
      {label(value)} {value.toFixed(1)} &#9998;
    </span>
  );
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/tok-jira/tok-jira/frontend
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Lozenge.tsx
git commit -m "feat: add EditableRiskLozenge and EditableConfidenceLozenge variants"
```

---

## Task 4: Wire Everything into TicketDetail

**Files:**
- Modify: `frontend/src/pages/TicketDetail.tsx`

- [ ] **Step 1: Replace TicketDetail with interactive version**

Replace `frontend/src/pages/TicketDetail.tsx` with:

```tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import {
  AreaLozenge,
  ConfidenceLozenge,
  EditableConfidenceLozenge,
  EditableRiskLozenge,
  RiskLozenge,
  StatusLozenge,
} from "../components/Lozenge";
import { AuditTimeline } from "../components/AuditTimeline";
import { ValueEditDialog } from "../components/ValueEditDialog";
import { InfoPopover } from "../components/InfoPopover";
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
  const [editDialog, setEditDialog] = useState<{ type: "risk" | "confidence"; value: number } | null>(null);

  const refreshAll = () => {
    if (!id) return;
    api.getTicket(id).then(setTicket);
    api.getComments(id).then(setComments);
    api.getAudit(id).then(setAudit);
  };

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
    refreshAll();
  };

  const handleValueSave = async (newValue: number, comment: string) => {
    if (!editDialog) return;
    const field = editDialog.type;
    const oldValue = editDialog.value;
    const prefix = field === "risk" ? "Risk" : "Confidence";
    const fullComment = `[${prefix} updated: ${oldValue.toFixed(2)} \u2192 ${newValue.toFixed(2)}] ${comment}`;

    await api.updateTicket(ticket.id, { [field]: newValue });
    await api.addComment(ticket.id, fullComment);
    setEditDialog(null);
    refreshAll();
  };

  const sectionStyle = {
    background: "var(--kira-bg-card)",
    borderRadius: "6px",
    padding: "16px",
    marginBottom: "12px",
  };

  return (
    <div>
      {editDialog && (
        <ValueEditDialog
          type={editDialog.type}
          currentValue={editDialog.value}
          onSave={handleValueSave}
          onCancel={() => setEditDialog(null)}
        />
      )}

      <div style={{ ...sectionStyle }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
          <h2 style={{ margin: 0, fontSize: "18px" }}>{ticket.title}</h2>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <AreaLozenge area={ticket.area} />
            <StatusLozenge status={ticket.status} />
          </div>
        </div>

        <div style={{ display: "flex", gap: "24px", marginBottom: "16px", fontSize: "13px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ color: "var(--kira-text-muted)" }}>Risk: </span>
            <EditableRiskLozenge
              value={ticket.risk}
              onClick={() => setEditDialog({ type: "risk", value: ticket.risk })}
            />
            <InfoPopover type="risk" />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ color: "var(--kira-text-muted)" }}>Confidence: </span>
            <EditableConfidenceLozenge
              value={ticket.confidence}
              onClick={() => setEditDialog({ type: "confidence", value: ticket.confidence })}
            />
            <InfoPopover type="confidence" />
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

- [ ] **Step 2: Verify full build**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/tok-jira/tok-jira/frontend
npm run build
```

Expected: Build succeeds

- [ ] **Step 3: Run backend tests**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/tok-jira/tok-jira
uv run pytest tests/ -v
```

Expected: All 34 tests pass

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/TicketDetail.tsx
git commit -m "feat: wire editable lozenges and info popovers into TicketDetail"
```

- [ ] **Step 5: Push**

```bash
git push
```
