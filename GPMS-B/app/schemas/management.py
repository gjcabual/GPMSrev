from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime

class DocumentDetail(BaseModel):
    document_id: int
    type: str
    image_url: str  # Changed from 'image' to 'image_url'

    class Config:
        from_attributes = True

class StickerResponse(BaseModel):
    sticker_id: str

class VehicleResponse(BaseModel):
    plate_no: str
    brand: str
    model: str
    vehicle_type: str
    front_image: Optional[bytes] = None
    back_image: Optional[bytes] = None
    sticker: Optional[StickerResponse] = None

class ApplicantResponse(BaseModel):
    name: str
    role: str
    sex: str
    age: int
    profile_img: Optional[str] = None 
    vehicle: VehicleResponse

class ApprovedApplicationResponse(BaseModel):
    application_id: int
    approved_by: Optional[str] = None
    date: date
    applicant: ApplicantResponse

class ApprovedApplicationsListResponse(BaseModel):
    approved_applications: List[ApprovedApplicationResponse]

class ApplicantApplicationHistory(BaseModel):
    """Schema for individual application history record"""
    application_id: int
    applicant_name: str
    plate_number: str = Field(..., description="Vehicle plate number")
    model: str = Field(..., description="Vehicle model")
    brand: str = Field(..., description="Vehicle brand")
    color: str = Field(..., description="Vehicle color")
    vehicle_type: str = Field(..., description="Vehicle type (Car, Motorcycle, etc.)")
    sticker_number: Optional[str] = Field(None, description="Assigned sticker number if approved")
    date_submitted: str = Field(..., description="Application submission date in YYYY-MM-DD format")
    status: str = Field(..., description="Latest application status")
    is_rejected: bool = Field(..., description="True if application was rejected")
    remarks: Optional[str] = Field(None, description="Latest status remarks")
    rejection_remarks: Optional[str] = Field(None, description="Rejection remarks if rejected")
    front_image: Optional[str] = Field(None, description="URL to vehicle front image")
    back_image: Optional[str] = Field(None, description="URL to vehicle back image")
    documents: List[DocumentDetail] = Field(default=[], description="List of application documents")
    slip: Optional[dict] = Field(None, description="Uploaded payment slip details")

    class Config:
        schema_extra = {
            "example": {
                "application_id": 1,
                "applicant_name": "John Doe",
                "plate_number": "ABC123",
                "model": "Civic",
                "brand": "Honda",
                "color": "Black",
                "vehicle_type": "Car",
                "sticker_number": "STK001",
                "date_submitted": "2024-03-29T10:00:00",
                "status": "Approved",
                "is_rejected": False,
                "front_image": "http://example.com/front.jpg",
                "back_image": "http://example.com/back.jpg",
                "slip": {
                    "slip_id": 1,
                    "image": "/api/v1/staff/slip/1/image",
                    "amount": 50,
                    "official_receipt": "1234-123456789012",
                    "date": "2026-03-04"
                },
                "documents": [
                    {
                        "document_id": 1,
                        "type": "OR/CR",
                        "image_url": "/api/v1/staff/document/1/image"
                    }
                ]
            }
        }

class ApplicantApplicationHistoryResponse(BaseModel):
    """Response schema containing list of application history records"""
    applications: List[ApplicantApplicationHistory]

class SlipDetail(BaseModel):
    slip_id: int
    image: str | None
    amount: int
    nature_of_payment: str

    class Config:
        from_attributes = True

class ApprovedApplication(BaseModel):
    application_id: int
    approved_by: str | None
    date: datetime
    applicant: dict
    documents: List[DocumentDetail]
    slip: Optional[SlipDetail]

    class Config:
        from_attributes = True

class ApprovedApplicationsListResponse(BaseModel):
    approved_applications: List[ApprovedApplication]

class ApprovedDocumentDetail(BaseModel):
    document_id: int
    type: str
    image: str  # Keep as 'image' for approved applications

    class Config:
        from_attributes = True

class ApprovedSlipDetail(BaseModel):
    slip_id: int
    image: str | None
    amount: int
    official_receipt: str | None = None
    nature_of_payment: str

    class Config:
        from_attributes = True

class ApprovedSticker(BaseModel):
    sticker_id: str

class ApprovedVehicle(BaseModel):
    plate_no: str
    brand: str
    model: str
    vehicle_type: str
    front_image: Optional[str] = None
    back_image: Optional[str] = None
    sticker: Optional[ApprovedSticker] = None

class ApprovedApplicant(BaseModel):
    name: str
    role: str
    sex: str
    age: int
    profile_img: Optional[str] = None
    vehicle: ApprovedVehicle

class ApprovedApplicationDetail(BaseModel):
    application_id: int
    approved_by: str | None
    date: date  
    applicant: ApprovedApplicant
    documents: List[ApprovedDocumentDetail]
    slip: Optional[ApprovedSlipDetail]
    has_uploaded_receipt: bool = False

    class Config:
        from_attributes = True

class ApprovedApplicationsResponse(BaseModel):
    approved_applications: List[ApprovedApplicationDetail]
