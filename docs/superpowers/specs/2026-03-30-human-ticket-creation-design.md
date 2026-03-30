# Human Ticket Creation Design Spec

## Purpose

Allow human operators to create tickets from scratch via the frontend UI. Currently only agents create tickets via API. This adds a form accessible from the nav bar so SREs can manually report issues.

## Backend Changes

None. The existing `POST /api/v1/tickets` endpoint already accepts session auth via `get_current_user_or_api_key`. The `TicketCreate` schema accepts a `source` field that defaults to `agent` — humans will pass `source: "human"`.

## Frontend

### Entry Point

A "New Ticket" button in the nav bar, visible to operators and admins (not viewers). Navigates to `/tickets/new`.

### Create Ticket Page

A form page at `/tickets/new` with these fields:

| Field | Type | Required | Notes |
|---|---|---|---|
| Title | text input | Yes | max 255 chars |
| Area | dropdown | Yes | Populated from AreaEnum |
| Description | textarea | Yes | Analysis, context, evidence |
| Recommended Action | textarea | Yes | What should be done |
| Risk | slider 0.0–1.0 | Yes | Live preview lozenge + (i) info popover |
| Confidence | slider 0.0–1.0 | Yes | Live preview lozenge + (i) info popover |
| Skills | tag input | No | Inline add with Enter, same as SkillEditor |
| Affected Systems | tag input | No | Hostnames, pods, services |
| Comment | textarea | Yes | Mandatory first comment explaining why this was created manually |

Risk and Confidence sliders show the same live color-updating preview lozenge and `(i)` info popovers used in the ValueEditDialog and TicketDetail page.

### On Submit

1. `POST /api/v1/tickets` with all fields and `source: "human"`
2. `POST /api/v1/tickets/{id}/comments` with the mandatory comment, prefixed: `[Ticket created manually] <comment text>`
3. Navigate to `/tickets/{id}` (the new ticket's detail page)

### Validation

- All required fields must be non-empty
- Risk and confidence must be in 0.0–1.0 range (enforced by slider)
- Submit button disabled until all required fields are filled
- Error display if API call fails

## Files

### New Files
- `frontend/src/pages/CreateTicket.tsx` — form page with sliders, info popovers, tag inputs

### Modified Files
- `frontend/src/components/Layout.tsx` — add "New Ticket" button to nav bar
- `frontend/src/App.tsx` — add `/tickets/new` route (must be BEFORE `/tickets/:id`)
- `frontend/src/api/client.ts` — add `createTicket` method

## Out of Scope

- Viewer role creating tickets (viewers are read-only)
- Draft/auto-save functionality
- Ticket templates or pre-filled forms
- File attachment during creation (can be added after via ticket detail)
