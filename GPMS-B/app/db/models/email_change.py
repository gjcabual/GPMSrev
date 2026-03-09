from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.models.user import Base


class EmailChangeRequest(Base):
    __tablename__ = "email_change_requests_tbl"

    request_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users_tbl.user_id"), nullable=False, index=True)
    old_email = Column(String(100), nullable=False)
    new_email = Column(String(100), nullable=False, index=True)
    otp_code = Column(String(10), nullable=False)
    status = Column(String(30), nullable=False, default="pending")
    attempt_count = Column(Integer, nullable=False, default=0)
    resend_count = Column(Integer, nullable=False, default=0)
    requested_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    last_sent_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    verified_at = Column(DateTime, nullable=True)

    user = relationship("User")


class EmailChangeAuditLog(Base):
    __tablename__ = "email_change_audit_logs_tbl"

    audit_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users_tbl.user_id"), nullable=False, index=True)
    old_email = Column(String(100), nullable=False)
    new_email = Column(String(100), nullable=True)
    action = Column(String(50), nullable=False)
    status = Column(String(30), nullable=False)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    user = relationship("User")
