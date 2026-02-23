from datetime import date, datetime
from pydantic import BaseModel, EmailStr, Field
from enum import Enum
from uuid import UUID
from typing import List
from app.schemas.user import UserRole

class Sex(str, Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"

class StaffBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    contact_no: str = Field(min_length=8)
    birth_date: date
    sex: Sex
    address: str

class StaffCreate(StaffBase):
    role: int = UserRole.STAFF  # Default to staff role (1)

class StaffResponse(StaffBase):
    user_id: UUID
    profile_id: int
    role: int
    
    class Config:
        from_attributes = True

class StaffRegistrationResponse(BaseModel):
    message: str
    staff: StaffResponse
    
    class Config:
        from_attributes = True

class StaffListItem(BaseModel):
    position: int
    user_id: str  
    name: str
    email: EmailStr
    created_at: datetime
    updated_at: datetime | None

    class Config:
        from_attributes = True

class StaffListResponse(BaseModel):
    staffs: List[StaffListItem]
    total: int

    class Config:
        from_attributes = True