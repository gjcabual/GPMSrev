from sqlalchemy import Column, ForeignKey, String, LargeBinary, Integer, Date
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.models.user import Base

class AuthDriver(Base):
    __tablename__ = "auth_driver_tbl"

    auth_driver_id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(255), nullable=False)
    last_name = Column(String(255), nullable=False)
    birth_date = Column(Date, nullable=False)
    relationship_status = Column(String(255), nullable=False)
    profile_image = Column(LargeBinary, nullable=True)

    user_id = Column(UUID(as_uuid=True), ForeignKey("users_tbl.user_id"), nullable=False)
    document_id = Column(Integer, ForeignKey("documents_tbl.document_id"), nullable=False)

    user = relationship("User", back_populates="auth_driver")
    document = relationship("Document", back_populates="auth_driver")
    assigned_drivers = relationship("AssignedDriver", back_populates="auth_driver")

