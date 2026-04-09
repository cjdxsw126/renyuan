from sqlalchemy import Column, String, Integer, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base

class Person(Base):
    __tablename__ = "persons"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    dataset_id = Column(String, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    age = Column(Integer, nullable=True)
    education = Column(String, nullable=True)
    employee_id = Column(String, nullable=True)
    original_data = Column(Text, nullable=True)  # Store JSON as text

    # Relationships
    dataset = relationship("Dataset", back_populates="persons")
    certificates = relationship("Certificate", back_populates="person", cascade="all, delete-orphan")

class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    person_id = Column(Integer, ForeignKey("persons.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    value = Column(String, nullable=True)

    # Relationship
    person = relationship("Person", back_populates="certificates")