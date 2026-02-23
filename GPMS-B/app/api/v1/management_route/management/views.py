import logging
from fastapi import Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from .controller import ManagementController

logger = logging.getLogger(__name__)

class ManagementView:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.controller = ManagementController(db)

    async def get_applicant_history(
        self, 
        applicant_id: str,
        sticker_number: str | None = None,
        date: str | None = None,
        vehicle_type: str | None = None  # Add this parameter
    ):
        """Get application history for a specific applicant with filters"""
        try:
            return await self.controller.get_applicant_history(
                applicant_id,
                sticker_number=sticker_number,
                date=date,
                vehicle_type=vehicle_type  # Add this parameter
            )
        except Exception as e:
            logger.error(f"Error fetching applicant history: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"Internal server error: {str(e)}"
            )

    @classmethod
    async def get_approved_applications(
        cls,
        db: AsyncSession,
        sticker_id: str | None = None,
        vehicle_type: str | None = None,
        time_filter: str | None = None
    ):
        """Get all approved applications with optional filters"""
        try:
            controller = ManagementController(db)
            return await controller.get_approved_applications(
                sticker_id=sticker_id,
                vehicle_type=vehicle_type,
                time_filter=time_filter
            )
        except Exception as e:
            logger.error(f"Error fetching approved applications: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"Internal server error: {str(e)}"
            )