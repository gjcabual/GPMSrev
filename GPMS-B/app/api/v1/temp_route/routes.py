from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.temp import VehicleResponse, VehicleCreate
from .views import VehicleView
from app.core.security import get_current_staff_or_admin
from typing import Optional

router = APIRouter(
    prefix="/vehicles",
    tags=["Vehicles"]
)

@router.post("/", response_model=VehicleResponse)
async def create_vehicle(
    plate_no: str = Form(...),
    brand: str = Form(...),
    model: str = Form(...),
    vehicle_type: str = Form(...),
    color: str = Form(...),
    front_image: Optional[UploadFile] = File(None),
    back_image: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
):
    """Create a new vehicle with optional images"""
    
    # Validate and process images
    front_image_data = None
    back_image_data = None
    
    if front_image:
        if not front_image.content_type.startswith("image/"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Front image file must be an image"
            )
        front_image_data = await front_image.read()

    if back_image:
        if not back_image.content_type.startswith("image/"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Back image file must be an image"
            )
        back_image_data = await back_image.read()

    # Create vehicle data dictionary
    vehicle_data = VehicleCreate(
        plate_no=plate_no,
        brand=brand,
        model=model,
        vehicle_type=vehicle_type,
        color=color
    )

    # Create vehicle with images
    return await VehicleView.create_vehicle(
        db=db,
        vehicle_data=vehicle_data,
        front_image=front_image_data,
        back_image=back_image_data
    )