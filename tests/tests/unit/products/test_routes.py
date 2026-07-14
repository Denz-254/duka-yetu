"""Product route tests."""

import pytest

def test_create_product(client, test_business_data):
    """Test product creation."""
    # Register and get token
    register_response = client.post("/api/v1/auth/register", json=test_business_data)
    token = register_response.json()["token"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create product
    product_data = {
        "name": "Test Product",
        "sku": "TEST-001",
        "selling_price": 10.99,
        "cost_price": 5.50,
        "stock_quantity": 100,
        "description": "Test product description"
    }
    response = client.post("/api/v1/products/", json=product_data, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == product_data["name"]
    assert data["sku"] == product_data["sku"]
    assert "id" in data

def test_list_products(client, test_business_data):
    """Test listing products."""
    # Register and get token
    register_response = client.post("/api/v1/auth/register", json=test_business_data)
    token = register_response.json()["token"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create a product
    product_data = {
        "name": "Test Product 2",
        "sku": "TEST-002",
        "selling_price": 15.99,
        "cost_price": 8.00,
        "stock_quantity": 50,
        "description": "Another test product"
    }
    client.post("/api/v1/products/", json=product_data, headers=headers)
    
    # List products
    response = client.get("/api/v1/products/", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert data["total"] >= 1
