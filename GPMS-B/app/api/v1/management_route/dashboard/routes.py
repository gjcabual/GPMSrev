from fastapi import APIRouter, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from .views import DashboardView
from app.schemas.dashboard import DashboardResponse
from app.core.security import get_current_staff_or_admin
from app.schemas.user import UserInDB

router = APIRouter()

@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard_data(
    time_filter: str = Query(None, regex="^(today|week|month)$"),
    vehicle_type: str = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: UserInDB = Depends(get_current_staff_or_admin),
):
    return await DashboardView.get_dashboard_data(time_filter, vehicle_type, db)