from fastapi import Form, HTTPException, Body
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Set, Union
from datetime import date, datetime  # Add both imports
from enum import Enum

class StickerType(Enum):
    STUDENT = "Student"  
    EMPLOYEE = "Employee Parking"
    DROPOFF = "Drop Off"
    CONCESSIONAIRE = "Concessionaire"

STICKER_PRICES = {
    StickerType.STUDENT: 50,
    StickerType.EMPLOYEE: 50,
    StickerType.DROPOFF: 50,
    StickerType.CONCESSIONAIRE: 100
}

class BatchStickerCreate(BaseModel):
    type: StickerType
    start_at: int
    end_at: int
    price: int = 0

    def __init__(self, **data):
        super().__init__(**data)
        # Set the price based on the type
        if self.type in STICKER_PRICES:
            self.price = STICKER_PRICES[self.type]
            
    @validator('end_at')
    def validate_range(cls, v, values):
        
        if 'start_at' in values and v <= values['start_at']:
            raise ValueError(f"End number must be greater than start number ({values['start_at']})")
        return v

class BatchStickerCreateRequest(BaseModel):
    batches: List[BatchStickerCreate] = Field(..., min_items=1)
    
    @validator('batches')
    def validate_batch_ranges(cls, batches):
        # Check for duplicate sticker types
        types = [batch.type for batch in batches]
        if len(types) != len(set(types)):
            raise ValueError("Duplicate sticker types found. Each type must be unique.")
            
        # Group batches by type to check for overlaps ONLY within the same type
        type_ranges = {}
        
        for batch in batches:
            # Initialize set for this type if not exists
            if batch.type not in type_ranges:
                type_ranges[batch.type] = set()
                
            # Get the range for this batch
            batch_range = set(range(batch.start_at, batch.end_at + 1))
            
            # Check for overlap with existing ranges of the SAME type
            overlap = type_ranges[batch.type].intersection(batch_range)
            
            if overlap:
                # Format the overlapping numbers nicely
                if len(overlap) > 10:
                    overlap_str = f"{min(overlap)}-{max(overlap)}"
                else:
                    overlap_str = ", ".join(map(str, sorted(overlap)))
                    
                raise ValueError(
                    f"Range for {batch.type.value} ({batch.start_at}-{batch.end_at}) overlaps "
                    f"with another batch of the SAME type. Overlapping numbers: {overlap_str}"
                )
            
            # Add this range to the set for this type
            type_ranges[batch.type].update(batch_range)
            
        return batches

class BatchStickerResponse(BaseModel):
    batch_id: int
    type: str
    start_at: int
    end_at: int
    price: int
    created_at: datetime  

class BatchStickersCreateResponse(BaseModel):
    success: bool
    message: str
    batches: List[BatchStickerResponse]

