# Stage Field Design Spec

## Purpose

Add a `stage` field to tickets so operators can immediately see whether a ticket relates to dev, test, or production. Color-coded as a lozenge in the ticket header alongside Risk and Confidence, with an `(i)` info popover explaining the scale.

## Data Model

Add `stage` column to the `Ticket` model:

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `stage` | String(20) | `unknown` | Enum: `dev`, `test`, `production`, `unknown` |

## Enum

### StageEnum

`dev`, `test`, `production`, `unknown`

## API Changes

### TicketCreate

Add optional `stage` field, defaults to `unknown`:

```python
stage: StageEnum = StageEnum.UNKNOWN
```

### TicketUpdate

Add optional `stage` field:

```python
stage: StageEnum | None = None
```

### TicketResponse

Add `stage` field:

```python
stage: StageEnum
```

## Frontend

### StageLozenge

A new lozenge component following the existing pattern in `Lozenge.tsx`:

| Stage | Color | Hex |
|-------|-------|-----|
| `dev` | Green | `#22c55e` |
| `test` | Amber | `#f59e0b` |
| `production` | Red | `#ef4444` |
| `unknown` | Grey | `#6b7280` |

### Placement

In the TicketDetail header metadata row, after Confidence and before Source:

```
Risk: [high 0.9] (i)  Confidence: [high 0.8] (i)  Stage: [production] (i)  Source: agent  Created: ...
```

### InfoPopover

Add stage-specific content to the InfoPopover component:

- **dev** — Development environment. Low urgency — issues here are expected during development.
- **test** — Test/staging environment. Moderate urgency — failures may block releases.
- **production** — Production environment. High urgency — real users and services are affected.
- **unknown** — Environment not specified. Treat with appropriate caution until confirmed.

### TicketList

Add a Stage column to the ticket list table, displayed as a color-coded lozenge.

## Seed Data

Update demo tickets with realistic stage values:

- OOM kills on payment-service pod → `production`
- SSH timeout on db-replica-03 → `production`
- DNS resolution failures in staging → `test`
- PostgreSQL replication lag → `production`
- Unauthorized S3 bucket access → `production`

## Files

### Modified Files

- `api/models/enums.py` — add `StageEnum`
- `api/db/models.py` — add `stage` column to `Ticket`
- `api/models/tickets.py` — add `stage` to `TicketCreate`, `TicketUpdate`, `TicketResponse`
- `api/routes/tickets.py` — include `stage` in ticket creation
- `api/seed.py` — add stage values to demo tickets
- `api/db/alembic/versions/` — migration for new column
- `frontend/src/types.ts` — add `Stage` type, add `stage` to `Ticket` interface
- `frontend/src/components/Lozenge.tsx` — add `StageLozenge`
- `frontend/src/components/InfoPopover.tsx` — add stage popover content
- `frontend/src/pages/TicketDetail.tsx` — display StageLozenge + InfoPopover in header
- `frontend/src/pages/TicketList.tsx` — add Stage column
- `tests/test_tickets.py` — test stage field on create, update, default
- `docs/api/openapi.yaml` — regenerate via `make openapi`
- `llms.txt` — update if needed

## Out of Scope

- Filtering tickets by stage (can be added later)
- Stage on issues/backlog items
- Stage auto-detection from infrastructure
