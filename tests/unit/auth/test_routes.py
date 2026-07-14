"""Authentication route tests."""

def test_register(client, test_business_data):
    """Test business registration."""
    response = client.post("/api/v1/auth/register", json=test_business_data)
    assert response.status_code == 201
    data = response.json()
    assert "user" in data
    assert "business" in data
    assert "token" in data
    assert data["user"]["username"] == test_business_data["username"]

def test_register_duplicate_email(client, test_business_data):
    """Test registration with duplicate email."""
    # First registration
    client.post("/api/v1/auth/register", json=test_business_data)
    
    # Second registration with same email
    response = client.post("/api/v1/auth/register", json=test_business_data)
    assert response.status_code == 400
    assert "already exists" in response.text

def test_login(client, test_business_data):
    """Test user login."""
    # First register
    client.post("/api/v1/auth/register", json=test_business_data)
    
    # Then login
    login_data = {
        "username": test_business_data["username"],
        "password": test_business_data["password"]
    }
    response = client.post("/api/v1/auth/login", json=login_data)
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert data["user"]["username"] == test_business_data["username"]

def test_login_invalid_credentials(client, test_business_data):
    """Test login with invalid credentials."""
    # Register
    client.post("/api/v1/auth/register", json=test_business_data)
    
    # Login with wrong password
    login_data = {
        "username": test_business_data["username"],
        "password": "WrongPassword123"
    }
    response = client.post("/api/v1/auth/login", json=login_data)
    assert response.status_code == 401
    assert "Invalid" in response.text
