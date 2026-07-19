"""Tests for authentication routes."""

import pytest
from fastapi.testclient import TestClient

def test_register(client: TestClient, test_session):
    """Test user registration."""
    response = client.post(
        "/api/v1/auth/register",
        json={
            "business_name": "Test Business",
            "owner_name": "Test Owner",
            "email": "test@example.com",
            "phone": "0712345678",
            "password": "StrongPass123!",
            "business_type": "retail",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "test@example.com"

def test_register_duplicate_email(client: TestClient, test_session):
    """Test registration with duplicate email."""
    # First registration
    client.post(
        "/api/v1/auth/register",
        json={
            "business_name": "Test Business",
            "owner_name": "Test Owner",
            "email": "duplicate@example.com",
            "phone": "0712345678",
            "password": "StrongPass123!",
            "business_type": "retail",
        },
    )

    # Second registration with same email - should fail
    response = client.post(
        "/api/v1/auth/register",
        json={
            "business_name": "Another Business",
            "owner_name": "Another Owner",
            "email": "duplicate@example.com",  # Same email
            "phone": "0798765432",
            "password": "AnotherPass123!",
            "business_type": "retail",
        },
    )
    # API returns 422 for validation errors or 400 for business logic
    assert response.status_code in [400, 422]
    data = response.json()
    # Check that error message indicates duplicate email
    error_msg = str(data).lower()
    assert "email" in error_msg or "duplicate" in error_msg or "exists" in error_msg

def test_login(client: TestClient, test_session):
    """Test user login."""
    # First register a user
    client.post(
        "/api/v1/auth/register",
        json={
            "business_name": "Login Business",
            "owner_name": "Login Owner",
            "email": "login@example.com",
            "phone": "0712345678",
            "password": "StrongPass123!",
            "business_type": "retail",
        },
    )

    # Login
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "login@example.com",
            "password": "StrongPass123!",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data

def test_login_invalid_credentials(client: TestClient, test_session):
    """Test login with invalid credentials."""
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "nonexistent@example.com",
            "password": "WrongPass123!",
        },
    )
    assert response.status_code == 401
