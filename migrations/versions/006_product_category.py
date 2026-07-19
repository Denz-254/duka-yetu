"""Add category_id to products.

Revision ID: 006
Revises: 005
Create Date: 2026-07-20
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import inspect

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("products")}
    if "category_id" not in columns:
        op.add_column("products", sa.Column("category_id", UUID(as_uuid=True), nullable=True))

    fks = {fk["name"] for fk in inspector.get_foreign_keys("products")}
    if "fk_products_category_id" not in fks:
        op.create_foreign_key(
            "fk_products_category_id",
            "products",
            "categories",
            ["category_id"],
            ["id"],
        )

    indexes = {idx["name"] for idx in inspector.get_indexes("products")}
    if "ix_products_category_id" not in indexes:
        op.create_index("ix_products_category_id", "products", ["category_id"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    indexes = {idx["name"] for idx in inspector.get_indexes("products")}
    if "ix_products_category_id" in indexes:
        op.drop_index("ix_products_category_id", table_name="products")
    fks = {fk["name"] for fk in inspector.get_foreign_keys("products")}
    if "fk_products_category_id" in fks:
        op.drop_constraint("fk_products_category_id", "products", type_="foreignkey")
    columns = {col["name"] for col in inspector.get_columns("products")}
    if "category_id" in columns:
        op.drop_column("products", "category_id")
