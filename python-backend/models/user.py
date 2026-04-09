from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, nullable=False, default="member")
    enabled = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_password_change = Column(DateTime(timezone=True), nullable=True)

    # Relationship
    permission = relationship("Permission", back_populates="user", uselist=False, cascade="all, delete-orphan")

class Permission(Base):
    __tablename__ = "permissions"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    file_upload = Column(Boolean, nullable=False, default=True)
    search = Column(Boolean, nullable=False, default=True)
    download = Column(Boolean, nullable=False, default=True)
    admin_panel = Column(Boolean, nullable=False, default=False)
    data_delete = Column(Boolean, nullable=False, default=False)

    # Relationship
    user = relationship("User", back_populates="permission")