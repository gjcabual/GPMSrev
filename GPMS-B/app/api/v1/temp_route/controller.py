import logging
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.temp import VehicleCreate
from app.db.models.vehicle import Vehicle
from typing import Optional

logger = logging.getLogger(__name__)

class VehicleController:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_vehicle(
        self,
        vehicle_data: VehicleCreate,
        front_image: Optional[bytes] = None,
        back_image: Optional[bytes] = None
    ) -> Vehicle:  # Change return type to Vehicle
        try:
            new_vehicle = Vehicle(
                plate_no=vehicle_data.plate_no,
                brand=vehicle_data.brand,
                model=vehicle_data.model,
                vehicle_type=vehicle_data.vehicle_type,
                color=vehicle_data.color,
                front_image=front_image,
                back_image=back_image
            )

            self.db.add(new_vehicle)
            await self.db.commit()
            await self.db.refresh(new_vehicle)
            return new_vehicle  # Return the Vehicle model directly

        except IntegrityError as e:
            await self.db.rollback()
            if "duplicate key value violates unique constraint" in str(e):
                raise HTTPException(status_code=409, 
                    detail=f"Vehicle with plate number '{vehicle_data.plate_no}' already exists")
            raise HTTPException(status_code=400, detail="Database integrity error")
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating vehicle: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to create vehicle")