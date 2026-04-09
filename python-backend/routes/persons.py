from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import Person, Certificate, Dataset
from schemas import Person as PersonSchema, PersonCreate, PersonUpdate, BatchPersonCreate, BatchDeleteRequest
import json
from datetime import datetime

router = APIRouter()

@router.get("/dataset/{dataset_id}", response_model=list[PersonSchema])
def get_persons_by_dataset(dataset_id: str, db: Session = Depends(get_db)):
    """Get all persons in a dataset"""
    persons = db.query(Person).filter(Person.dataset_id == dataset_id).all()
    
    # Prepare response with certificates
    person_responses = []
    for person in persons:
        # Parse original_data if it's stored as JSON string
        original_data = None
        if person.original_data:
            try:
                original_data = json.loads(person.original_data)
            except json.JSONDecodeError:
                original_data = person.original_data
        
        person_response = PersonSchema(
            id=person.id,
            dataset_id=person.dataset_id,
            name=person.name,
            age=person.age,
            education=person.education,
            employee_id=person.employee_id,
            original_data=original_data,
            certificates=[
                {
                    "id": cert.id,
                    "name": cert.name,
                    "value": cert.value
                }
                for cert in person.certificates
            ]
        )
        person_responses.append(person_response)
    
    return person_responses

@router.get("/{person_id}", response_model=PersonSchema)
def get_person(person_id: int, db: Session = Depends(get_db)):
    """Get a person by ID"""
    person = db.query(Person).filter(Person.id == person_id).first()
    
    if not person:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Person not found"
        )
    
    # Parse original_data if it's stored as JSON string
    original_data = None
    if person.original_data:
        try:
            original_data = json.loads(person.original_data)
        except json.JSONDecodeError:
            original_data = person.original_data
    
    person_response = PersonSchema(
        id=person.id,
        dataset_id=person.dataset_id,
        name=person.name,
        age=person.age,
        education=person.education,
        employee_id=person.employee_id,
        original_data=original_data,
        certificates=[
            {
                "id": cert.id,
                "name": cert.name,
                "value": cert.value
            }
            for cert in person.certificates
        ]
    )
    
    return person_response

@router.post("", response_model=PersonSchema)
def create_person(person_data: PersonCreate, db: Session = Depends(get_db)):
    """Create a new person"""
    # Check if dataset exists
    dataset = db.query(Dataset).filter(Dataset.id == person_data.dataset_id).first()
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found"
        )
    
    # Convert original_data to JSON string if it's a dict
    original_data_str = None
    if person_data.original_data:
        original_data_str = json.dumps(person_data.original_data)
    
    # Create new person
    new_person = Person(
        dataset_id=person_data.dataset_id,
        name=person_data.name,
        age=person_data.age,
        education=person_data.education,
        employee_id=person_data.employee_id,
        original_data=original_data_str
    )
    
    db.add(new_person)
    db.commit()
    db.refresh(new_person)
    
    # Create certificates if provided
    for cert_data in person_data.certificates:
        new_certificate = Certificate(
            person_id=new_person.id,
            name=cert_data.name,
            value=cert_data.value
        )
        db.add(new_certificate)
    
    db.commit()
    db.refresh(new_person)
    
    # Update dataset count
    dataset.count += 1
    dataset.updated_at = datetime.utcnow()
    db.commit()
    
    # Prepare response
    # Parse original_data if it's stored as JSON string
    original_data = None
    if new_person.original_data:
        try:
            original_data = json.loads(new_person.original_data)
        except json.JSONDecodeError:
            original_data = new_person.original_data
    
    person_response = PersonSchema(
        id=new_person.id,
        dataset_id=new_person.dataset_id,
        name=new_person.name,
        age=new_person.age,
        education=new_person.education,
        employee_id=new_person.employee_id,
        original_data=original_data,
        certificates=[
            {
                "id": cert.id,
                "name": cert.name,
                "value": cert.value
            }
            for cert in new_person.certificates
        ]
    )
    
    return person_response

