import logging
from fastapi import Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.db.session import get_db
from app.schemas.temp import VehicleCreate, VehicleResponse
from .controller import VehicleController

logger = logging.getLogger(__name__)

class VehicleView:
    @staticmethod
    async def create_vehicle(
        vehicle_data: VehicleCreate,
        db: AsyncSession = Depends(get_db),
        front_image: Optional[bytes] = None,
        back_image: Optional[bytes] = None
    ) -> VehicleResponse:
        try:
            controller = VehicleController(db)
            vehicle = await controller.create_vehicle(
                vehicle_data=vehicle_data,
                front_image=front_image,
                back_image=back_image
            )
            
            # Convert to response model
            try:
                return VehicleResponse.from_orm(vehicle)
            except Exception as conversion_error:
                logger.error(f"Error converting vehicle to response: {str(conversion_error)}")
                raise HTTPException(
                    status_code=500,
                    detail="Error processing image data"
                )
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating vehicle: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"Internal server error: {str(e)}"
            )