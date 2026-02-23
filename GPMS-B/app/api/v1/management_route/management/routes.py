from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.core.security import get_current_staff_or_admin
from app.schemas.user import UserInDB
from .views import ManagementView
from app.schemas.management import (
    ApprovedApplicationsListResponse,
    ApplicantApplicationHistoryResponse,
    ApprovedApplicationsResponse  #
)
from app.db.models.vehicle import Vehicle
from sqlalchemy import select
import logging  
from uuid import UUID  

logger = logging.getLogger(__name__)  

router = APIRouter(
    prefix="/management",
    tags=["Management"]
)

@router.get("/approved-applications", response_model=ApprovedApplicationsResponse)  
async def get_approved_applications(
    sticker_id: str | None = None,
    vehicle_type: str | None = None,
    time_filter: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: UserInDB = Depends(get_current_staff_or_admin)
):
    return await ManagementView.get_approved_applications(
        db, 
        sticker_id=sticker_id,
        vehicle_type=vehicle_type,
        time_filter=time_filter
    )

@router.get("/{plate_no}/images/{image_type}")
async def get_vehicle_image(
    plate_no: str,
    image_type: str,
    db: AsyncSession = Depends(get_db)
):
    """Get vehicle image by plate number and type"""
    try:
        if image_type not in ["front", "back"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid image type. Must be 'front' or 'back'"
            )

        stmt = select(Vehicle).where(Vehicle.plate_no == plate_no)
        result = await db.execute(stmt)
        vehicle = result.scalar_one_or_none()

        if not vehicle:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vehicle not found"
            )

        image = vehicle.front_image if image_type == "front" else vehicle.back_image
        if not image:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Vehicle {image_type} image not found"
            )

        return Response(
            content=image,
            media_type="image/jpeg",
            headers={
                "Content-Type": "image/jpeg",
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "max-age=3600"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving vehicle image: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get(
    "/applicant/history/{applicant_id}",
    response_model=ApplicantApplicationHistoryResponse,
    summary="Get applicant's application history"
)
async def get_applicant_history(
    applicant_id: UUID,
    sticker_number: str | None = None,
    date: str | None = None,
    vehicle_type: str | None = None,  # Add new parameter
    db: AsyncSession = Depends(get_db),
    current_user: UserInDB = Depends(get_current_staff_or_admin)
):
    """
    Get all application records for a specific applicant (role=2)
    
    Parameters:
    - applicant_id: UUID of the applicant
    - sticker_number: Optional filter by sticker number
    - date: Optional filter by date (format: YYYY-MM-DD)
    - vehicle_type: Optional filter by vehicle type
    """
    view = ManagementView(db)
    return await view.get_applicant_history(
        str(applicant_id),
        sticker_number=sticker_number,
        date=date,
        vehicle_type=vehicle_type  # Add new parameter
    )