class BatchStickerForm:
    def __init__(
        self,
        student_start_at: str = Form(None, description="Student sticker start number"),
        student_end_at: str = Form(None, description="Student sticker end number"),
        employee_start_at: str = Form(None, description="Employee sticker start number"),
        employee_end_at: str = Form(None, description="Employee sticker end number"),
        dropoff_start_at: str = Form(None, description="Drop off sticker start number"),
        dropoff_end_at: str = Form(None, description="Drop off sticker end number"),
        concessionaire_start_at: str = Form(None, description="Concessionaire sticker start number"),
        concessionaire_end_at: str = Form(None, description="Concessionaire sticker end number")
    ):
        try:
            # Convert string inputs to integers or None
            self.student_start_at = int(student_start_at) if student_start_at and student_start_at.strip() else None
            self.student_end_at = int(student_end_at) if student_end_at and student_end_at.strip() else None
            self.employee_start_at = int(employee_start_at) if employee_start_at and employee_start_at.strip() else None
            self.employee_end_at = int(employee_end_at) if employee_end_at and employee_end_at.strip() else None
            self.dropoff_start_at = int(dropoff_start_at) if dropoff_start_at and dropoff_start_at.strip() else None
            self.dropoff_end_at = int(dropoff_end_at) if dropoff_end_at and dropoff_end_at.strip() else None
            self.concessionaire_start_at = int(concessionaire_start_at) if concessionaire_start_at and concessionaire_start_at.strip() else None
            self.concessionaire_end_at = int(concessionaire_end_at) if concessionaire_end_at and concessionaire_end_at.strip() else None

            # Validate paired inputs
            if self.dropoff_start_at and not self.dropoff_end_at:
                raise HTTPException(
                    status_code=422,
                    detail={
                        "error": "Validation Error",
                        "message": "End number must be provided when start number is set",
                        "type": "STICKER_RANGE_VALIDATION",
                        "field": "dropoff_end_at"
                    }
                )
            # Add similar validations for other pairs...
        except ValueError:
            raise HTTPException(
                status_code=422,
                detail={
                    "error": "Validation Error",
                    "message": "All number fields must contain valid integers",
                    "type": "INVALID_NUMBER_FORMAT"
                }
            )
    
    def _validate_range_pair(self, sticker_type: str, start: int | None, end: int | None):
        """Validate that start and end values are provided together"""
        if (start is not None and end is None) or (start is None and end is not None):
            raise ValueError(f"For {sticker_type} stickers, both start and end numbers must be provided together")
        if start is not None and end is not None and start > end:
            raise ValueError(f"For {sticker_type} stickers, start number ({start}) cannot be greater than end number ({end})")
    
    def to_request_object(self) -> BatchStickerCreateRequest:
        """Convert form data to the standard request object"""
        batches = []
        
        # Student sticker validation
        if self.student_start_at and not self.student_end_at:
            raise HTTPException(
                status_code=422,
                detail={
                    "error": "Validation Error",
                    "message": "Student sticker end number is required",
                    "field": "student_end_at"
                }
            )
        elif self.student_end_at and not self.student_start_at:
            raise HTTPException(
                status_code=422,
                detail={
                    "error": "Validation Error",
                    "message": "Student sticker start number is required",
                    "field": "student_start_at"
                }
            )
        elif self.student_start_at and self.student_end_at:
            batches.append(BatchStickerCreate(
                type=StickerType.STUDENT,
                start_at=self.student_start_at,
                end_at=self.student_end_at,
            ))

        # Employee sticker validation
        if self.employee_start_at and not self.employee_end_at:
            raise HTTPException(
                status_code=422,
                detail={
                    "error": "Validation Error",
                    "message": "Employee sticker end number is required",
                    "field": "employee_end_at"
                }
            )
        elif self.employee_end_at and not self.employee_start_at:
            raise HTTPException(
                status_code=422,
                detail={
                    "error": "Validation Error",
                    "message": "Employee sticker start number is required",
                    "field": "employee_start_at"
                }
            )
        elif self.employee_start_at and self.employee_end_at:
            batches.append(BatchStickerCreate(
                type=StickerType.EMPLOYEE,
                start_at=self.employee_start_at,
                end_at=self.employee_end_at,
            ))

        # Drop-off sticker validation
        if self.dropoff_start_at and not self.dropoff_end_at:
            raise HTTPException(
                status_code=422,
                detail={
                    "error": "Validation Error",
                    "message": "Drop-off sticker end number is required",
                    "field": "dropoff_end_at"
                }
            )
        elif self.dropoff_end_at and not self.dropoff_start_at:
            raise HTTPException(
                status_code=422,
                detail={
                    "error": "Validation Error",
                    "message": "Drop-off sticker start number is required",
                    "field": "dropoff_start_at"
                }
            )
        elif self.dropoff_start_at and self.dropoff_end_at:
            batches.append(BatchStickerCreate(
                type=StickerType.DROPOFF,
                start_at=self.dropoff_start_at,
                end_at=self.dropoff_end_at,
            ))

        # Concessionaire sticker validation
        if self.concessionaire_start_at and not self.concessionaire_end_at:
            raise HTTPException(
                status_code=422,
                detail={
                    "error": "Validation Error",
                    "message": "Concessionaire sticker end number is required",
                    "field": "concessionaire_end_at"
                }
            )
        elif self.concessionaire_end_at and not self.concessionaire_start_at:
            raise HTTPException(
                status_code=422,
                detail={
                    "error": "Validation Error",
                    "message": "Concessionaire sticker start number is required",
                    "field": "concessionaire_start_at"
                }
            )
        elif self.concessionaire_start_at and self.concessionaire_end_at:
            batches.append(BatchStickerCreate(
                type=StickerType.CONCESSIONAIRE,
                start_at=self.concessionaire_start_at,
                end_at=self.concessionaire_end_at,
            ))

        # Check if any complete range was provided
        if not batches:
            raise HTTPException(
                status_code=422,
                detail={
                    "error": "Validation Error",
                    "message": "Please provide at least one complete sticker range",
                    "type": "EMPTY_SUBMISSION"
                }
            )
        
        return BatchStickerCreateRequest(batches=batches)

# Add these new response classes to your existing file

class StickerRange(BaseModel):
    """Schema for individual sticker type range"""
    start_at: int
    end_at: int
    price: int

class BatchStickerGroup(BaseModel):
    batch_no: int
    created_at: date  # This expects date only
    student: Optional[StickerRange] = None
    employee: Optional[StickerRange] = None
    dropoff: Optional[StickerRange] = None
    concessionaire: Optional[StickerRange] = None

    class Config:
        from_attributes = True  # For SQLAlchemy models
        exclude_none = True    # Exclude None values from response

class BatchStickersListResponse(BaseModel):
    """Schema for list of sticker batches"""
    success: bool
    total: int
    batches: List[BatchStickerGroup]