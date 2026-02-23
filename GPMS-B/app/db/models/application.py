from sqlalchemy import Column, Integer, ForeignKey, String, Date
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.models.user import Base

class Application(Base):
    __tablename__ = "applications_tbl"

    application_id = Column(Integer, primary_key=True, index=True)
    role = Column(String(255), nullable=False)
    building_name = Column(String(255), nullable=False)
    app_type = Column(String(255), nullable=False)
    date = Column(Date, nullable=False)
    expired_at = Column(Date, nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users_tbl.user_id"), nullable=False)
    plate_no = Column(String(255), ForeignKey("vehicles_tbl.plate_no"), nullable=False)
    sticker_id = Column(Integer, ForeignKey("stickers_tbl.id"), nullable=True, unique=True)
    slip_id = Column(Integer, ForeignKey("slips_tbl.slip_id"), nullable=True)

    # Relationships
    user = relationship(
        "User", 
        back_populates="applications"
    )
    
    vehicle = relationship(
        "Vehicle", 
        back_populates="applications"
    )
    
    application_status = relationship(
        "ApplicationStatus", 
        back_populates="application", 
        cascade="all, delete-orphan"  
    )
    
    slip = relationship(
        "Slip", 
        back_populates="applications"  
    )
    
    assigned_drivers = relationship(
        "AssignedDriver", 
        back_populates="application", 
        cascade="all, delete-orphan"  
    )
    
    sticker = relationship(
        "Sticker", 
        back_populates="application", 
        uselist=False,
        single_parent=True  
    )
    
    # New relationship for documents
    documents = relationship(
        "Document",
        back_populates="application",
        cascade="all, delete-orphan"
    )