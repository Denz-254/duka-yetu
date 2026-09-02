"""Add password reset token fields to users.

Revision ID: 010
Revises: 009
Create Date: 2026-09-02
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "010"
down_revision = "009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = inspect(op.get_bind())
    columns = {col["name"] for col in inspector.get_columns("users")}

    if "password_reset_token" not in columns:
        op.add_column(
            "users",
            sa.Column("password_reset_token", sa.String(length=128), nullable=True),
        )

    if "password_reset_expires" not in columns:
        op.add_column(
            "users",
            sa.Column("password_reset_expires", sa.DateTime(), nullable=True),
        )


def downgrade() -> None:
    inspector = inspect(op.get_bind())
    columns = {col["name"] for col in inspector.get_columns("users")}

    if "password_reset_expires" in columns:
        op.drop_column("users", "password_reset_expires")

    if "password_reset_token" in columns:
        op.drop_column("users", "password_reset_token")
