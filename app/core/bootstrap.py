"""Startup seeding helpers (super admin + schema patches)."""

from datetime import datetime

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_password_hash
from app.models.user import User


def _column_exists(db: Session, table: str, column: str) -> bool:
    return bool(
        db.execute(
            text(
                """
                SELECT 1 FROM information_schema.columns
                WHERE table_name = :table AND column_name = :column
                """
            ),
            {"table": table, "column": column},
        ).scalar()
    )


def ensure_schema_patches(db: Session) -> None:
    """Apply critical missing columns when Alembic hasn't run yet (e.g. volume mounts)."""
    # products.category_id — required by Product model / marketplace
    if not _column_exists(db, "products", "category_id"):
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
        print("Schema patch: products.category_id added")

    # Featured product hero placement
    if not _column_exists(db, "products", "is_featured"):
        db.execute(
            text("ALTER TABLE products ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT false")
        )
        db.commit()
        print("Schema patch: products.is_featured added")
    if not _column_exists(db, "products", "featured_until"):
        db.execute(text("ALTER TABLE products ADD COLUMN featured_until TIMESTAMP"))
        db.commit()
        print("Schema patch: products.featured_until added")
    if not _column_exists(db, "products", "featured_badge"):
        db.execute(text("ALTER TABLE products ADD COLUMN featured_badge VARCHAR(50)"))
        db.commit()
        print("Schema patch: products.featured_badge added")

    # Login lockout
    if not _column_exists(db, "users", "failed_login_attempts"):
        db.execute(
            text(
                "ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER NOT NULL DEFAULT 0"
            )
        )
        db.commit()
        print("Schema patch: users.failed_login_attempts added")
    if not _column_exists(db, "users", "locked_until"):
        db.execute(text("ALTER TABLE users ADD COLUMN locked_until TIMESTAMP"))
        db.commit()
        print("Schema patch: users.locked_until added")


def ensure_super_admin(db: Session) -> None:
    """Create or refresh the platform super-admin account from env credentials."""
    username = (settings.SUPER_ADMIN_USERNAME or "superadmin").strip()
    password = (settings.SUPER_ADMIN_PASSWORD or "").strip()
    if not password:
        print("SUPER_ADMIN_PASSWORD not set — skipping super-admin bootstrap")
        return

    user = db.query(User).filter(User.username == username).first()
    if user:
        user.role = "SUPER_ADMIN"
        user.business_id = None
        user.is_active = True
        user.email = settings.SUPER_ADMIN_EMAIL or user.email
        user.password_hash = get_password_hash(password)
        db.commit()
        print(f"Super admin ready: {username}")
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
    print(f"Super admin created: {username}")
