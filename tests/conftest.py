"""Pytest configuration and fixtures."""

import pytest
import os
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings

# Use PostgreSQL for tests (same as production)
# This uses the TEST_DATABASE_URL from environment or defaults to PostgreSQL
TEST_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/test_db"
)

# For CI, use PostgreSQL, fallback to SQLite only if explicitly requested
if "sqlite" in TEST_DATABASE_URL:
    # SQLite fallback with UUID support via string conversion
    from sqlalchemy import types
    from sqlalchemy.dialects.sqlite import dialect as sqlite_dialect
    
    class UUIDAsString(types.TypeDecorator):
        impl = types.String
        
        def process_bind_param(self, value, dialect):
            if value is None:
                return value
            return str(value)
        
        def process_result_value(self, value, dialect):
            return value
    
    # Override UUID column for SQLite
    # This is a workaround for SQLite not supporting UUID
else:
    # PostgreSQL is the primary test database
    pass

@pytest.fixture(scope="session")
def test_engine():
    """Create test database engine."""
    # Use PostgreSQL with connection pooling disabled for tests
    engine = create_engine(
        TEST_DATABASE_URL,
        poolclass=NullPool,
        echo=False
    )
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    yield engine
    
    # Clean up after tests
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
    """Create test client."""
    def override_get_db():
        try:
            yield test_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()

@pytest.fixture
def auth_headers():
    """Create authentication headers."""
    return {"Authorization": "Bearer test_token_12345"}

@pytest.fixture
def test_user_data():
    """Test user data."""
    return {
        "username": "testuser",
        "password": "TestPass123",
        "email": "test@example.com",
        "name": "Test User",
        "phone": "+254712345678"
    }

@pytest.fixture
def test_business_data():
    """Test business data."""
    return {
        "business_name": "Test Business",
        "owner_name": "Test Owner",
        "phone": "+254712345678",
        "email": "test@example.com",
        "password": "TestPass123",
        "username": "testuser"
    }
