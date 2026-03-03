from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.db.session import get_db
from app.db.models.application_status import ApplicationStatus
from app.db.models.application import Application
from app.db.models.user import User
from app.db.models.vehicle import Vehicle
from app.db.models.assigned_driver import AssignedDriver
from app.db.models.batch_sticker_sessions import BatchStickerSessions
from app.db.models.sticker import Sticker
from app.db.models.auth_driver import AuthDriver
from app.schemas.application import ApplicationStatusResponse
from datetime import date
from uuid import UUID
from app.db.models.slip import Slip

async def get_application_status(
    db: Session = Depends(get_db),
    application_id: int = None
) -> List[ApplicationStatusResponse]:
    """
    Retrieve application status history.
    If application_id is provided, returns status history for that application.
    Otherwise returns all status entries.
    """
    query = db.query(ApplicationStatus)
    
    if application_id:
        query = query.filter(ApplicationStatus.application_id == application_id)
    
    # Order by date descending to get latest status first
    statuses = query.order_by(desc(ApplicationStatus.date)).all()
    
    if not statuses and application_id:
        raise HTTPException(
            status_code=404,
            detail=f"No status found for application ID: {application_id}"
        )
    
    return statuses

async def get_pending_applications(
    db: Session = Depends(get_db)
) -> List[ApplicationStatusResponse]:
    """
    Retrieve all applications with 'Pending' status.
    Returns only the latest status for each application.
    """
    # Subquery to get the latest status for each application
    latest_statuses = (
        db.query(ApplicationStatus)
        .filter(ApplicationStatus.status == "Pending")
        .order_by(desc(ApplicationStatus.date))
        .all()
    )

    return latest_statuses

