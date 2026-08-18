"""Add image_url to products

Revision ID: 4bae2c0a9ab1
Revises: 001
Create Date: 2026-07-16 22:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '4bae2c0a9ab1'
down_revision = '007_featured_security'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column('products', sa.Column('image_url', sa.String(500), nullable=True))

def downgrade() -> None:
    op.drop_column('products', 'image_url')
