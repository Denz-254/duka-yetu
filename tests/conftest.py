"""Pytest configuration and fixtures."""

import pytest
import os
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from app.main import app
from app.core.database import Base, get_db

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/test_db"
)

@pytest.fixture(scope="session")
def test_engine():
    """Create test database engine."""
    engine = create_engine(DATABASE_URL, poolclass=NullPool, echo=False)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()

@pytest.fixture
def test_session(test_engine):
    """Create test database session."""
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
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
def test_business_data():
    """Test business data - using unique data each time."""
    import uuid
    unique_id = str(uuid.uuid4())[:8]
    return {
        "business_name": f"Test Business {unique_id}",
        "owner_name": f"Test Owner {unique_id}",
        "phone": f"+254712345{unique_id[:4]}",
        "email": f"test_{unique_id}@example.com",
        "password": "TestPass123",
        "username": f"testuser_{unique_id}"
    }
