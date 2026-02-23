from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from .views import ReportsView
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import get_current_staff_or_admin
from app.schemas.user import UserInDB


router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/dashboard")
async def get_dashboard_report(
    filter_type: str = Query(default="year", description="Filter type: week, month, or year"),
    db: AsyncSession = Depends(get_db),
    current_user: UserInDB = Depends(get_current_staff_or_admin)
):
    view = ReportsView(db)
    return await view.get_dashboard_report(filter_type)

@router.get("/sticker-distribution")
async def get_sticker_distribution(db: Session = Depends(get_db)):
    view = ReportsView(db)
    controller = view.controller
    return await controller.get_sticker_distribution()