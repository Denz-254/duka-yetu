"""Pytest configuration and fixtures for Duka Yetu tests."""

import pytest
import os
import sys
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
import uuid

# Add the app directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings
from app.models.business import Business
from app.models.user import User
from app.models.product import Product
from app.core.security import get_password_hash

# Test database URL - use SQLite for faster tests
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "sqlite:///./test.db"
)

@pytest.fixture(scope="session")
def test_engine():
    """Create test database engine."""
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False} if "sqlite" in TEST_DATABASE_URL else {}
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def test_session(test_engine) -> Generator[Session, None, None]:
    """Create test database session."""
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    session = TestingSessionLocal()
    yield session
    session.rollback()
    session.close()

@pytest.fixture
def client(test_session) -> Generator[TestClient, None, None]:
    """Create test client with database session."""
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
    """Create authentication headers for testing."""
    return {"Authorization": "Bearer test_token"}

@pytest.fixture
def test_user_data():
    """Provide test user data."""
    return {
        "business_name": "Test Business",
        "owner_name": "Test Owner",
        "email": "test@example.com",
        "phone": "0712345678",
        "password": "StrongPass123!",
        "business_type": "retail",
    }

@pytest.fixture
def test_product_data():
    """Provide test product data."""
    return {
        "name": "Test Product",
        "sku": "TP001",
        "selling_price": 1000.00,
        "cost_price": 800.00,
        "stock_quantity": 50,
    }

@pytest.fixture
def test_business_data(test_session):
    """Create a test business and return its data."""
    business_id = uuid.uuid4()
    business = Business(
        id=business_id,
        name="Test Business",
        owner_name="Test Owner",
        email="business@test.com",
        phone="0712345678",
        password_hash=get_password_hash("testpass123"),
        package="BASIC",
    )
    test_session.add(business)
    test_session.commit()
    
    return {
        "id": str(business_id),
        "name": business.name,
        "email": business.email,
    }

@pytest.fixture
def test_user(test_session, test_business_data):
    """Create a test user."""
    user = User(
        id=uuid.uuid4(),
        business_id=uuid.UUID(test_business_data["id"]),
        name="Test Cashier",
        email="cashier@test.com",
        username=f"cashier_{uuid.uuid4().hex[:8]}",
        phone="0712345678",
        password_hash=get_password_hash("testpass123"),
        role="CASHIER",
        is_active=True,
    )
    test_session.add(user)
    test_session.commit()
    return user

@pytest.fixture
def test_owner(test_session, test_business_data):
    """Create a test owner."""
    owner = User(
        id=uuid.uuid4(),
        business_id=uuid.UUID(test_business_data["id"]),
        name="Test Owner",
        email="owner@test.com",
        username=f"owner_{uuid.uuid4().hex[:8]}",
        phone="0712345678",
        password_hash=get_password_hash("testpass123"),
        role="OWNER",
        is_active=True,
    )
    test_session.add(owner)
    test_session.commit()
    return owner

@pytest.fixture
def test_product(test_session, test_business_data):
    """Create a test product."""
    product = Product(
        id=uuid.uuid4(),
        business_id=uuid.UUID(test_business_data["id"]),
        name="Test Product",
        sku="TP001",
        selling_price=1000.00,
        cost_price=800.00,
        stock_quantity=50,
    )
    test_session.add(product)
    test_session.commit()
    return product
