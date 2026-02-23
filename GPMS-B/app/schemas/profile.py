from pydantic import BaseModel
from uuid import UUID
from datetime import date
from typing import Optional
from app.utils.image import get_profile_image_url

class ProfileBase(BaseModel):
    first_name: str
    last_name: str
    birth_date: date
    sex: str
    address: str
    contact_no: Optional[str] = None

class ProfileCreate(ProfileBase):
    user_id: UUID

class ProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    birth_date: Optional[date] = None
    sex: Optional[str] = None
    contact_no: Optional[str] = None
    address: Optional[str] = None

class ProfileOut(BaseModel):
    profile_id: int
    user_id: UUID
    first_name: str
    last_name: str
    birth_date: date
    sex: str
    contact_no: Optional[str] = None
    address: str
    has_image: bool = False
    image_url: Optional[str] = None
    email: Optional[str] = None
    
    class Config:
        from_attributes = True  
        orm_mode = True
        
    @classmethod
    def from_orm_with_image(cls, db_obj):
        """Create Pydantic model from ORM object with image URL"""
        obj = cls.from_orm(db_obj)
        
        # Check if profile has image
        obj.has_image = db_obj.image is not None
        
        # Set image URL using profile_id (not user_id)
        if obj.has_image:
            obj.image_url = f"/profile/image/{obj.profile_id}"
            
        return obj

class SuccessResponse(BaseModel):
    message: str

class ProfileUpdateResponse(SuccessResponse):
    profile: ProfileOut