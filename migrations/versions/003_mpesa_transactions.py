"""Add M-Pesa STK transaction tracking.

Revision ID: 003
Revises: 002
Create Date: 2026-07-19
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSON

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "mpesa_transactions",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("business_id", UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), nullable=True),
        sa.Column("sale_id", UUID(as_uuid=True), nullable=True),
        sa.Column("phone_number", sa.String(20), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("account_reference", sa.String(50), nullable=False),
        sa.Column("description", sa.String(100), nullable=False, server_default="POS Payment"),
        sa.Column("merchant_request_id", sa.String(100), nullable=True),
        sa.Column("checkout_request_id", sa.String(100), nullable=True),
        sa.Column("mpesa_receipt_number", sa.String(50), nullable=True),
        sa.Column("status", sa.String(30), nullable=False, server_default="PENDING"),
        sa.Column("result_code", sa.Integer(), nullable=True),
        sa.Column("result_desc", sa.Text(), nullable=True),
        sa.Column("source", sa.String(30), nullable=False, server_default="POS"),
        sa.Column("cart_snapshot", JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column("callback_payload", JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["sale_id"], ["sales.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("checkout_request_id"),
    )
    op.create_index("ix_mpesa_transactions_business_id", "mpesa_transactions", ["business_id"])
    op.create_index("ix_mpesa_transactions_user_id", "mpesa_transactions", ["user_id"])
    op.create_index("ix_mpesa_transactions_sale_id", "mpesa_transactions", ["sale_id"])
    op.create_index("ix_mpesa_transactions_merchant_request_id", "mpesa_transactions", ["merchant_request_id"])
    op.create_index("ix_mpesa_transactions_checkout_request_id", "mpesa_transactions", ["checkout_request_id"])
    op.create_index("ix_mpesa_transactions_mpesa_receipt_number", "mpesa_transactions", ["mpesa_receipt_number"])
    op.create_index("ix_mpesa_transactions_status", "mpesa_transactions", ["status"])


def downgrade() -> None:
    op.drop_index("ix_mpesa_transactions_status", table_name="mpesa_transactions")
    op.drop_index("ix_mpesa_transactions_mpesa_receipt_number", table_name="mpesa_transactions")
    op.drop_index("ix_mpesa_transactions_checkout_request_id", table_name="mpesa_transactions")
    op.drop_index("ix_mpesa_transactions_merchant_request_id", table_name="mpesa_transactions")
    op.drop_index("ix_mpesa_transactions_sale_id", table_name="mpesa_transactions")
    op.drop_index("ix_mpesa_transactions_user_id", table_name="mpesa_transactions")
    op.drop_index("ix_mpesa_transactions_business_id", table_name="mpesa_transactions")
    op.drop_table("mpesa_transactions")
