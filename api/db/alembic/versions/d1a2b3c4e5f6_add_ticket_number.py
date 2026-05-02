"""add ticket_number column with sequence

Revision ID: d1a2b3c4e5f6
Revises: c3a8f2e91b44
Create Date: 2026-05-01 12:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "d1a2b3c4e5f6"
down_revision = "c3a8f2e91b44"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE SEQUENCE ticket_number_seq")

    op.add_column(
        "tickets",
        sa.Column(
            "ticket_number",
            sa.Integer(),
            server_default=sa.text("nextval('ticket_number_seq')"),
            nullable=True,
        ),
    )

    # Backfill existing tickets in created_at order (oldest = #1)
    op.execute("""
        WITH numbered AS (
            SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn
            FROM tickets
        )
        UPDATE tickets SET ticket_number = numbered.rn
        FROM numbered WHERE tickets.id = numbered.id
    """)

    # Set the sequence to continue after the highest backfilled value
    op.execute("""
        SELECT setval('ticket_number_seq',
            COALESCE((SELECT MAX(ticket_number) FROM tickets), 0) + 1,
            false)
    """)

    op.alter_column("tickets", "ticket_number", nullable=False)
    op.create_unique_constraint("uq_tickets_ticket_number", "tickets", ["ticket_number"])
    op.create_index("ix_tickets_ticket_number", "tickets", ["ticket_number"])


def downgrade() -> None:
    op.drop_index("ix_tickets_ticket_number", table_name="tickets")
    op.drop_constraint("uq_tickets_ticket_number", "tickets", type_="unique")
    op.drop_column("tickets", "ticket_number")
    op.execute("DROP SEQUENCE ticket_number_seq")
