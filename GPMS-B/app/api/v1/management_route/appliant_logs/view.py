from typing import List, Optional
from uuid import UUID
from fastapi import Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from .controller import ApplicantLogController 


class ApplicantLogView:
    @staticmethod
    async def get_applicant_application_logs(
        applicant_id: UUID,
        sticker_number: Optional[str] = None,
        date: Optional[str] = None,
        db: AsyncSession = Depends(get_db)
    ) -> List[dict]:
        """
        Get all approved/rejected applications for a specific applicant with
        optional filtering by sticker number and date
        """
        try:
            controller = ApplicantLogController(db)
            return await controller.get_applicant_approved_applications(
                applicant_id=applicant_id,
                sticker_number=sticker_number,
                date=date
            )
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=500,
                detail=f"Error retrieving applicant logs: {str(e)}"
            )