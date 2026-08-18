"""Add cashier_shifts for clock in / clock out.

Revision ID: 009
Revises: 008
Create Date: 2026-08-18
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.dialects.postgresql import UUID

revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = inspect(op.get_bind())
    if "cashier_shifts" in inspector.get_table_names():
        return
    op.create_table(
        "cashier_shifts",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("business_id", UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("opened_at", sa.DateTime(), nullable=False),
        sa.Column("closed_at", sa.DateTime(), nullable=True),
        sa.Column("opening_cash", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("closing_cash", sa.Numeric(12, 2), nullable=True),
        sa.Column("expected_cash", sa.Numeric(12, 2), nullable=True),
        sa.Column("cash_sales", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("mpesa_sales", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("card_sales", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("send_money_sales", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("total_sales", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("sales_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("variance", sa.Numeric(12, 2), nullable=True),
        sa.Column("notes", sa.String(length=500), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="OPEN"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_cashier_shifts_business_id", "cashier_shifts", ["business_id"])
    op.create_index("ix_cashier_shifts_user_id", "cashier_shifts", ["user_id"])
    op.create_index("ix_cashier_shifts_status", "cashier_shifts", ["status"])


def downgrade() -> None:
    inspector = inspect(op.get_bind())
    if "cashier_shifts" not in inspector.get_table_names():
        return
    op.drop_index("ix_cashier_shifts_status", table_name="cashier_shifts")
    op.drop_index("ix_cashier_shifts_user_id", table_name="cashier_shifts")
    op.drop_index("ix_cashier_shifts_business_id", table_name="cashier_shifts")
    op.drop_table("cashier_shifts")
