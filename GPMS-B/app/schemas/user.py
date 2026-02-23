from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime, date
from enum import IntEnum
from typing import Optional

class UserRole(IntEnum):
    ADMIN = 0
    STAFF = 1
    APPLICANT = 2

class UserBase(BaseModel):
    email: EmailStr
    role: int  
class UserCreate(UserBase):
    password: str

class UserInDB(UserBase):
    user_id: UUID
    verified_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True

class UserOut(UserBase):
    user_id: UUID
    verified_at: Optional[datetime] = None  # Make verified_at optional
    created_at: datetime

    class Config:
        from_attributes = True

# New models for applicant registration and verification
class UserAppCreate(BaseModel):
    """Schema for applicant registration"""
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    birth_date: date
    sex: Optional[str] = None
    contact_no: str
    address: Optional[str] = None  # Made optional
    role: int = UserRole.APPLICANT

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "email": "applicant@example.com",
                "password": "strongpassword123",
                "first_name": "John",
                "last_name": "Doe",
                "birth_date": "1990-01-01",
                "sex": "MALE",
                "contact_no": "09123456789",
                "address": "123 Main St"
            }
        }

class UserVerify(BaseModel):
    """Schema for email verification"""
    email: EmailStr
    otp: str

    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "otp": "123456"
            }
        }

class VerificationResponse(BaseModel):
    """Schema for verification response"""
    message: str
    status: bool
    access_token: Optional[str] = None
    token_type: Optional[str] = None
    full_name: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "message": "Email verified successfully",
                "status": True,
                "access_token": "eyJ0eXAiOiJKV1QiLC...",
                "token_type": "bearer",
                "full_name": "John Doe"
            }
        }

class ResendVerificationRequest(BaseModel):
    """Schema for resending verification email"""
    email: EmailStr

    class Config:
        json_schema_extra = {
            "example": {
                "email": "applicant@example.com"
            }
        }

class RegistrationResponse(BaseModel):
    """Schema for registration response"""
    message: str
    status: bool
    email: str

    class Config:
        json_schema_extra = {
            "example": {
                "message": "Registration successful. Please check your email for the verification code.",
                "status": True,
                "email": "user@example.com"
            }
        }

class ResendVerificationResponse(BaseModel):
    """Schema for resend verification response"""
    message: str
    status: bool

    class Config:
        json_schema_extra = {
            "example": {
                "message": "A new verification code has been sent to your email",
                "status": True
            }
        }