from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid

Base = declarative_base()

class User(Base):
    __tablename__ = "users_tbl"

    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    verified_at = Column(DateTime, nullable=True)  
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    role = Column(Integer, default=0, nullable=False)

    # Relationship with applications
    applications = relationship("Application", back_populates="user")
    slips = relationship("Slip", back_populates="user")
    auth_driver = relationship("AuthDriver", back_populates="user")
    tokens = relationship("Token", back_populates="user")
    documents = relationship("Document", back_populates="user")
    profiles = relationship(
        "Profile", 
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    processed_statuses = relationship("ApplicationStatus", back_populates="user")
    vehicles = relationship("Vehicle", back_populates="user")
