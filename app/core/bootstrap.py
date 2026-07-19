"""Startup seeding helpers (super admin + schema patches)."""

from datetime import datetime

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_password_hash
from app.models.user import User


def ensure_schema_patches(db: Session) -> None:
    """Apply critical missing columns when Alembic hasn't run yet (e.g. volume mounts)."""
    # products.category_id — required by Product model / marketplace
    exists = db.execute(
        text(
            """
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'products' AND column_name = 'category_id'
            """
        )
    ).scalar()
    if not exists:
        db.execute(text("ALTER TABLE products ADD COLUMN category_id UUID"))
        db.execute(
            text(
                """
                DO $$ BEGIN
                  IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'fk_products_category_id'
                  ) THEN
                    ALTER TABLE products
                      ADD CONSTRAINT fk_products_category_id
                      FOREIGN KEY (category_id) REFERENCES categories(id);
                  END IF;
                END $$;
                """
            )
        )
        db.execute(
            text(
                """
                CREATE INDEX IF NOT EXISTS ix_products_category_id
                ON products (category_id)
                """
            )
        )
        db.commit()
        print("✅ Schema patch: products.category_id added")


def ensure_super_admin(db: Session) -> None:
    """Create or refresh the platform super-admin account from env credentials."""
    username = (settings.SUPER_ADMIN_USERNAME or "superadmin").strip()
    password = (settings.SUPER_ADMIN_PASSWORD or "").strip()
    if not password:
        print("⚠️ SUPER_ADMIN_PASSWORD not set — skipping super-admin bootstrap")
        return

    user = db.query(User).filter(User.username == username).first()
    if user:
        user.role = "SUPER_ADMIN"
        user.business_id = None
        user.is_active = True
        user.email = settings.SUPER_ADMIN_EMAIL or user.email
        user.password_hash = get_password_hash(password)
        db.commit()
        print(f"✅ Super admin ready: {username}")
        return

    user = User(
        business_id=None,
        name="Platform Super Admin",
        email=settings.SUPER_ADMIN_EMAIL or "superadmin@dukayetu.local",
        phone=None,
        username=username,
        password_hash=get_password_hash(password),
        role="SUPER_ADMIN",
        is_active=True,
        login_time=datetime.utcnow(),
    )
    db.add(user)
    db.commit()
    print(f"✅ Super admin created: {username}")
