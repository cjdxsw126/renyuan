from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import Dataset
from schemas import Dataset as DatasetSchema, DatasetCreate, DatasetUpdate
import time
from datetime import datetime, UTC

router = APIRouter()

@router.get("", response_model=dict)
def get_datasets(db: Session = Depends(get_db)):
    """Get all datasets with total count"""
    datasets = db.query(Dataset).order_by(Dataset.created_at.desc()).all()
    total_count = len(datasets)
    return {
        "total": total_count,
        "datasets": datasets
    }

@router.get("/{dataset_id}", response_model=DatasetSchema)
def get_dataset(dataset_id: str, db: Session = Depends(get_db)):
    """Get a dataset by ID"""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found"
        )
    
    return dataset

@router.post("", response_model=DatasetSchema)
def create_dataset(dataset_data: DatasetCreate, db: Session = Depends(get_db)):
    """Create a new dataset"""
    # Create new dataset
    dataset_id = str(int(time.time() * 1000))
    
    new_dataset = Dataset(
        id=dataset_id,
        name=dataset_data.name,
        count=dataset_data.count
    )
    
    db.add(new_dataset)
    db.commit()
    db.refresh(new_dataset)
    
    return new_dataset

@router.put("/{dataset_id}", response_model=DatasetSchema)
def update_dataset(dataset_id: str, dataset_data: DatasetUpdate, db: Session = Depends(get_db)):
    """Update a dataset"""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found"
        )
    
    # Update fields
    if dataset_data.name is not None:
        dataset.name = dataset_data.name
    
    if dataset_data.count is not None:
        dataset.count = dataset_data.count
    
    dataset.updated_at = datetime.now(UTC)
    
    db.commit()
    db.refresh(dataset)
    
    return dataset

@router.delete("/{dataset_id}")
def delete_dataset(dataset_id: str, db: Session = Depends(get_db)):
    """Delete a dataset"""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found"
        )
    
    db.delete(dataset)
    db.commit()
    
    return {"message": "Dataset deleted successfully"}