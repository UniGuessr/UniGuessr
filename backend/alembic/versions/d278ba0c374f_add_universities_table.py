"""add universities table

Revision ID: d278ba0c374f
Revises: 0001
Create Date: 2026-06-25 12:37:25.776637

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd278ba0c374f'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'universities',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('slug', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_universities_name'), 'universities', ['name'], unique=True)
    op.create_index(op.f('ix_universities_slug'), 'universities', ['slug'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_universities_slug'), table_name='universities')
    op.drop_index(op.f('ix_universities_name'), table_name='universities')
    op.drop_table('universities')
