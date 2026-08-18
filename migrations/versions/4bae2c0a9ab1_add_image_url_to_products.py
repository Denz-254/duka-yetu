"""Add image_url to products

Revision ID: 4bae2c0a9ab1
Revises: 007_featured_security
Create Date: 2026-07-16 22:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision = "4bae2c0a9ab1"
down_revision = "007_featured_security"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = inspect(op.get_bind())
    columns = {col["name"] for col in inspector.get_columns("products")}
    if "image_url" not in columns:
        op.add_column("products", sa.Column("image_url", sa.String(500), nullable=True))


def downgrade() -> None:
    inspector = inspect(op.get_bind())
    columns = {col["name"] for col in inspector.get_columns("products")}
    if "image_url" in columns:
        op.drop_column("products", "image_url")
