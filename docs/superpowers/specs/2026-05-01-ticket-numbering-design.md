# Ticket Numbering

Add human-readable sequential ticket numbers (#1, #2, #3...) to Kira so users can quickly identify and reference tickets in conversation, Rocket.Chat, and the UI.

## Problem

Tickets are currently identified only by UUID. In a lab with multiple students generating incidents, there's no quick way to say "look at ticket X" — you have to use the full title or a UUID fragment.

## Decisions

- **Format**: Plain sequential `#N` (no project prefix)
- **Scope**: Global auto-incrementing sequence across the whole Kira instance
- **Generation**: PostgreSQL `SEQUENCE` — server-assigned on INSERT, not client-provided
- **API**: Ticket number is a lookup key (`GET /tickets/by-number/{n}`) in addition to UUID
- **Sort order**: Tables remain sorted by `created_at DESC` (newest first) — numbers won't be sequential visually, matching Jira/GitHub behavior

## Database

### New column

Add `ticket_number` to the `tickets` table:

```sql
CREATE SEQUENCE ticket_number_seq;
ALTER TABLE tickets ADD COLUMN ticket_number INTEGER NOT NULL DEFAULT nextval('ticket_number_seq');
CREATE UNIQUE INDEX ix_tickets_ticket_number ON tickets (ticket_number);
```

### Alembic migration

1. Create `ticket_number_seq` sequence
2. Add `ticket_number` column with `server_default=sa.text("nextval('ticket_number_seq')")`
3. Backfill existing tickets by `created_at ASC` order (oldest = #1)
4. Set sequence to `max(ticket_number) + 1` so new tickets continue from the right value
5. Add unique index

### Model change

In `api/db/models.py`, add to the `Ticket` class:

```python
ticket_number: Mapped[int] = mapped_column(
    Integer,
    server_default=sa.text("nextval('ticket_number_seq')"),
    unique=True,
    nullable=False,
)
```

## API

### Response models

Add `ticket_number: int` to `TicketResponse` in `api/models/tickets.py`. It's already `from_attributes = True`, so it auto-populates from the ORM model.

### No change to TicketCreate

Ticket number is server-assigned. The `TicketCreate` schema stays unchanged — clients (including Athena) don't send a ticket number.

### New lookup route

Add `GET /api/v1/tickets/by-number/{ticket_number}` in `api/routes/tickets.py`:

```python
@router.get("/by-number/{ticket_number}", response_model=TicketResponse)
def get_ticket_by_number(
    ticket_number: int,
    db: Session = Depends(get_db),
    auth: User | str = Depends(get_current_user_or_api_key),
):
    ticket = db.query(Ticket).filter(Ticket.ticket_number == ticket_number).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket
```

This route must be defined **before** `GET /{ticket_id}` in the router module. FastAPI matches routes top-to-bottom; if `/{ticket_id}` comes first, the path `/by-number/1` would match `ticket_id="by-number"` and fail UUID parsing with a 422.

## Frontend

### TypeScript type

Add to `Ticket` interface in `frontend/src/types.ts`:

```typescript
ticket_number: number;
```

### Dashboard (Recent Tickets table)

Add `#` as the first column header. Each row shows `#N` in muted gray before the title.

### Tickets list

Same `#` first column treatment.

### Ticket detail header

Show `#N` as a muted prefix before the ticket title:

```
#1  DNF: python3.14 not available in any enabled repository on RHEL host
```

### Styling

The ticket number renders in `color: var(--kira-text-muted)` with `font-weight: 600` — visible but not competing with the title.

## Athena Impact

**No breaking changes.** Athena's `KiraClient.create_ticket()` returns `resp.json()` as a raw dict. The new `ticket_number` field appears in the response but is ignored by existing code.

**Optional enhancement (not in scope):** Athena could pluck `ticket_number` from the Kira response and include `#N` in Rocket.Chat notifications. This is additive and can be done separately.

## Files Changed

### Kira (this repo)

| File | Change |
|------|--------|
| `api/db/models.py` | Add `ticket_number` column to `Ticket` |
| `api/db/alembic/versions/<new>_add_ticket_number.py` | Migration: sequence, column, backfill, index |
| `api/models/tickets.py` | Add `ticket_number: int` to `TicketResponse` |
| `api/routes/tickets.py` | Add `GET /by-number/{ticket_number}` route |
| `frontend/src/types.ts` | Add `ticket_number: number` to `Ticket` interface |
| `frontend/src/pages/Dashboard.tsx` | Add `#` column to Recent Tickets table |
| `frontend/src/pages/TicketList.tsx` | Add `#` column to Tickets table |
| `frontend/src/pages/TicketDetail.tsx` | Add `#N` prefix to title header |

### Athena (separate repo, optional)

No changes required. Optional Rocket.Chat enhancement is out of scope.

## Testing

- Create a ticket via API, verify `ticket_number` is returned and auto-incremented
- Create multiple tickets, verify numbers are sequential and unique
- Look up a ticket by number via `GET /by-number/1`
- Verify backfill: existing tickets get numbers in `created_at` order
- Verify frontend displays `#N` on all three views
- Verify Athena's existing flow still works with the new response field
