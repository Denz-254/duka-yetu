"""Marketplace orders and notifications.

Revision ID: 005
Revises: 004
Create Date: 2026-07-19
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSON

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "online_orders",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("business_id", UUID(as_uuid=True), nullable=False),
        sa.Column("order_number", sa.String(50), nullable=False),
        sa.Column("customer_name", sa.String(255), nullable=False),
        sa.Column("customer_phone", sa.String(30), nullable=False),
        sa.Column("customer_email", sa.String(255), nullable=True),
        sa.Column("delivery_address", sa.Text(), nullable=True),
        sa.Column("items", JSON(), nullable=False, server_default=sa.text("'[]'::json")),
        sa.Column("subtotal", sa.Numeric(12, 2), nullable=False),
        sa.Column("commission_percent", sa.Numeric(5, 2), nullable=False, server_default="5"),
        sa.Column("commission_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("business_payout", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("total_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("payment_method", sa.String(30), nullable=False, server_default="MPESA"),
        sa.Column("payment_status", sa.String(30), nullable=False, server_default="PENDING"),
        sa.Column("fulfillment_status", sa.String(30), nullable=False, server_default="PENDING"),
        sa.Column("mpesa_checkout_request_id", sa.String(100), nullable=True),
        sa.Column("mpesa_receipt_number", sa.String(50), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("paid_at", sa.DateTime(), nullable=True),
        sa.Column("delivered_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("order_number"),
    )
    op.create_index("ix_online_orders_business_id", "online_orders", ["business_id"])
    op.create_index("ix_online_orders_order_number", "online_orders", ["order_number"])
    op.create_index("ix_online_orders_payment_status", "online_orders", ["payment_status"])
    op.create_index("ix_online_orders_fulfillment_status", "online_orders", ["fulfillment_status"])
    op.create_index("ix_online_orders_mpesa_checkout_request_id", "online_orders", ["mpesa_checkout_request_id"])
    op.create_index("ix_online_orders_mpesa_receipt_number", "online_orders", ["mpesa_receipt_number"])

    op.create_table(
        "notifications",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("business_id", UUID(as_uuid=True), nullable=True),
        sa.Column("user_id", UUID(as_uuid=True), nullable=True),
        sa.Column("audience", sa.String(30), nullable=False, server_default="BUSINESS"),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("type", sa.String(50), nullable=False, server_default="ORDER"),
        sa.Column("data", JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column("is_read", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_notifications_business_id", "notifications", ["business_id"])
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_notifications_user_id", table_name="notifications")
    op.drop_index("ix_notifications_business_id", table_name="notifications")
    op.drop_table("notifications")
    op.drop_index("ix_online_orders_mpesa_receipt_number", table_name="online_orders")
    op.drop_index("ix_online_orders_mpesa_checkout_request_id", table_name="online_orders")
    op.drop_index("ix_online_orders_fulfillment_status", table_name="online_orders")
    op.drop_index("ix_online_orders_payment_status", table_name="online_orders")
    op.drop_index("ix_online_orders_order_number", table_name="online_orders")
    op.drop_index("ix_online_orders_business_id", table_name="online_orders")
    op.drop_table("online_orders")
