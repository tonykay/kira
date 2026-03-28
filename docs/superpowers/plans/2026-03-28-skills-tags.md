# Skills Tags Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a freeform, normalized skills field to tickets so SREs can immediately see what technologies/tools a ticket requires.

**Architecture:** New `skills` JSON column on the tickets table. API normalizes to lowercase/trimmed/deduped on create and update. Frontend shows compact skill tags in tables and an inline editor on ticket detail.

**Tech Stack:** SQLAlchemy JSON column, Alembic migration, Pydantic V2, React components

---

## File Structure

```
api/
├── db/models.py                # MODIFY: add skills column to Ticket
├── models/tickets.py           # MODIFY: add skills to Create/Update/Response
├── routes/tickets.py           # MODIFY: normalize skills on create/update
├── seed.py                     # MODIFY: add skills to sample tickets
tests/
└── test_tickets.py             # MODIFY: add skills tests
frontend/src/
├── types.ts                    # MODIFY: add skills to Ticket interface
├── components/
│   ├── SkillTag.tsx            # NEW: compact neutral tag component
│   └── SkillEditor.tsx         # NEW: inline add/remove tag editor
├── pages/
│   ├── Dashboard.tsx           # MODIFY: add skills column to table
│   ├── TicketList.tsx          # MODIFY: add skills column to table
│   └── TicketDetail.tsx        # MODIFY: show SkillEditor in header
```

---

## Task 1: Backend — Data Model, Schemas, and Route Changes

**Files:**
- Modify: `api/db/models.py`
- Modify: `api/models/tickets.py`
- Modify: `api/routes/tickets.py`
- Modify: `tests/test_tickets.py`

- [ ] **Step 1: Add skills column to Ticket ORM model**

In `api/db/models.py`, add after the `affected_systems` line (line 38):

```python
    skills: Mapped[list[str]] = mapped_column(JSON, default=list)
```

- [ ] **Step 2: Add skills to Pydantic schemas**

In `api/models/tickets.py`:

Add to `TicketCreate` after `affected_systems`:
```python
    skills: list[str] = Field(default_factory=list)
```

Add to `TicketUpdate` after `assigned_to`:
```python
    skills: list[str] | None = None
```

Add to `TicketResponse` after `affected_systems`:
```python
    skills: list[str]
```

- [ ] **Step 3: Add normalization helper and update routes**

In `api/routes/tickets.py`, add this helper function after the imports:

```python
def normalize_skills(skills: list[str]) -> list[str]:
    return list(dict.fromkeys(s.strip().lower() for s in skills if s.strip()))
```

In the `create_ticket` function, after `affected_systems=body.affected_systems,` add:
```python
        skills=normalize_skills(body.skills),
```

In the `update_ticket` function, inside the for loop, add a skills-specific branch. Replace the entire for loop (lines 99-115) with:

```python
    updates = body.model_dump(exclude_unset=True)
    for field, new_value in updates.items():
        old_value = getattr(ticket, field)
        if field == "skills":
            normalized = normalize_skills(new_value)
            create_audit_entry(
                db, ticket.id, "skills_changed", user,
                old_value={"skills": old_value},
                new_value={"skills": normalized},
            )
            setattr(ticket, field, normalized)
        elif field == "assigned_to":
            old_value = str(old_value) if old_value else None
            new_value_str = str(new_value) if new_value else None
            setattr(ticket, field, new_value)
            create_audit_entry(
                db, ticket.id, f"{field}_changed", user,
                old_value={field: old_value}, new_value={field: new_value_str},
            )
        else:
            setattr(ticket, field, new_value.value if hasattr(new_value, "value") else new_value)
            create_audit_entry(
                db, ticket.id, f"{field}_changed", user,
                old_value={field: str(old_value)},
                new_value={field: str(new_value.value if hasattr(new_value, "value") else new_value)},
            )
```

- [ ] **Step 4: Add skills tests**

Append to `tests/test_tickets.py`:

