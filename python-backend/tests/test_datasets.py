import pytest
from fastapi.testclient import TestClient
from main import app
from database import Base, engine, get_db
from sqlalchemy.orm import sessionmaker

# Create a test database
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def client():
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()
    
    app.dependency_overrides[get_db] = override_get_db
    # Create tables
    Base.metadata.create_all(bind=engine)
    yield TestClient(app)
    # Drop tables
    Base.metadata.drop_all(bind=engine)
    del app.dependency_overrides[get_db]

def test_create_dataset(client):
    """Test creating a dataset"""
    response = client.post(
        "/api/datasets",
        json={
            "name": "Test Dataset",
            "count": 0
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Dataset"
    assert data["count"] == 0
    assert "id" in data

def test_get_datasets(client):
    """Test getting all datasets"""
    # Create a dataset first
    client.post(
        "/api/datasets",
        json={
            "name": "Test Dataset",
            "count": 0
        }
    )
    
    # Get all datasets
    response = client.get("/api/datasets")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "Test Dataset"

def test_get_dataset(client):
    """Test getting a specific dataset"""
    # Create a dataset first
    create_response = client.post(
        "/api/datasets",
        json={
            "name": "Test Dataset",
            "count": 0
        }
    )
    dataset_id = create_response.json()["id"]
    
    # Get the dataset
    response = client.get(f"/api/datasets/{dataset_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == dataset_id
    assert data["name"] == "Test Dataset"

def test_update_dataset(client):
    """Test updating a dataset"""
    # Create a dataset first
    create_response = client.post(
        "/api/datasets",
        json={
            "name": "Test Dataset",
            "count": 0
        }
    )
    dataset_id = create_response.json()["id"]
    
    # Update the dataset
    response = client.put(
        f"/api/datasets/{dataset_id}",
        json={
            "name": "Updated Dataset",
            "count": 5
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == dataset_id
    assert data["name"] == "Updated Dataset"
    assert data["count"] == 5

def test_delete_dataset(client):
    """Test deleting a dataset"""
    # Create a dataset first
    create_response = client.post(
        "/api/datasets",
        json={
            "name": "Test Dataset",
            "count": 0
        }
    )
    dataset_id = create_response.json()["id"]
    
    # Delete the dataset
    response = client.delete(f"/api/datasets/{dataset_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Dataset deleted successfully"
    
    # Try to get the deleted dataset
    get_response = client.get(f"/api/datasets/{dataset_id}")
    assert get_response.status_code == 404