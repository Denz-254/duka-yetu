"""Add deal of the day + DukaMall listing columns to products.

Revision ID: 008
Revises: 4bae2c0a9ab1
Create Date: 2026-08-18 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision = "008"
down_revision = "4bae2c0a9ab1"
branch_labels = None
depends_on = None


def _columns(table: str) -> set[str]:
    inspector = inspect(op.get_bind())
    if table not in inspector.get_table_names():
        return set()
    return {col["name"] for col in inspector.get_columns(table)}


def upgrade() -> None:
    columns = _columns("products")
    # PostgreSQL rejects integer defaults like '0' on boolean columns.
    if "is_deal_of_day" not in columns:
        op.add_column(
            "products",
            sa.Column(
                "is_deal_of_day",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
        )
    if "deal_of_day_until" not in columns:
        op.add_column("products", sa.Column("deal_of_day_until", sa.DateTime(), nullable=True))
    if "listed_on_marketplace" not in columns:
        # Existing catalog stays visible; new products opt in from inventory.
        op.add_column(
            "products",
            sa.Column(
                "listed_on_marketplace",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("true"),
            ),
        )
        op.alter_column("products", "listed_on_marketplace", server_default=sa.text("false"))


def downgrade() -> None:
    columns = _columns("products")
    if "listed_on_marketplace" in columns:
        op.drop_column("products", "listed_on_marketplace")
    if "deal_of_day_until" in columns:
        op.drop_column("products", "deal_of_day_until")
    if "is_deal_of_day" in columns:
        op.drop_column("products", "is_deal_of_day")