```python
def test_create_ticket_with_skills(client, api_key_headers):
    payload = {**TICKET_PAYLOAD, "skills": ["Kubernetes", " helm ", "ARGOCD"]}
    resp = client.post("/api/v1/tickets", json=payload, headers=api_key_headers)
    assert resp.status_code == 201
    assert resp.json()["skills"] == ["kubernetes", "helm", "argocd"]


def test_create_ticket_default_empty_skills(client, api_key_headers):
    resp = client.post("/api/v1/tickets", json=TICKET_PAYLOAD, headers=api_key_headers)
    assert resp.status_code == 201
    assert resp.json()["skills"] == []


def test_update_ticket_skills(auth_client, client, api_key_headers):
    create_resp = client.post("/api/v1/tickets", json=TICKET_PAYLOAD, headers=api_key_headers)
    ticket_id = create_resp.json()["id"]
    resp = auth_client.patch(
        f"/api/v1/tickets/{ticket_id}",
        json={"skills": ["Docker", " kubernetes"]},
    )
    assert resp.status_code == 200
    assert resp.json()["skills"] == ["docker", "kubernetes"]


def test_skills_deduplication(client, api_key_headers):
    payload = {**TICKET_PAYLOAD, "skills": ["helm", "Helm", "HELM"]}
    resp = client.post("/api/v1/tickets", json=payload, headers=api_key_headers)
    assert resp.status_code == 201
    assert resp.json()["skills"] == ["helm"]
```

- [ ] **Step 5: Run tests**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/tok-jira/tok-jira
uv run pytest tests/test_tickets.py -v
```

Expected: All tests pass (existing 9 + new 4 = 13)

- [ ] **Step 6: Generate Alembic migration**

```bash
uv run alembic revision --autogenerate -m "add skills column to tickets"
uv run alembic upgrade head
```

- [ ] **Step 7: Commit**

```bash
git add api/db/models.py api/models/tickets.py api/routes/tickets.py tests/test_tickets.py api/db/alembic/versions/
git commit -m "feat: add skills field to tickets with normalization and tests"
```

---

## Task 2: Update Seed Data

**Files:**
- Modify: `api/seed.py`

- [ ] **Step 1: Add skills to each sample ticket**

In `api/seed.py`, add a `"skills"` key to each ticket dictionary in the `tickets_data` list:

First ticket (OOM kills), add after `"assigned_to": op1.id,`:
```python
                "skills": ["kubernetes", "helm", "java"],
```

Second ticket (SSH timeout), add after `"status": "open",`:
```python
                "skills": ["linux", "ssh", "firewall"],
```

Third ticket (DNS failures), add after `"assigned_to": op2.id,`:
```python
                "skills": ["kubernetes", "coredns", "networking"],
```

Fourth ticket (PostgreSQL replication), add after `"status": "open",`:
```python
                "skills": ["postgresql", "linux", "storage"],
```

Fifth ticket (S3 bucket access), add after `"assigned_to": op1.id,`:
```python
                "skills": ["aws", "iam", "security"],
```

- [ ] **Step 2: Commit**

```bash
git add api/seed.py
git commit -m "feat: add skills to seed data for sample tickets"
```

---

## Task 3: Frontend — SkillTag and SkillEditor Components

**Files:**
- Create: `frontend/src/components/SkillTag.tsx`
- Create: `frontend/src/components/SkillEditor.tsx`
- Modify: `frontend/src/types.ts`

- [ ] **Step 1: Add skills to Ticket TypeScript interface**

In `frontend/src/types.ts`, add after `affected_systems: string[];` (line 30):

```typescript
  skills: string[];
```

- [ ] **Step 2: Create SkillTag component**

`frontend/src/components/SkillTag.tsx`:

```tsx
interface SkillTagProps {
  skill: string;
  onRemove?: () => void;
}

export function SkillTag({ skill, onRemove }: SkillTagProps) {
  return (
    <span
      style={{
        background: "var(--kira-border)",
        color: "var(--kira-text-secondary)",
        padding: "1px 6px",
        borderRadius: "8px",
        fontSize: "10px",
        fontWeight: 500,
        display: "inline-flex",
        alignItems: "center",
        gap: "3px",
        whiteSpace: "nowrap",
      }}
    >
      {skill}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={{
            background: "none",
            border: "none",
            color: "var(--kira-text-muted)",
            cursor: "pointer",
            padding: "0 1px",
            fontSize: "10px",
            lineHeight: 1,
          }}
          title={`Remove ${skill}`}
        >
          \u00d7
        </button>
      )}
    </span>
  );
}
```

- [ ] **Step 3: Create SkillEditor component**

`frontend/src/components/SkillEditor.tsx`:

```tsx
import { useState } from "react";
import { SkillTag } from "./SkillTag";

