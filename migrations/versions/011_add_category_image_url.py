"""Add image URL support for categories.

Revision ID: 011
Revises: 010
Create Date: 2026-09-02
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "011"
down_revision = "010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = inspect(op.get_bind())
    if "categories" not in inspector.get_table_names():
        return

    columns = {col["name"] for col in inspector.get_columns("categories")}
    if "image_url" not in columns:
        op.add_column("categories", sa.Column("image_url", sa.String(length=500), nullable=True))


def downgrade() -> None:
    inspector = inspect(op.get_bind())
    if "categories" not in inspector.get_table_names():
        return

    columns = {col["name"] for col in inspector.get_columns("categories")}
    if "image_url" in columns:
        op.drop_column("categories", "image_url")
