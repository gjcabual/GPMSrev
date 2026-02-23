from fastapi import APIRouter, Depends, HTTPException, Form, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import get_db
from app.schemas.application import (
    ApplicationStatusUpdate, 
    form_body, 
    StatusUpdateResponse,
    ApplicationDetail,
    PendingApplicationsListResponse
)
from app.core.security import get_current_staff, get_current_staff_or_admin
from app.schemas.user import UserInDB
from .controller import StaffController
from app.db.models.auth_driver import AuthDriver
from app.db.models.document import Document
from app.db.models.vehicle import Vehicle
from app.db.models.profile import Profile
from app.db.models.slip import Slip

router = APIRouter(prefix="/staff", tags=["staff"])

@router.post("/application-status/update", 
    status_code=201,
    response_model=StatusUpdateResponse
)
async def update_status(
    status_update: ApplicationStatusUpdate = Depends(form_body),
    db: AsyncSession = Depends(get_db),
    current_user: UserInDB = Depends(get_current_staff)  
):
    """
    Update application status to either Approved or Rejected.
    Returns a simplified success response.
    """
    controller = StaffController(db)
    await controller.update_application_status(
        status_update=status_update,
        current_user_id=current_user.user_id
    )
    
    return StatusUpdateResponse(
        message=f"Application has been updated.",
        status=status_update.status
    )

@router.get("/applications/pending", response_model=PendingApplicationsListResponse)
async def get_pending_applications(
    db: AsyncSession = Depends(get_db),
    current_user: UserInDB = Depends(get_current_staff)
):
    """Get all pending applications"""
    controller = StaffController(db)
    return await controller.get_pending_applications()

@router.get("/applications/{application_id}", response_model=ApplicationDetail)
async def get_application_detail(
    application_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: UserInDB = Depends(get_current_staff_or_admin)
):
    """Get detailed information about a specific application"""
    controller = StaffController(db)
    return await controller.get_application_by_id(application_id)

@router.get("/document/{document_id}/image")
async def get_document_image(
    document_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get document image by ID"""
    query = select(Document).where(Document.document_id == document_id)
    result = await db.execute(query)
    document = result.scalar_one_or_none()

    if not document or not document.image:
        raise HTTPException(status_code=404, detail="Document image not found")

    return Response(
        content=document.image,
        media_type="image/jpeg",
        headers={"Cache-Control": "max-age=3600"}
    )

@router.get("/driver/{driver_id}/profile-image")
async def get_driver_profile_image(
    driver_id: int,
    db: AsyncSession = Depends(get_db),
    # current_user: UserInDB = Depends(get_current_staff_or_admin)
):
    """Get authorized driver's profile image"""
    query = select(AuthDriver).where(AuthDriver.auth_driver_id == driver_id)
    result = await db.execute(query)
    driver = result.scalar_one_or_none()

    if not driver or not driver.profile_image:
        raise HTTPException(status_code=404, detail="Driver profile image not found")

    return Response(
        content=driver.profile_image,
        media_type="image/jpeg",
        headers={"Cache-Control": "max-age=3600"}
    )

@router.get("/vehicle/{plate_no}/{image_type}")
async def get_vehicle_image(
    plate_no: str,
    image_type: str,
    db: AsyncSession = Depends(get_db),
    # current_user: UserInDB = Depends(get_current_staff_or_admin)
):
    """Get vehicle image by plate number and type (front/back)"""
    if image_type not in ["front-image", "back-image"]:
        raise HTTPException(status_code=400, detail="Invalid image type. Must be 'front-image' or 'back-image'")
    
    query = select(Vehicle).where(Vehicle.plate_no == plate_no)
    result = await db.execute(query)
    vehicle = result.scalar_one_or_none()

    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    image = vehicle.front_image if image_type == "front-image" else vehicle.back_image
    if not image:
        raise HTTPException(status_code=404, detail=f"Vehicle {image_type} not found")

    return Response(
        content=image,
        media_type="image/jpeg",
        headers={"Cache-Control": "max-age=3600"}
    )

@router.get("/profile/image/{profile_id}")
async def get_profile_image(
    profile_id: int,
    db: AsyncSession = Depends(get_db),
    # current_user: UserInDB = Depends(get_current_staff_or_admin)
):
    """Get owner's profile image"""
    query = select(Profile).where(Profile.profile_id == profile_id)
    result = await db.execute(query)
    profile = result.scalar_one_or_none()

    if not profile or not profile.image:
        raise HTTPException(status_code=404, detail="Profile image not found")

    return Response(
        content=profile.image,
        media_type="image/jpeg",
        headers={"Cache-Control": "max-age=3600"}
    )

@router.get("/slip/{slip_id}/image")
async def get_slip_image(
    slip_id: int,
    db: AsyncSession = Depends(get_db),
    # current_user: UserInDB = Depends(get_current_staff)
):
    """Get slip image by ID"""
    query = select(Slip).where(Slip.slip_id == slip_id)
    result = await db.execute(query)
    slip = result.scalar_one_or_none()

    if not slip or not slip.image:
        raise HTTPException(status_code=404, detail="Slip image not found")

    return Response(content=slip.image, media_type="image/jpeg")

