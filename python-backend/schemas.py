from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime

# User schemas
class UserBase(BaseModel):
    username: str
    role: str = "member"
    enabled: bool = True

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    enabled: Optional[bool] = None

class PermissionBase(BaseModel):
    file_upload: bool = True
    search: bool = True
    download: bool = True
    admin_panel: bool = False
    data_delete: bool = False

class PermissionUpdate(PermissionBase):
    pass

class User(UserBase):
    id: str
    created_at: datetime
    last_password_change: Optional[datetime] = None
    permissions: Optional[PermissionBase] = None

    model_config = ConfigDict(from_attributes=True)

# Dataset schemas
class DatasetBase(BaseModel):
    name: str
    count: int = 0

class DatasetCreate(DatasetBase):
    pass

class DatasetUpdate(BaseModel):
    name: Optional[str] = None
    count: Optional[int] = None

class Dataset(DatasetBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# Certificate schemas
class CertificateBase(BaseModel):
    name: str
    value: Optional[str] = None

class CertificateCreate(CertificateBase):
    pass

class Certificate(CertificateBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

# Person schemas
class PersonBase(BaseModel):
    name: str
    age: Optional[int] = None
    education: Optional[str] = None
    employee_id: Optional[str] = None
    original_data: Optional[dict] = None

class PersonCreate(PersonBase):
    dataset_id: str
    certificates: List[CertificateCreate] = []

class PersonUpdate(PersonBase):
    dataset_id: Optional[str] = None
    certificates: Optional[List[CertificateCreate]] = None

class Person(PersonBase):
    id: int
    dataset_id: str
    certificates: List[Certificate] = []

    model_config = ConfigDict(from_attributes=True)

# Authentication schemas
class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    token: str
    user: User

class RegisterRequest(UserCreate):
    pass

class BatchPersonCreate(BaseModel):
    dataset_id: str
    persons: List[PersonCreate]

class BatchDeleteRequest(BaseModel):
    ids: List[int]