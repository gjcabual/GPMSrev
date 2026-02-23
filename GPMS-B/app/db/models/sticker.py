from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.db.models.user import Base

class Sticker(Base):
    __tablename__ = "stickers_tbl"
    
    id = Column(Integer, primary_key=True, index=True)
    sticker_id = Column(String(255), nullable=False)
    batch_id = Column(Integer, ForeignKey("batch_sticker_sessions_tbl.batch_id"), nullable=False)
    plate_no = Column(String(100), ForeignKey("vehicles_tbl.plate_no"), nullable=False)  
    
    # Relationships
    batch = relationship("BatchStickerSessions", back_populates="sticker")
    vehicle = relationship("Vehicle", back_populates="stickers")
    application = relationship("Application", back_populates="sticker", uselist=False)