@router.post("/batch")
def batch_create_persons(batch_data: BatchPersonCreate, db: Session = Depends(get_db)):
    """Batch create persons"""
    # Check if dataset exists
    dataset = db.query(Dataset).filter(Dataset.id == batch_data.dataset_id).first()
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found"
        )
    
    created_persons = []
    
    for person_data in batch_data.persons:
        # Convert original_data to JSON string if it's a dict
        original_data_str = None
        if person_data.original_data:
            original_data_str = json.dumps(person_data.original_data)
        
        # Create new person
        new_person = Person(
            dataset_id=batch_data.dataset_id,
            name=person_data.name,
            age=person_data.age,
            education=person_data.education,
            employee_id=person_data.employee_id,
            original_data=original_data_str
        )
        
        db.add(new_person)
        db.commit()
        db.refresh(new_person)
        
        # Create certificates if provided
        for cert_data in person_data.certificates:
            new_certificate = Certificate(
                person_id=new_person.id,
                name=cert_data.name,
                value=cert_data.value
            )
            db.add(new_certificate)
        
        db.commit()
        db.refresh(new_person)
        
        # Parse original_data if it's stored as JSON string
        original_data = None
        if new_person.original_data:
            try:
                original_data = json.loads(new_person.original_data)
            except json.JSONDecodeError:
                original_data = new_person.original_data
        
        # Prepare person response
        person_response = {
            "id": new_person.id,
            "dataset_id": new_person.dataset_id,
            "name": new_person.name,
            "age": new_person.age,
            "education": new_person.education,
            "employee_id": new_person.employee_id,
            "original_data": original_data,
            "certificates": [
                {
                    "id": cert.id,
                    "name": cert.name,
                    "value": cert.value
                }
                for cert in new_person.certificates
            ]
        }
        
        created_persons.append(person_response)
    
    # Update dataset count
    dataset.count += len(batch_data.persons)
    dataset.updated_at = datetime.utcnow()
    db.commit()
    
    return created_persons

@router.put("/{person_id}", response_model=PersonSchema)
def update_person(person_id: int, person_data: PersonUpdate, db: Session = Depends(get_db)):
    """Update a person"""
    person = db.query(Person).filter(Person.id == person_id).first()
    
    if not person:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Person not found"
        )
    
    # Update dataset if provided
    if person_data.dataset_id and person_data.dataset_id != person.dataset_id:
        # Check if new dataset exists
        new_dataset = db.query(Dataset).filter(Dataset.id == person_data.dataset_id).first()
        if not new_dataset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="New dataset not found"
            )
        
        # Update dataset counts
        old_dataset = db.query(Dataset).filter(Dataset.id == person.dataset_id).first()
        if old_dataset:
            old_dataset.count -= 1
            old_dataset.updated_at = datetime.utcnow()
        
        new_dataset.count += 1
        new_dataset.updated_at = datetime.utcnow()
        
        person.dataset_id = person_data.dataset_id
    
    # Update other fields
    if person_data.name is not None:
        person.name = person_data.name
    
    if person_data.age is not None:
        person.age = person_data.age
    
    if person_data.education is not None:
        person.education = person_data.education
    
    if person_data.employee_id is not None:
        person.employee_id = person_data.employee_id
    
    if person_data.original_data is not None:
        person.original_data = json.dumps(person_data.original_data)
    
    # Update certificates if provided
    if person_data.certificates is not None:
        # Delete existing certificates
        db.query(Certificate).filter(Certificate.person_id == person_id).delete()
        
        # Create new certificates
        for cert_data in person_data.certificates:
            new_certificate = Certificate(
                person_id=person_id,
                name=cert_data.name,
                value=cert_data.value
            )
            db.add(new_certificate)
    
    db.commit()
    db.refresh(person)
    
    # Prepare response
    # Parse original_data if it's stored as JSON string
    original_data = None
    if person.original_data:
        try:
            original_data = json.loads(person.original_data)
        except json.JSONDecodeError:
            original_data = person.original_data
    
    person_response = PersonSchema(
        id=person.id,
        dataset_id=person.dataset_id,
        name=person.name,
        age=person.age,
        education=person.education,
        employee_id=person.employee_id,
        original_data=original_data,
        certificates=[
            {
                "id": cert.id,
                "name": cert.name,
                "value": cert.value
            }
            for cert in person.certificates
        ]
    )
    
    return person_response

@router.delete("/{person_id}")
def delete_person(person_id: int, db: Session = Depends(get_db)):
    """Delete a person"""
    person = db.query(Person).filter(Person.id == person_id).first()
    
    if not person:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Person not found"
        )
    
    # Update dataset count
    dataset = db.query(Dataset).filter(Dataset.id == person.dataset_id).first()
    if dataset:
        dataset.count -= 1
        dataset.updated_at = datetime.utcnow()
    
    db.delete(person)
    db.commit()
    
    return {"message": "Person deleted successfully"}

@router.delete("/batch")
def batch_delete_persons(batch_data: BatchDeleteRequest, db: Session = Depends(get_db)):
    """Batch delete persons"""
    if not batch_data.ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No IDs provided"
        )
    
    # Get persons to delete
    persons = db.query(Person).filter(Person.id.in_(batch_data.ids)).all()
    
    if not persons:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No persons found with the provided IDs"
        )
    
    # Update dataset counts
    dataset_counts = {}
    for person in persons:
        if person.dataset_id not in dataset_counts:
            dataset_counts[person.dataset_id] = 0
        dataset_counts[person.dataset_id] += 1
    
    for dataset_id, count in dataset_counts.items():
        dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
        if dataset:
            dataset.count -= count
            dataset.updated_at = datetime.utcnow()
    
    # Delete persons
    db.query(Person).filter(Person.id.in_(batch_data.ids)).delete(synchronize_session=False)
    db.commit()
    
    return {"message": f"Successfully deleted {len(persons)} persons"}