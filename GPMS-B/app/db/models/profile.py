from sqlalchemy import Column, Integer, ForeignKey, String, LargeBinary, Date, CheckConstraint, Enum as SQLAlchemyEnum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.models.user import Base
from enum import Enum

class Sex(str, Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"
    PREFER_NOT_TO_SAY = "PREFER NOT TO SAY"

class Profile(Base):
    __tablename__ = "profiles_tbl"

    profile_id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    image = Column(LargeBinary, nullable=True)
    birth_date = Column(Date, nullable=False)
    sex = Column(
        SQLAlchemyEnum(Sex, name='sex_type'),
        nullable=True
    )
    contact_no = Column(String(20), nullable=True)
    address = Column(String(255), nullable=True)

    user_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("users_tbl.user_id", ondelete="CASCADE"), 
        nullable=False,
        unique=True  # One-to-one relationship
    )

    # Relationship with users
    user = relationship(
        "User", 
        back_populates="profiles",
        single_parent=True,  # Ensures one-to-one relationship
        cascade="all, delete-orphan"
    )

    __table_args__ = (
        CheckConstraint('length(contact_no) >= 8', name='check_contact_length'),
        CheckConstraint('birth_date < CURRENT_DATE', name='check_birth_date'),
    )