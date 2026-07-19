"""Business approval status and nullable business_id for super admin.

Revision ID: 004
Revises: 003
Create Date: 2026-07-19
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "businesses",
        sa.Column("approval_status", sa.String(20), nullable=False, server_default="APPROVED"),
    )
    op.add_column("businesses", sa.Column("approved_at", sa.DateTime(), nullable=True))
    op.add_column("businesses", sa.Column("rejection_reason", sa.String(500), nullable=True))
    op.create_index("ix_businesses_approval_status", "businesses", ["approval_status"])

    op.alter_column("users", "business_id", existing_type=UUID(as_uuid=True), nullable=True)


def downgrade() -> None:
    op.alter_column("users", "business_id", existing_type=UUID(as_uuid=True), nullable=False)
    op.drop_index("ix_businesses_approval_status", table_name="businesses")
    op.drop_column("businesses", "rejection_reason")
    op.drop_column("businesses", "approved_at")
    op.drop_column("businesses", "approval_status")
