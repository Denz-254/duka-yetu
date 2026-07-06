"""Database configuration and session management."""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import NullPool
from typing import Generator

from app.core.config import settings

# Create base class for models
Base = declarative_base()

# Update DATABASE_URL to use psycopg driver
# This line is the key change:
database_url = settings.DATABASE_URL.replace("postgresql://", "postgresql+psycopg://")

# Create engine with updated URL
engine = create_engine(
    database_url,  # Changed from settings.DATABASE_URL
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_pre_ping=True,
    echo=settings.DEBUG,
)

# Create session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

def get_db() -> Generator[Session, None, None]:
    """
    Get database session.
    
    Yields:
        SQLAlchemy session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db() -> None:
    """Initialize database - create all tables."""
    Base.metadata.create_all(bind=engine)

def drop_db() -> None:
    """Drop all tables (for testing)."""
    Base.metadata.drop_all(bind=engine)