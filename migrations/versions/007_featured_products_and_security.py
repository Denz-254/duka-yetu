"""Featured products + login lockout columns.

Revision ID: 007_featured_security
Revises: 006_product_category
Create Date: 2026-08-03
"""

from alembic import op
import sqlalchemy as sa

revision = "007_featured_security"
down_revision = "006_product_category"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("products", sa.Column("is_featured", sa.Boolean(), server_default="false", nullable=False))
    op.add_column("products", sa.Column("featured_until", sa.DateTime(), nullable=True))
    op.add_column("products", sa.Column("featured_badge", sa.String(length=50), nullable=True))
    op.add_column(
        "users",
        sa.Column("failed_login_attempts", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column("users", sa.Column("locked_until", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "locked_until")
    op.drop_column("users", "failed_login_attempts")
    op.drop_column("products", "featured_badge")
    op.drop_column("products", "featured_until")
    op.drop_column("products", "is_featured")
