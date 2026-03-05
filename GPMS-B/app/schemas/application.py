from pydantic import BaseModel, Field, validator
from enum import Enum
from datetime import date, datetime
from uuid import UUID
from fastapi import Form
from typing import List, Optional
import re

class StatusEnum(str, Enum):
    APPROVED = "Approved"
    REJECTED = "Rejected"

# BaseModel for request body
class ApplicationStatusUpdate(BaseModel):
    status: StatusEnum
    application_id: int

# Response model for application status
class ApplicationStatusResponse(BaseModel):
    status_id: int
    status: str
    date: date
    application_id: int
    processed_by: UUID | None

    class Config:
        from_attributes = True

# Success response model
class StatusUpdateResponse(BaseModel):
    message: str
    status: str

# Form model for request handling
async def form_body(
    status: StatusEnum = Form(...),
    application_id: int = Form(...)
) -> ApplicationStatusUpdate:
    return ApplicationStatusUpdate(
        status=status,
        application_id=application_id
    )

class OwnerDetail(BaseModel):
    user_id: str  
    fullname: str
    email: str
    contact_no: str | None = None
    date_of_birth: date | None = None
    profile_img: str | None = None
    gender: str | None = None
    address: str | None = None

class DocumentDetail(BaseModel):
    document_id: int
    type: str
    image: str | None
    registered_at: date | None = None  
    expire_at: date | None = None      

    class Config:
        from_attributes = True

class AssignedDriverDetail(BaseModel):
    fullname: str
    birth_date: date
    relationship: str
    profile_img: str | None 
    document: DocumentDetail | None   

class VehicleDetail(BaseModel):
    brand: str
    model: str
    plate_number: str
    sticker_id: str | None
    color: str
    type: str
    front_img: bytes | None
    back_img: bytes | None
    assigned_drivers: list[AssignedDriverDetail]
    documents: list[DocumentDetail]

class ApplicationDetail(BaseModel):
    application_id: int
    application_role: str
    application_type: str
    applied_date: date
    expiration_date: date
    plate_number: str
    owner: OwnerDetail
    vehicle: VehicleDetail

    class Config:
        from_attributes = True

class PendingDocumentDetail(BaseModel):
    document_id: int
    type: str
    image: str | None

    class Config:
        from_attributes = True

class PendingApplicationItem(BaseModel):
    application_id: int
    full_name: str
    sex: str
    age: int
    profile_img: Optional[str] = None
    sticker_id: Optional[str] = None
    plate_number: str
    model: str
    brand: str
    color: str
    front_img: Optional[str] = None
    back_img: Optional[str] = None
    applied_date: str  # Change from datetime to str
    application_role: str
    vehicle_type: str
    assigned_drivers: list
    slip_id: Optional[int] = None
    slip_image: Optional[str] = None
    slip_amount: Optional[float] = None
    slip_official_receipt: Optional[str] = None
    slip_date: Optional[str] = None  # Change from datetime to str
    nature_of_payment: Optional[str] = None
    has_uploaded_receipt: bool = False
    documents: list

class PendingApplicationsListResponse(BaseModel):
    pending_applications: List[PendingApplicationItem]



# Applicant application pydantics 

class DocumentCreate(BaseModel):
    type: str  # Will now accept "Official Receipt", "Certificate of Registration", "Driver's License"
    image: bytes
    registered_date: date
    expired_at: date

    @validator('type')
    def validate_document_type(cls, v):
        valid_types = {
            "Official Receipt",
            "Certificate of Registration", 
            "Driver's License"
        }
        if v not in valid_types:
            raise ValueError(f"Document type must be one of: {', '.join(valid_types)}")
        return v

class AuthDriverCreate(BaseModel):
    first_name: str
    last_name: str
    birth_date: date
    relationship_status: str
    profile_image: bytes  # Changed from str to bytes
    documents: List[DocumentCreate] = Field(..., max_items=1)