interface SkillEditorProps {
  skills: string[];
  onSave: (skills: string[]) => Promise<void>;
}

export function SkillEditor({ skills, onSave }: SkillEditorProps) {
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    const value = input.trim().toLowerCase();
    if (!value || skills.includes(value)) {
      setInput("");
      return;
    }
    setSaving(true);
    await onSave([...skills, value]);
    setInput("");
    setSaving(false);
  };

  const handleRemove = async (skill: string) => {
    setSaving(true);
    await onSave(skills.filter((s) => s !== skill));
    setSaving(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", alignItems: "center" }}>
      {skills.map((skill) => (
        <SkillTag key={skill} skill={skill} onRemove={() => handleRemove(skill)} />
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={saving ? "Saving..." : "Add skill..."}
        disabled={saving}
        style={{
          background: "transparent",
          border: "none",
          borderBottom: "1px solid var(--kira-border)",
          color: "var(--kira-text-primary)",
          fontSize: "11px",
          padding: "2px 4px",
          width: "80px",
          outline: "none",
        }}
      />
    </div>
  );
}
```

- [ ] **Step 4: Verify compile**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/tok-jira/tok-jira/frontend
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types.ts frontend/src/components/SkillTag.tsx frontend/src/components/SkillEditor.tsx
git commit -m "feat: add SkillTag and SkillEditor frontend components"
```

---

## Task 4: Frontend — Add Skills to Dashboard, TicketList, and TicketDetail

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx`
- Modify: `frontend/src/pages/TicketList.tsx`
- Modify: `frontend/src/pages/TicketDetail.tsx`

- [ ] **Step 1: Add skills column to Dashboard table**

In `frontend/src/pages/Dashboard.tsx`, add the SkillTag import at the top:

```tsx
import { SkillTag } from "../components/SkillTag";
```

Add a Skills header after the Area header (after line 91):
```tsx
              <th style={{ textAlign: "left", padding: "8px 12px" }}>Skills</th>
```

Add a Skills cell after the Area cell (after line 105):
```tsx
                <td style={{ padding: "10px 12px" }}>
                  <div style={{ display: "flex", gap: "3px", flexWrap: "wrap" }}>
                    {t.skills.map((s) => <SkillTag key={s} skill={s} />)}
                  </div>
                </td>
```

- [ ] **Step 2: Add skills column to TicketList table**

In `frontend/src/pages/TicketList.tsx`, add the SkillTag import at the top:

```tsx
import { SkillTag } from "../components/SkillTag";
```

Add a Skills header after the Area header (after line 72):
```tsx
              <th style={{ textAlign: "left", padding: "8px 12px" }}>Skills</th>
```

Add a Skills cell after the Area cell (after line 87):
```tsx
                <td style={{ padding: "10px 12px" }}>
                  <div style={{ display: "flex", gap: "3px", flexWrap: "wrap" }}>
                    {t.skills.map((s) => <SkillTag key={s} skill={s} />)}
                  </div>
                </td>
```

- [ ] **Step 3: Add SkillEditor to TicketDetail**

In `frontend/src/pages/TicketDetail.tsx`, add imports:

```tsx
import { SkillEditor } from "../components/SkillEditor";
```

Add skills display in the header metadata section, after the Confidence div (after the `<InfoPopover type="confidence" />` closing div around line 108). Add:

```tsx
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ color: "var(--kira-text-muted)" }}>Skills: </span>
            <SkillEditor
              skills={ticket.skills}
              onSave={async (skills) => {
                const updated = await api.updateTicket(ticket.id, { skills });
                setTicket(updated);
                api.getAudit(ticket.id).then(setAudit);
              }}
            />
          </div>
```

- [ ] **Step 4: Verify full build**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/tok-jira/tok-jira/frontend
npm run build
```

Expected: Build succeeds

- [ ] **Step 5: Run all backend tests**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/tok-jira/tok-jira
uv run pytest tests/ -v
```

Expected: All tests pass (38 total — 34 existing + 4 new skills tests)

- [ ] **Step 6: Commit and push**

```bash
git add frontend/src/pages/Dashboard.tsx frontend/src/pages/TicketList.tsx frontend/src/pages/TicketDetail.tsx
git commit -m "feat: display skills in tables and add inline editor to TicketDetail"
git push
```
