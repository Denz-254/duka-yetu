"""Add subscriptions and management resources.

Revision ID: 002
Revises: 4bae2c0a9ab1
Create Date: 2026-07-19
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "002"
down_revision = "4bae2c0a9ab1"
branch_labels = None
depends_on = None


def _tenant_columns():
    return [
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("business_id", UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"]),
        sa.PrimaryKeyConstraint("id"),
    ]


def upgrade() -> None:
    op.add_column("businesses", sa.Column("subscription_status", sa.String(50), nullable=False, server_default="ACTIVE"))
    op.add_column("businesses", sa.Column("stripe_customer_id", sa.String(255), nullable=True))
    op.add_column("businesses", sa.Column("stripe_subscription_id", sa.String(255), nullable=True))
    op.add_column("businesses", sa.Column("trial_ends_at", sa.DateTime(), nullable=True))
    op.add_column("businesses", sa.Column("subscription_current_period_end", sa.DateTime(), nullable=True))
    op.add_column("businesses", sa.Column("profile", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")))
    op.add_column("businesses", sa.Column("settings", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")))
    op.create_index("ix_businesses_stripe_customer_id", "businesses", ["stripe_customer_id"], unique=True)
    op.create_index("ix_businesses_stripe_subscription_id", "businesses", ["stripe_subscription_id"], unique=True)

    op.create_table(
        "categories",
        *_tenant_columns(),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("color", sa.String(20), nullable=False, server_default="#059669"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.UniqueConstraint("business_id", "name", name="uq_category_name"),
    )
    op.create_index("ix_categories_business_id", "categories", ["business_id"])

    op.create_table(
        "suppliers",
        *_tenant_columns(),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("contact_name", sa.String(255)),
        sa.Column("email", sa.String(255)),
        sa.Column("phone", sa.String(50)),
        sa.Column("address", sa.String(500)),
        sa.Column("city", sa.String(100)),
        sa.Column("country", sa.String(100), server_default="Kenya"),
        sa.Column("tax_id", sa.String(100)),
        sa.Column("payment_terms", sa.Integer(), server_default="30"),
        sa.Column("status", sa.String(50), server_default="active"),
        sa.Column("notes", sa.Text()),
        sa.Column("products", sa.JSON(), nullable=False, server_default=sa.text("'[]'::json")),
        sa.Column("total_purchases", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("total_orders", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_order", sa.DateTime()),
    )
    op.create_index("ix_suppliers_business_id", "suppliers", ["business_id"])

    op.create_table(
        "customers",
        *_tenant_columns(),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255)),
        sa.Column("phone", sa.String(50)),
        sa.Column("address", sa.String(500)),
        sa.Column("status", sa.String(50), server_default="active"),
        sa.Column("notes", sa.Text()),
        sa.Column("total_orders", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_spent", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("last_order", sa.DateTime()),
    )
    op.create_index("ix_customers_business_id", "customers", ["business_id"])

    op.create_table(
        "branches",
        *_tenant_columns(),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("location", sa.String(500), nullable=False),
        sa.Column("phone", sa.String(50)),
        sa.Column("email", sa.String(255)),
        sa.Column("manager", sa.String(255)),
        sa.Column("status", sa.String(50), server_default="active"),
        sa.Column("staff", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("sales", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("revenue", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.UniqueConstraint("business_id", "name", name="uq_branch_name"),
    )
    op.create_index("ix_branches_business_id", "branches", ["business_id"])


def downgrade() -> None:
    op.drop_table("branches")
    op.drop_table("customers")
    op.drop_table("suppliers")
    op.drop_table("categories")
    op.drop_index("ix_businesses_stripe_subscription_id", table_name="businesses")
    op.drop_index("ix_businesses_stripe_customer_id", table_name="businesses")
    for column in [
        "settings",
        "profile",
        "subscription_current_period_end",
        "trial_ends_at",
        "stripe_subscription_id",
        "stripe_customer_id",
        "subscription_status",
    ]:
        op.drop_column("businesses", column)
