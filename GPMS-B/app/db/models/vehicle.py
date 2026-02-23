from sqlalchemy import Column, String, LargeBinary, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.models.user import Base

class Vehicle(Base):
    __tablename__ = "vehicles_tbl"

    plate_no = Column(String(100), primary_key=True, index=True)
    brand = Column(String(255), nullable=False)
    model = Column(String(255), nullable=False)
    vehicle_type = Column(String(255), nullable=False)
    front_image = Column(LargeBinary, nullable=True)
    back_image = Column(LargeBinary, nullable=True)
    color = Column(String(255), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users_tbl.user_id"), nullable=False)

    # Relationship with documents
    documents = relationship("Document", back_populates="vehicle")
    applications = relationship("Application", back_populates="vehicle")
    stickers = relationship("Sticker", back_populates="vehicle")
    user = relationship("User", back_populates="vehicles")