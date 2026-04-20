from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User, Permission
from schemas import User as UserSchema, UserCreate, UserUpdate, PermissionUpdate
from auth import get_password_hash
import time

router = APIRouter()

@router.get("", response_model=list[UserSchema])
def get_users(db: Session = Depends(get_db)):
    """Get all users"""
    users = db.query(User).all()
    
    # Prepare response with permissions
    user_responses = []
    for user in users:
        user_response = UserSchema(
            id=user.id,
            username=user.username,
            role=user.role,
            enabled=user.enabled,
            created_at=user.created_at,
            last_password_change=user.last_password_change,
            permissions={
                "file_upload": user.permission.file_upload,
                "search": user.permission.search,
                "download": user.permission.download,
                "admin_panel": user.permission.admin_panel,
                "data_delete": user.permission.data_delete
            } if user.permission else None
        )
        user_responses.append(user_response)
    
    return user_responses

@router.get("/{user_id}", response_model=UserSchema)
def get_user(user_id: str, db: Session = Depends(get_db)):
    """Get a user by ID"""
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user_response = UserSchema(
        id=user.id,
        username=user.username,
        role=user.role,
        enabled=user.enabled,
        created_at=user.created_at,
        last_password_change=user.last_password_change,
        permissions={
            "file_upload": user.permission.file_upload,
            "search": user.permission.search,
            "download": user.permission.download,
            "admin_panel": user.permission.admin_panel,
            "data_delete": user.permission.data_delete
        } if user.permission else None
    )
    
    return user_response

@router.post("", response_model=UserSchema)
def create_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """Create a new user"""
    # Check if username already exists
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
    
    # Create new user
    user_id = str(int(time.time() * 1000))
    hashed_password = get_password_hash(user_data.password)
    
    new_user = User(
        id=user_id,
        username=user_data.username,
        password=hashed_password,
        role=user_data.role,
        enabled=user_data.enabled
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create permissions for the new user
    permission_id = str(int(time.time() * 1000) + 1)
    new_permission = Permission(
        id=permission_id,
        user_id=user_id,
        file_upload=True,
        search=True,
        download=True,
        admin_panel=(user_data.role == "admin"),
        data_delete=(user_data.role == "admin")
    )
    
    db.add(new_permission)
    db.commit()
    db.refresh(new_permission)
    
    # Prepare response
    user_response = UserSchema(
        id=new_user.id,
        username=new_user.username,
        role=new_user.role,
        enabled=new_user.enabled,
        created_at=new_user.created_at,
        last_password_change=new_user.last_password_change,
        permissions={
            "file_upload": new_permission.file_upload,
            "search": new_permission.search,
            "download": new_permission.download,
            "admin_panel": new_permission.admin_panel,
            "data_delete": new_permission.data_delete
        }
    )
    
    return user_response

@router.put("/{user_id}", response_model=UserSchema)
def update_user(user_id: str, user_data: UserUpdate, db: Session = Depends(get_db)):
    """Update a user"""
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if username is being changed and if it's already taken
    if user_data.username and user_data.username != user.username:
        existing_user = db.query(User).filter(User.username == user_data.username).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists"
            )
        user.username = user_data.username
    
    # Update password if provided
    if user_data.password:
        user.password = get_password_hash(user_data.password)
        user.last_password_change = datetime.now(UTC)
    
    # Update other fields
    if user_data.role is not None:
        user.role = user_data.role
        # Update permissions if role changes
        if user.permission:
            user.permission.admin_panel = (user_data.role == "admin")
            user.permission.data_delete = (user_data.role == "admin")
    
    if user_data.enabled is not None:
        user.enabled = user_data.enabled
    
    db.commit()
    db.refresh(user)
    
    # Prepare response
    user_response = UserSchema(
        id=user.id,
        username=user.username,
        role=user.role,
        enabled=user.enabled,
        created_at=user.created_at,
        last_password_change=user.last_password_change,
        permissions={
            "file_upload": user.permission.file_upload,
            "search": user.permission.search,
            "download": user.permission.download,
            "admin_panel": user.permission.admin_panel,
            "data_delete": user.permission.data_delete
        } if user.permission else None
    )
    
    return user_response

@router.put("/{user_id}/permissions")
def update_user_permissions(user_id: str, permission_data: PermissionUpdate, db: Session = Depends(get_db)):
    """Update user permissions"""
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if not user.permission:
        # Create permissions if they don't exist
        permission_id = str(int(time.time() * 1000))
        new_permission = Permission(
            id=permission_id,
            user_id=user_id,
            file_upload=permission_data.file_upload,
            search=permission_data.search,
            download=permission_data.download,
            admin_panel=permission_data.admin_panel,
            data_delete=permission_data.data_delete
        )
        db.add(new_permission)
    else:
        # Update existing permissions
        user.permission.file_upload = permission_data.file_upload
        user.permission.search = permission_data.search
        user.permission.download = permission_data.download
        user.permission.admin_panel = permission_data.admin_panel
        user.permission.data_delete = permission_data.data_delete
    
    db.commit()
    
    # Prepare response
    if user.permission:
        return {
            "id": user.permission.id,
            "user_id": user.permission.user_id,
            "file_upload": user.permission.file_upload,
            "search": user.permission.search,
            "download": user.permission.download,
            "admin_panel": user.permission.admin_panel,
            "data_delete": user.permission.data_delete
        }
    else:
        # Return the newly created permission
        db.refresh(new_permission)
        return {
            "id": new_permission.id,
            "user_id": new_permission.user_id,
            "file_upload": new_permission.file_upload,
            "search": new_permission.search,
            "download": new_permission.download,
            "admin_panel": new_permission.admin_panel,
            "data_delete": new_permission.data_delete
        }

@router.delete("/{user_id}")
def delete_user(user_id: str, db: Session = Depends(get_db)):
    """Delete a user"""
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    db.delete(user)
    db.commit()
    
    return {"message": "User deleted successfully"}