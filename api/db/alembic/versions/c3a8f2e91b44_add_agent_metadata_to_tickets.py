"""add agent_name model_name temperature to tickets

Revision ID: c3a8f2e91b44
Revises: f712a46ec3ff
Create Date: 2026-04-22 18:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "c3a8f2e91b44"
down_revision = "98aebda2f8c9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("tickets", sa.Column("agent_name", sa.String(100), nullable=True))
    op.add_column("tickets", sa.Column("model_name", sa.String(100), nullable=True))
    op.add_column("tickets", sa.Column("temperature", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("tickets", "temperature")
    op.drop_column("tickets", "model_name")
    op.drop_column("tickets", "agent_name")
