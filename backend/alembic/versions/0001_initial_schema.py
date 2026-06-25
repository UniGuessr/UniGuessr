"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-06-20

"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "locations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("image_url", sa.Text(), nullable=False),
        sa.Column("difficulty", sa.String(), server_default="medium"),
        sa.Column("building_id", sa.String(), nullable=True),
        sa.Column("floor", sa.Integer(), nullable=True),
        sa.Column("university", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("idx_locations_university", "locations", ["university"])

    op.create_table(
        "game_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("rounds", sa.Integer(), nullable=False),
        sa.Column("difficulty", sa.String(), nullable=False),
        sa.Column("location_ids", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("current_round", sa.Integer(), server_default="0"),
        sa.Column("guesses", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("total_score", sa.Integer(), server_default="0"),
        sa.Column("status", sa.String(), server_default="active"),
        sa.Column("university", sa.String(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "leaderboard",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("username", sa.String(), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("rounds", sa.Integer(), nullable=False),
        sa.Column("difficulty", sa.String(), nullable=False),
        sa.Column("university", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("idx_leaderboard_score", "leaderboard", ["score"])
    op.create_index("idx_leaderboard_university", "leaderboard", ["university"])
    op.create_index("idx_leaderboard_rounds_diff", "leaderboard", ["rounds", "difficulty"])

    op.create_table(
        "lobbies",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("code", sa.String(), nullable=False, unique=True),
        sa.Column("host_id", sa.String(), nullable=False),
        sa.Column("players", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("rounds", sa.Integer(), nullable=False),
        sa.Column("difficulty", sa.String(), nullable=False),
        sa.Column("status", sa.String(), server_default="waiting"),
        sa.Column("matchmaking", sa.Boolean(), server_default="false"),
        sa.Column("university", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("idx_lobbies_code", "lobbies", ["code"])
    op.create_index(
        "idx_lobbies_matchmaking", "lobbies", ["matchmaking", "status", "rounds", "difficulty"]
    )

    op.create_table(
        "multiplayer_games",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("lobby_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("location_ids", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("current_round", sa.Integer(), server_default="0"),
        sa.Column("players", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("status", sa.String(), server_default="active"),
        sa.Column("round_started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("multiplayer_games")
    op.drop_index("idx_lobbies_matchmaking", "lobbies")
    op.drop_index("idx_lobbies_code", "lobbies")
    op.drop_table("lobbies")
    op.drop_index("idx_leaderboard_rounds_diff", "leaderboard")
    op.drop_index("idx_leaderboard_university", "leaderboard")
    op.drop_index("idx_leaderboard_score", "leaderboard")
    op.drop_table("leaderboard")
    op.drop_table("game_sessions")
    op.drop_index("idx_locations_university", "locations")
    op.drop_table("locations")