class PaymentCreate(BaseModel):
    total_amount: int = Field(..., gt=0)
    nature_of_payment: str
    date: date
    official_receipt: Optional[str] = None  

class VehicleCreate(BaseModel):
    plate_no: str = Field(..., min_length=6, max_length=8)
    brand: str
    model: str
    vehicle_type: str
    color: str
    front_image: str
    back_image: str
    documents: List[DocumentCreate] = Field(..., max_items=3)

    @validator('plate_no')
    def validate_plate_no(cls, v):
        pattern = r'^[A-Z0-9]{6,8}$'
        if not re.match(pattern, v):
            raise ValueError('Invalid plate number format')
        return v

class ApplicationCreate(BaseModel):
    role: str
    building_name: str
    app_type: str
    plate_no: str
    documents: List[DocumentCreate]
    authorized_drivers: Optional[List[int]] = []  # Make it optional with default empty list

    class Config:
        json_schema_extra = {
            "example": {
                "role": "STUDENT",
                "building_name": "College of Computer Studies",
                "app_type": "NEW",
                "plate_no": "ABC123",
                "documents": [],
                "authorized_drivers": []
            }
        }


class ApplicationListResponse(BaseModel):
    application_id: int  # Add this line
    plate: str
    model: str
    brand: str
    application_role: str
    vehicle_type: str
    status: str
    has_uploaded_receipt: bool = False
    front_image: Optional[str] = None
    back_image: Optional[str] = None

    class Config:
        from_attributes = True

class VehicleResponse(BaseModel):
    plate_no: str
    brand: str
    model: str
    vehicle_type: str
    color: str
    front_image: Optional[str] = None  
    back_image: Optional[str] = None   

    class Config:
        from_attributes = True

class DriverDocumentResponse(BaseModel):
    type: str
    registered_date: date
    expired_at: date
    image: Optional[str] = None


class DocumentResponse(BaseModel):
    type: str
    registered_date: date
    expired_at: date
    image: Optional[str] = None

    class Config:
        from_attributes = True

class AuthorizedDriverResponse(BaseModel):
    auth_driver_id: int
    first_name: str
    last_name: str
    birth_date: date
    relationship_status: str
    profile_image: Optional[str] = None
    application_id: Optional[int] = None  
    document: Optional[DocumentResponse]
    is_valid: bool

    class Config:
        from_attributes = True

class VehicleInformation(BaseModel):
    plate_number: str
    model: str
    brand: str
    vehicle_type: str

class ApplicantInformation(BaseModel):
    first_name: str
    last_name: str
    birth_date: date
    email_address: str
    phone_number: str
    sex: str
    address: str

class ApplicationUpdate(BaseModel):
    application_role: str = Field(..., description="Role of the applicant")
    building_name: str = Field(..., description="Name of the building")
    vehicle_information: VehicleInformation
    applicant: ApplicantInformation

    class Config:
        json_schema_extra = {
            "example": {
                "application_role": "Student",
                "building_name": "Main Building",
                "vehicle_information": {
                    "plate_number": "XYZ789",
                    "model": "Civic",
                    "brand": "Honda",
                    "vehicle_type": "Sedan"
                },
                "applicant": {
                    "first_name": "Frank",
                    "last_name": "Wilson",
                    "birth_date": "1996-04-18",
                    "email_address": "example@email.com",
                    "phone_number": "09198765438",
                    "sex": "MALE",
                    "address": "606 Research Ave, City"
                }
            }
        }

class SlipDetail(BaseModel):
    slip_id: int
    total_amount: int
    nature_of_payment: str
    date: date
    image: Optional[str] = None
    official_receipt: Optional[str] = None  

    class Config:
        from_attributes = True

class SubmitApplicationsRequest(BaseModel):
    application_ids: List[int]
    official_receipt: str
    
    @validator('official_receipt')
    def validate_receipt_format(cls, v):
        if not re.match(r'^\d{4}-\d{12}$', v):
            raise ValueError('Invalid receipt number format. Must be XXXX-XXXXXXXXXXXX with digits only')
        return v
