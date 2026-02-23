import logging
from fastapi import Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from .controller import DashboardController

logger = logging.getLogger(__name__)

class DashboardView:
    @staticmethod
    async def get_dashboard_data(
        time_filter: str = None,
        vehicle_type: str = None,
        db: AsyncSession = Depends(get_db)
    ):
        try:
            controller = DashboardController(db)
            data = {
                "application_status": await controller.get_application_status_counts(),
                "sticker_types": await controller.get_sticker_type_counts(),
                "charges_summary": await controller.get_charges_summary(),
                "vehicle_counts": await controller.get_vehicle_counts(time_filter),  # Now returns dict with counts and matrix
                "pending_vehicles": await controller.get_pending_vehicles(vehicle_type)  
            }
            return data
        except Exception as e:
            logger.error(f"Dashboard error: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"Internal server error: {str(e)}"
            )