"""Add deal of the day columns to products

Revision ID: 008
Revises: 4bae2c0a9ab1
Create Date: 2026-08-18 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '008'
down_revision = '4bae2c0a9ab1'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column('products', sa.Column('is_deal_of_day', sa.Boolean(), nullable=False, server_default='0'))
    op.add_column('products', sa.Column('deal_of_day_until', sa.DateTime(), nullable=True))

def downgrade() -> None:
    op.drop_column('products', 'deal_of_day_until')
    op.drop_column('products', 'is_deal_of_day')
