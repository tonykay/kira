# Skills Tags Design Spec

## Purpose

Add a skills field to tickets so that key technologies/tools required for resolution are visible to human SREs. Agents set skills at ticket creation (e.g., `kubernetes`, `helm`, `argocd`), humans can add or remove them. Skills appear prominently in the UI so an SRE scanning the ticket list immediately knows what expertise is needed.

## Data Model

Add a `skills` column to the `tickets` table:
- Type: `JSON` (matching the pattern used for `affected_systems`)
- Default: empty list `[]`
- Stores a list of lowercase strings

Normalization: the API applies `[s.strip().lower() for s in skills]` on every create and update, deduplicating the list. No enum enforcement — freeform but normalized.

## API Changes

### TicketCreate schema
Add `skills: list[str] = Field(default_factory=list)`.

### TicketUpdate schema
Add `skills: list[str] | None = None`.

### TicketResponse schema
Add `skills: list[str]`.

### Normalization
On both create and update, normalize skills:
```python
skills = list(dict.fromkeys(s.strip().lower() for s in skills if s.strip()))
```
This lowercases, trims, removes empty strings, and deduplicates while preserving order.

### Audit
PATCH updates to skills create an audit log entry with old and new skill lists.

### TICKET_PAYLOAD for tests
Add `"skills": ["kubernetes", "helm"]` to the test payload. Test that normalization works (e.g., `" Helm "` becomes `"helm"`).

## Frontend

### SkillTag Component
A small neutral-colored tag for displaying a single skill. Styled distinctly from area lozenges:
- Background: `var(--kira-border)`
- Text: `var(--kira-text-secondary)`
- Compact: smaller padding than area lozenges

### SkillEditor Component
An inline tag editor for the TicketDetail page:
- Displays current skills as SkillTags with an `x` button to remove
- A small text input to type and add new skills (Enter to add)
- Calls `PATCH /api/v1/tickets/{id}` with the updated skills list
- Creates an audit entry automatically

### Dashboard and TicketList
Add a Skills column to both tables showing SkillTags. Positioned after the Area column — skills appear early so SREs scanning can quickly identify what expertise a ticket requires.

### TicketDetail
Skills displayed in the header metadata section (alongside area, risk, confidence). Uses SkillEditor for inline add/remove.

## Seed Data

Update sample tickets with realistic skills:
- OOM kills ticket: `["kubernetes", "helm", "java"]`
- SSH timeout ticket: `["linux", "ssh", "firewall"]`
- DNS failures ticket: `["kubernetes", "coredns", "networking"]`
- PostgreSQL replication ticket: `["postgresql", "linux", "storage"]`
- S3 bucket access ticket: `["aws", "iam", "security"]`

## Files Changed

### Backend
- Modify: `api/db/models.py` — add `skills` column to Ticket
- Modify: `api/models/tickets.py` — add skills to Create/Update/Response schemas
- Modify: `api/routes/tickets.py` — normalize skills on create and update
- Modify: `api/seed.py` — add skills to sample tickets
- Modify: `tests/test_tickets.py` — test skills create/update/normalization
- New: Alembic migration for skills column

### Frontend
- Modify: `frontend/src/types.ts` — add `skills: string[]` to Ticket
- Create: `frontend/src/components/SkillTag.tsx`
- Create: `frontend/src/components/SkillEditor.tsx`
- Modify: `frontend/src/pages/Dashboard.tsx` — add skills column
- Modify: `frontend/src/pages/TicketList.tsx` — add skills column
- Modify: `frontend/src/pages/TicketDetail.tsx` — show SkillEditor

## Out of Scope

- Enumerated/validated skill values
- Skill-based filtering on ticket list (can be added later)
- Matching skills to user expertise_area for auto-assignment suggestions
