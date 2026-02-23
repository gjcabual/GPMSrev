# app\db\models\token.py
from sqlalchemy import Column, Integer, ForeignKey, String, DateTime  # Changed from Date to DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.models.user import Base

class Token(Base):
    __tablename__ = "tokens_tbl"

    token_id = Column(Integer, primary_key=True, index=True)
    token = Column(String(255), nullable=False)
    refresh_token = Column(String(255), nullable=False)
    created_at = Column(DateTime, nullable=False)  
    expired_at = Column(DateTime, nullable=False)  
    token_type = Column(String(50), default="access", nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users_tbl.user_id"), nullable=False)

    user = relationship("User", back_populates="tokens")