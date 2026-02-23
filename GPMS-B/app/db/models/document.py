from sqlalchemy import Column, Integer, ForeignKey, Date, LargeBinary, String
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.models.user import Base

class Document(Base):
    __tablename__ = "documents_tbl"

    document_id = Column(Integer, primary_key=True, index=True)
    type = Column(String(255), nullable=False)
    image = Column(LargeBinary, nullable=True)
    registered_date = Column(Date, nullable=False)
    expired_at = Column(Date, nullable=False)

    plate_no = Column(String(255), ForeignKey("vehicles_tbl.plate_no"), nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users_tbl.user_id"), nullable=False)
    application_id = Column(Integer, ForeignKey("applications_tbl.application_id"), nullable=True)

    # Relationship with vehicles
    vehicle = relationship("Vehicle", back_populates="documents")
    user = relationship("User", back_populates="documents")
    application = relationship("Application", back_populates="documents")
    auth_driver = relationship("AuthDriver", back_populates="document")
