import pytest
from fastapi.testclient import TestClient
from main import app
from database import Base, engine, get_db
from sqlalchemy.orm import sessionmaker

# Create a test database
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def client():
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()
    
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    
    # Drop tables
    Base.metadata.drop_all(bind=engine)
    del app.dependency_overrides[get_db]

def test_register(client):
    """Test user registration"""
    response = client.post(
        "/api/auth/register",
        json={
            "username": "testuser",
            "password": "password123",
            "role": "member",
            "enabled": True
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "testuser"
    assert data["role"] == "member"
    assert data["enabled"] == True

def test_login(client):
    """Test user login"""
    # First register a user
    client.post(
        "/api/auth/register",
        json={
            "username": "testuser",
            "password": "password123",
            "role": "member",
            "enabled": True
        }
    )
    
    # Then login
    response = client.post(
        "/api/auth/login",
        json={
            "username": "testuser",
            "password": "password123"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert "user" in data
    assert data["user"]["username"] == "testuser"

def test_login_invalid_credentials(client):
    """Test login with invalid credentials"""
    response = client.post(
        "/api/auth/login",
        json={
            "username": "nonexistent",
            "password": "wrongpassword"
        }
    )
    assert response.status_code == 401
    data = response.json()
    assert data["detail"] == "Invalid username or password"