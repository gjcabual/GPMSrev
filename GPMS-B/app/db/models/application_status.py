from sqlalchemy import Column, Integer, ForeignKey, String, Date
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.models.user import Base

class ApplicationStatus(Base):
    __tablename__ = "application_status_tbl"

    status_id = Column(Integer, primary_key=True, index=True)
    status = Column(String(255), nullable=False)
    remarks = Column(String(500), nullable=True)
    date = Column(Date, nullable=False)
    application_id = Column(Integer, ForeignKey("applications_tbl.application_id"), nullable=False)
    processed_by = Column(UUID(as_uuid=True), ForeignKey("users_tbl.user_id"), nullable=True)

    # Relationships
    application = relationship("Application", back_populates="application_status")
    user = relationship("User", back_populates="processed_statuses")  
