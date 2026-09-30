"""Store manual M-Pesa instructions and receipt codes.

Revision ID: 012
Revises: 011
Create Date: 2026-09-30
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "012"
down_revision = "011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = inspect(op.get_bind())
    tables = set(inspector.get_table_names())

    if "online_orders" in tables:
        columns = {col["name"] for col in inspector.get_columns("online_orders")}
        if "payment_details" not in columns:
            op.add_column("online_orders", sa.Column("payment_details", sa.JSON(), nullable=True))

    if "sales" in tables:
        columns = {col["name"] for col in inspector.get_columns("sales")}
        if "mpesa_receipt_number" not in columns:
            op.add_column("sales", sa.Column("mpesa_receipt_number", sa.String(length=50), nullable=True))


def downgrade() -> None:
    inspector = inspect(op.get_bind())
    tables = set(inspector.get_table_names())

    if "sales" in tables:
        columns = {col["name"] for col in inspector.get_columns("sales")}
        if "mpesa_receipt_number" in columns:
            op.drop_column("sales", "mpesa_receipt_number")

    if "online_orders" in tables:
        columns = {col["name"] for col in inspector.get_columns("online_orders")}
        if "payment_details" in columns:
            op.drop_column("online_orders", "payment_details")
