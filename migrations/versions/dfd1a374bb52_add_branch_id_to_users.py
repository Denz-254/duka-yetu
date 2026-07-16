"""Add branch_id to users

Revision ID: dfd1a374bb52
Revises: 
Create Date: 2026-07-16 17:20:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision = 'dfd1a374bb52'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Add branch_id column to users table
    op.add_column('users', sa.Column('branch_id', UUID(), nullable=True))

def downgrade() -> None:
    # Remove branch_id column
    op.drop_column('users', 'branch_id')
