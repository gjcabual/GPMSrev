from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.core.security import get_current_staff_or_admin
from app.schemas.user import UserInDB
from .view import ApplicantLogView  

router = APIRouter(
    prefix="/management/applicant-logs",
    tags=["Management - Applicant Logs"]
)

@router.get("/{applicant_id}/applications", response_model=List[dict])
async def get_applicant_application_logs(
    applicant_id: UUID,
    sticker_number: Optional[str] = Query(None, description="Filter by sticker number"),
    date: Optional[str] = Query(None, description="Filter by application date (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
    current_user: UserInDB = Depends(get_current_staff_or_admin)
):
    """
    Get all approved or rejected applications for a specific applicant.
    Only accessible by staff and admin users.
    
    - **applicant_id**: UUID of the applicant (user with role=2)
    - **sticker_number** (optional): Filter by sticker number (partial match)
    - **date** (optional): Filter by date in YYYY-MM-DD format
    """
    return await ApplicantLogView.get_applicant_application_logs(
        applicant_id=applicant_id,
        sticker_number=sticker_number,
        date=date,
        db=db
    )