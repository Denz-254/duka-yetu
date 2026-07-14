"""Pytest configuration and fixtures - Force PostgreSQL for tests."""

import pytest
import os
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from app.main import app
from app.core.database import Base, get_db

# Force PostgreSQL for tests - NO SQLITE!
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/test_db"
)

@pytest.fixture(scope="session")
def test_engine():
    """Create test database engine using PostgreSQL."""
    engine = create_engine(
        DATABASE_URL,
        poolclass=NullPool,
        echo=False
    )
    
    # Drop and create all tables
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield engine
    
    # Clean up
    Base.metadata.drop_all(bind=engine)
    engine.dispose()

@pytest.fixture
def test_session(test_engine):
    """Create test database session."""
    TestingSessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=test_engine
    )
    session = TestingSessionLocal()
    yield session
    session.rollback()
    session.close()

@pytest.fixture
def client(test_session):
    """Create test client with database override."""
    def override_get_db():
        try:
            yield test_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()

@pytest.fixture
def test_business_data():
    """Test business registration data."""
    return {
        "business_name": "Test Business",
        "owner_name": "Test Owner",
        "phone": "+254712345678",
        "email": "test@example.com",
        "password": "TestPass123",
        "username": "testuser"
    }
