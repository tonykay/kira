# Interactive Risk & Confidence Lozenges Design Spec

## Purpose

Make the Risk and Confidence lozenges on the TicketDetail page clickable and editable, with a mandatory comment justification for every change. Add an info icon with scale guidelines so operators understand what the values mean.

## Behavior

### Editable Lozenges (TicketDetail only)

On the TicketDetail page, Risk and Confidence lozenges are interactive:
- Cursor changes to pointer on hover
- A small pencil icon appears next to the value to signal editability
- Clicking opens the ValueEditDialog

On TicketList, Dashboard, and other views, lozenges remain read-only with no visual edit affordance. The existing `RiskLozenge` and `ConfidenceLozenge` components are unchanged — new `EditableRiskLozenge` and `EditableConfidenceLozenge` wrapper components handle the interactive behavior.

### ValueEditDialog

A compact modal dialog containing:
- **Title:** "Update Risk" or "Update Confidence"
- **Preview lozenge** showing the current/new value with real-time color updates
- **Slider:** Range 0.0–1.0, step 0.05. As the user drags, the preview lozenge updates its color and label (low/med/high) in real-time
- **Comment textarea:** Required. Placeholder: "Reason for change (required)"
- **Save button:** Disabled until comment is non-empty and value has changed
- **Cancel button:** Closes dialog without changes

### On Save

Two API calls:
1. `PATCH /api/v1/tickets/{id}` with `{ "risk": newValue }` or `{ "confidence": newValue }`
2. `POST /api/v1/tickets/{id}/comments` with body prefixed by context: `[Risk updated: 0.9 → 0.5] Non prod workload, non critical`

After both succeed:
- Ticket state refreshes (lozenge color updates)
- Comments list refreshes (new comment visible)
- Audit trail refreshes (change logged)

### Info Icon

A small `(i)` icon appears next to each editable lozenge on TicketDetail. Clicking opens an InfoPopover panel with the scale breakdown.

**Risk scale:**
- **0.0–0.3 (Low):** Routine issue, minimal blast radius, safe to action
- **0.4–0.6 (Medium):** Some risk of disruption, review recommended before action
- **0.7–1.0 (High):** Significant risk — service restart, data impact, or production-affecting. Requires SME validation

**Confidence scale:**
- **0.0–0.3 (Low):** Weak evidence, multiple possible root causes, needs investigation
- **0.4–0.6 (Medium):** Partial evidence supports diagnosis, some uncertainty remains
- **0.7–1.0 (High):** Strong evidence, diagnosis well-supported, high certainty in root cause

The popover closes on click outside or pressing Escape.

## API Changes

None. The existing endpoints handle everything:
- `PATCH /api/v1/tickets/{id}` — updates risk/confidence, auto-creates audit entry
- `POST /api/v1/tickets/{id}/comments` — creates the justification comment

## Implementation

### New Files

- `frontend/src/components/ValueEditDialog.tsx` — modal with slider, preview lozenge, comment textarea, save/cancel
- `frontend/src/components/InfoPopover.tsx` — scale breakdown popover triggered by info icon

### Modified Files

- `frontend/src/components/Lozenge.tsx` — add `EditableRiskLozenge` and `EditableConfidenceLozenge` components that wrap the existing lozenges with click handler, pencil icon, and info icon
- `frontend/src/pages/TicketDetail.tsx` — replace `RiskLozenge`/`ConfidenceLozenge` with editable variants, manage dialog state, handle save callbacks

## Out of Scope

- Editing lozenges from TicketList or Dashboard views
- Editing lozenges via API key auth (agents use PATCH directly)
- Undo/revert capability (audit trail provides history)
- Customizable scale definitions (hardcoded for now)
