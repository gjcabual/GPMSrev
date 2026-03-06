from datetime import datetime
from typing import List, Optional
from uuid import UUID
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.db.models.application import Application
from app.db.models.application_status import ApplicationStatus
from app.db.models.sticker import Sticker
from app.db.models.vehicle import Vehicle
from app.db.models.profile import Profile
from app.db.models.user import User
from app.utils.image import get_vehicle_image_url
class ApplicantLogController:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def verify_applicant_exists(self, applicant_id: UUID) -> None:
        """Verify that the user exists and is an applicant (role=2)"""
        query = select(User).where(
            and_(User.user_id == applicant_id, User.role == 2)
        )
        result = await self.db.execute(query)
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Applicant with given ID not found or user is not an applicant"
            )

    async def get_applicant_approved_applications(
        self, 
        applicant_id: UUID,
        sticker_number: Optional[str] = None,
        date: Optional[str] = None
    ) -> List[dict]:
        """
        Get all approved or rejected applications for a specific applicant,
        with optional filtering by sticker number and date
        """
        # Verify the applicant exists first
        await self.verify_applicant_exists(applicant_id)
        
        try:
            latest_status_date_subquery = (
                select(
                    ApplicationStatus.application_id.label("application_id"),
                    func.max(ApplicationStatus.date).label("latest_status_date")
                )
                .group_by(ApplicationStatus.application_id)
                .subquery()
            )

            query = (
                select(
                    Application.application_id,
                    Application.role,
                    Application.building_name,
                    Application.date.label("application_date"),
                    Sticker.sticker_id,
                    Vehicle.brand,
                    Vehicle.model,
                    Vehicle.plate_no,
                    ApplicationStatus.status,
                    ApplicationStatus.date.label("processed_date"),
                    Vehicle.front_image, 
                    Vehicle.back_image
                )
                .join(Vehicle, Application.plate_no == Vehicle.plate_no)
                .outerjoin(Sticker, Application.sticker_id == Sticker.id)
                .join(
                    latest_status_date_subquery,
                    Application.application_id == latest_status_date_subquery.c.application_id
                )
                .join(
                    ApplicationStatus,
                    and_(
                        Application.application_id == ApplicationStatus.application_id,
                        ApplicationStatus.date == latest_status_date_subquery.c.latest_status_date
                    )
                )
                .where(Application.user_id == applicant_id)
                .where(ApplicationStatus.status.in_(["Approved", "Rejected"]))
            )
            
            # Apply optional filters
            if sticker_number:
                query = query.filter(Sticker.sticker_id.ilike(f"%{sticker_number}%"))
                
            if date:
                try:
                    filter_date = datetime.strptime(date, "%Y-%m-%d").date()
                    query = query.filter(func.date(Application.date) == filter_date)
                except ValueError:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid date format. Use YYYY-MM-DD format."
                    )
                    
            # Order by most recent applications first
            query = query.order_by(Application.date.desc())
            
            # Execute the query
            result = await self.db.execute(query)
            applications = result.all()
            
            # Format the results to match the specified structure
            formatted_applications = []
            for app in applications:
                # Handle vehicle image URLs safely
                front_image_url = await get_vehicle_image_url(
                    self.db, app.plate_no, "front"
                ) if app.front_image else None
                
                back_image_url = await get_vehicle_image_url(
                    self.db, app.plate_no, "back"
                ) if app.back_image else None
                
                formatted_applications.append({
                    "application_id": app.application_id,
                    "role": app.role,
                    "building_name": app.building_name,
                    "sticker_number": app.sticker_id or "Not Assigned",
                    "brand": app.brand,
                    "model": app.model,
                    "plate_number": app.plate_no,
                    "date": app.application_date.strftime("%Y-%m-%d") if app.application_date else None,
                    "status": app.status,
                    "processed_date": app.processed_date.strftime("%Y-%m-%d") if app.processed_date else None,
                    "vehicle_images": {
                        "front": front_image_url,
                        "back": back_image_url
                    }
                })
                
            return formatted_applications
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to retrieve applicant logs: {str(e)}"
            )
