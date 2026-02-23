from sqlalchemy import Column, Integer, ForeignKey, String, Date, LargeBinary  # Add LargeBinary import
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.models.user import Base

class Slip(Base):
    __tablename__ = "slips_tbl"

    slip_id = Column(Integer, primary_key=True, index=True)
    total_amount = Column(Integer, nullable=False)
    nature_of_payment = Column(String(255), nullable=False)
    date = Column(Date, nullable=False)
    image = Column(LargeBinary, nullable=True)  
    official_receipt = Column(String(255), nullable=True)  
    user_id = Column(UUID(as_uuid=True), ForeignKey("users_tbl.user_id"), nullable=False)

    # Relationships
    applications = relationship("Application", back_populates="slip")
    user = relationship("User", back_populates="slips")