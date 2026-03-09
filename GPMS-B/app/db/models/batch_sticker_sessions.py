from sqlalchemy import Column, Integer, String, DateTime  # Change import from Date to DateTime
from sqlalchemy.orm import relationship
from app.db.models.user import Base

class BatchStickerSessions(Base):
    __tablename__ = "batch_sticker_sessions_tbl"

    batch_id = Column(Integer, primary_key=True, index=True)
    type = Column(String(100), nullable=False)
    batch_name = Column(String(100), nullable=True)
    start_at = Column(Integer, nullable=False)
    end_at = Column(Integer, nullable=False)
    price = Column(Integer, nullable=False)
    created_at = Column(DateTime, nullable=False)  

    # This name stays the same since Sticker model now matches it
    sticker = relationship("Sticker", back_populates="batch")
