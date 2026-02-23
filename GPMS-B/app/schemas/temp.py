from pydantic import BaseModel, Field
from typing import Optional
import base64

class VehicleCreate(BaseModel):
    plate_no: str = Field(..., min_length=5, max_length=100)
    brand: str = Field(...)
    model: str = Field(...)
    vehicle_type: str = Field(...)
    color: str = Field(...)

    class Config:
        from_attributes = True

class VehicleResponse(BaseModel):
    plate_no: str
    brand: str
    model: str
    vehicle_type: str
    color: str
    front_image: bool
    back_image: bool

    class Config:
        from_attributes = True

    @classmethod
    def from_orm(cls, obj):
        # Create a dict with transformed data
        return cls(
            plate_no=obj.plate_no,
            brand=obj.brand,
            model=obj.model,
            vehicle_type=obj.vehicle_type,
            color=obj.color,
            front_image=bool(obj.front_image),
            back_image=bool(obj.back_image)
        )