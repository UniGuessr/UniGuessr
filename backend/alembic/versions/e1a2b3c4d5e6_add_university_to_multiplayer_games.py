"""add university to multiplayer_games

Revision ID: e1a2b3c4d5e6
Revises: d278ba0c374f
Create Date: 2026-06-30 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e1a2b3c4d5e6'
down_revision = 'd278ba0c374f'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "multiplayer_games",
        sa.Column("university", sa.String(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("multiplayer_games", "university")
