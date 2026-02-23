from sqlalchemy import Column, Integer, ForeignKey, Date
from sqlalchemy.orm import relationship
from app.db.models.user import Base

class AssignedDriver(Base):
    __tablename__ = "assigned_drivers_tbl"

    assign_driver_id = Column(Integer, primary_key=True, index=True)
    assigned_at = Column(Date, nullable=False)
    auth_driver_id = Column(Integer, ForeignKey("auth_driver_tbl.auth_driver_id"), nullable=False)
    application_id = Column(Integer, ForeignKey("applications_tbl.application_id"), nullable=False)

    # Relationships
    auth_driver = relationship("AuthDriver", back_populates="assigned_drivers")
    application = relationship("Application", back_populates="assigned_drivers")