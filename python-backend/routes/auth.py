from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User, Permission
from schemas import LoginRequest, LoginResponse, RegisterRequest, User as UserSchema
from auth import verify_password, get_password_hash, create_access_token
import json

router = APIRouter()

@router.post("/login", response_model=LoginResponse)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """Login endpoint"""
    # Find user by username
    user = db.query(User).filter(User.username == login_data.username).first()
    
    if not user or not verify_password(login_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.enabled:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is disabled",
        )
    
    # Get user permissions
    permissions = user.permission
    
    # Create access token
    access_token = create_access_token(
        data={"sub": user.username, "id": user.id, "role": user.role}
    )
    
    # Prepare user response
    user_response = UserSchema(
        id=user.id,
        username=user.username,
        role=user.role,
        enabled=user.enabled,
        created_at=user.created_at,
        last_password_change=user.last_password_change,
        permissions={
            "file_upload": permissions.file_upload,
            "search": permissions.search,
            "download": permissions.download,
            "admin_panel": permissions.admin_panel,
            "data_delete": permissions.data_delete
        } if permissions else None
    )
    
    return LoginResponse(token=access_token, user=user_response)

@router.post("/register", response_model=UserSchema)
def register(register_data: RegisterRequest, db: Session = Depends(get_db)):
    """Register endpoint"""
    # Check if username already exists
    existing_user = db.query(User).filter(User.username == register_data.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
    
    # Create new user
    import time
    user_id = str(int(time.time() * 1000))
    
    hashed_password = get_password_hash(register_data.password)
    
    new_user = User(
        id=user_id,
        username=register_data.username,
        password=hashed_password,
        role=register_data.role,
        enabled=register_data.enabled
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
        admin_panel=(register_data.role == "admin"),
        data_delete=(register_data.role == "admin")
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