class StaffView:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_latest_status(self, application_id: int) -> ApplicationStatus:
        """Get the most recent status for an application"""
        query = (
            select(ApplicationStatus)
            .where(ApplicationStatus.application_id == application_id)
            .order_by(desc(ApplicationStatus.date))
            .limit(1)
        )
        result = await self.db.execute(query)
        latest_status = result.scalar_one_or_none()

        if not latest_status:
            raise HTTPException(status_code=404, detail="Application not found")

        if latest_status.status not in ("Pending", "Waiting for approval"):
            raise HTTPException(
                status_code=400,
                detail=f"This application has already been {latest_status.status.lower()}."
            )

        return latest_status

    async def create_status_update(
        self, 
        application_id: int, 
        status: str, 
        current_user_id: UUID
    ) -> ApplicationStatus:
        """
        Create a new status update and handle sticker assignment/removal
        based on the status (Approved/Rejected)
        """
        
        # Get application details first
        query = select(Application).where(Application.application_id == application_id)
        result = await self.db.execute(query)
        application = result.scalar_one_or_none()
        
        if not application:
            raise HTTPException(status_code=404, detail="Application not found")

        # Create status update
        new_status = ApplicationStatus(
            status=status,
            date=date.today(),
            application_id=application_id,
            processed_by=current_user_id
        )
        self.db.add(new_status)
        
        # If approved, create and assign a sticker (if doesn't already have one)
        if status == "Approved" and not application.sticker_id:
            # Create sticker
            new_sticker = await self.create_sticker(
                application_id=application_id,
                role=application.role,
                plate_no=application.plate_no
            )
            
            # Update application with sticker ID
            application.sticker_id = new_sticker.id
        
        # If rejected, remove any existing sticker
        elif status == "Rejected" and application.sticker_id:
            # Find the sticker object
            sticker_query = select(Sticker).where(Sticker.id == application.sticker_id)
            sticker_result = await self.db.execute(sticker_query)
            sticker = sticker_result.scalar_one_or_none()
            
            # Delete the sticker if found
            if sticker:
                await self.db.delete(sticker)
            
            # Set application's sticker_id to NULL
            application.sticker_id = None
        
        # Commit all changes
        await self.db.commit()
        await self.db.refresh(new_status)
        
        return new_status

    async def get_application_detail(self, application_id: int):
        query = (
            select(Application)
            .options(
                joinedload(Application.user)
                .joinedload(User.profiles),
                joinedload(Application.vehicle)
                .joinedload(Vehicle.documents),
                joinedload(Application.assigned_drivers)
                .joinedload(AssignedDriver.auth_driver)
                .joinedload(AuthDriver.document),
                joinedload(Application.sticker),
                # Also load application's documents directly
                joinedload(Application.documents)
            )
            .where(Application.application_id == application_id)
        )

        result = await self.db.execute(query)
        application = result.unique().scalar_one_or_none()

        if not application:
            raise HTTPException(status_code=404, detail="Application not found")

        return application

    async def get_pending_applications(self):
        """Get all applications where the latest status is Pending or Waiting for approval"""
        
        # Subquery to get the latest status_id for each application
        latest_status_subquery = (
            select(
                ApplicationStatus.application_id,
                func.max(ApplicationStatus.status_id).label('latest_status_id')
            )
            .group_by(ApplicationStatus.application_id)
            .subquery()
        )

        # Main query joining with the latest status
        query = (
            select(Application)
            .join(latest_status_subquery, 
                  Application.application_id == latest_status_subquery.c.application_id)
            .join(ApplicationStatus,
                  ApplicationStatus.status_id == latest_status_subquery.c.latest_status_id)
            .where(ApplicationStatus.status.in_(["Pending", "Waiting for approval"]))
            .options(
                joinedload(Application.user).joinedload(User.profiles),
                joinedload(Application.vehicle),
                joinedload(Application.sticker),
                joinedload(Application.slip),
                joinedload(Application.documents), 
                joinedload(Application.assigned_drivers)
                .joinedload(AssignedDriver.auth_driver)
                .joinedload(AuthDriver.document)
            )
            .order_by(desc(ApplicationStatus.date))
        )

        result = await self.db.execute(query)
        applications = result.unique().scalars().all()
        
        return applications

    async def get_available_sticker_number(self, role: str) -> tuple[int, int]:
        """
        Get available sticker number based on role and batch ranges
        Returns tuple of (sticker_number, batch_id)
        """
        # Map application roles to batch sticker types
        role_to_type = {
            "STUDENT": "Student",
            "EMPLOYEE": "Employee Parking",
            "DROP_OFF": "Drop Off",
            "CONCESSIONAIRE": "Concessionaire"
        }

        batch_type = role_to_type.get(role.upper())
        if not batch_type:
            raise HTTPException(
                status_code=400,
                detail="Invalid application role for sticker generation"
            )

        # Get active batch for the role type
        query = select(BatchStickerSessions).where(
            BatchStickerSessions.type == batch_type
        )
        result = await self.db.execute(query)
        batch = result.scalar_one_or_none()

        if not batch:
            raise HTTPException(
                status_code=404,
                detail=f"No active batch found for {batch_type}"
            )

        # Get all used numbers in this batch
        used_numbers_query = select(Sticker.sticker_id).where(
            Sticker.batch_id == batch.batch_id
        )
        result = await self.db.execute(used_numbers_query)
        used_numbers = {int(sticker_id.split('-')[1]) for sticker_id in result.scalars().all()}

        # Find first available number in range
        for number in range(batch.start_at, batch.end_at + 1):
            if number not in used_numbers:
                return number, batch.batch_id

        raise HTTPException(
            status_code=400,
            detail=f"No available sticker numbers in batch for {batch_type}"
        )

    async def create_sticker(self, application_id: int, role: str, plate_no: str) -> Sticker:
        """Create a new sticker for approved application"""
        number, batch_id = await self.get_available_sticker_number(role)
        
        # Get the batch details to access created_at date
        query = select(BatchStickerSessions).where(
            BatchStickerSessions.batch_id == batch_id
        )
        result = await self.db.execute(query)
        batch = result.scalar_one_or_none()
        
        # Extract year from batch creation date (e.g., 2025 becomes '25')
        year_prefix = str(batch.created_at.year)[-2:]  # Gets last 2 digits of year
        sticker_id = f"{year_prefix}-{number}"
        
        new_sticker = Sticker(
            sticker_id=sticker_id,
            batch_id=batch_id,
            plate_no=plate_no
        )
        
        self.db.add(new_sticker)
        await self.db.commit()
        await self.db.refresh(new_sticker)
        return new_sticker
