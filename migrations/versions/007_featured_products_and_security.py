"""Featured products + login lockout columns.

Revision ID: 007_featured_security
Revises: 006
Create Date: 2026-08-03
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "007_featured_security"
down_revision = "006"
branch_labels = None
depends_on = None


def _columns(table: str) -> set[str]:
    inspector = inspect(op.get_bind())
    if table not in inspector.get_table_names():
        return set()
    return {col["name"] for col in inspector.get_columns(table)}


def upgrade() -> None:
    product_cols = _columns("products")
    user_cols = _columns("users")
    if "is_featured" not in product_cols:
        op.add_column(
            "products",
            sa.Column("is_featured", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        )
    if "featured_until" not in product_cols:
        op.add_column("products", sa.Column("featured_until", sa.DateTime(), nullable=True))
    if "featured_badge" not in product_cols:
        op.add_column("products", sa.Column("featured_badge", sa.String(length=50), nullable=True))
    if "failed_login_attempts" not in user_cols:
        op.add_column(
            "users",
            sa.Column("failed_login_attempts", sa.Integer(), server_default="0", nullable=False),
        )
    if "locked_until" not in user_cols:
        op.add_column("users", sa.Column("locked_until", sa.DateTime(), nullable=True))


def downgrade() -> None:
    user_cols = _columns("users")
    product_cols = _columns("products")
    if "locked_until" in user_cols:
        op.drop_column("users", "locked_until")
    if "failed_login_attempts" in user_cols:
        op.drop_column("users", "failed_login_attempts")
    if "featured_badge" in product_cols:
        op.drop_column("products", "featured_badge")
    if "featured_until" in product_cols:
        op.drop_column("products", "featured_until")
    if "is_featured" in product_cols:
        op.drop_column("products", "is_featured")
