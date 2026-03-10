import logging
from typing import Dict, Any  # Add this import
from fastapi import Depends, HTTPException, status  
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from .controller import StaffController
from app.schemas.staff import StaffListResponse
from app.schemas.batch_sticker import BatchStickerCreateRequest, BatchStickersCreateResponse, BatchStickerResponse, BatchStickersListResponse
from uuid import UUID

logger = logging.getLogger(__name__)

class StaffView:
    @staticmethod
    async def get_staff_list(
        skip: int = 0,
        limit: int = 10,
        db: AsyncSession = Depends(get_db)
    ) -> StaffListResponse:
        try:
            controller = StaffController(db)
            staffs = await controller.get_staff_accounts(skip, limit)
            total = await controller.get_total_staff_count()
            
            return StaffListResponse(
                staffs=staffs,
                total=total
            )
        except Exception as e:
            logger.error(f"Staff list error: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"Internal server error: {str(e)}"
            )

    @staticmethod
    async def create_batch_sticker_sessions(
        batch_data: BatchStickerCreateRequest,
        db: AsyncSession = Depends(get_db)
    ) -> BatchStickersCreateResponse:
        try:
            controller = StaffController(db)
            created_batches = await controller.create_batch_sticker_sessions(
                batch_data.batches,
                batch_data.batch_name
            )
            
            return BatchStickersCreateResponse(
                success=True,
                message="Successfully created batch sticker sessions",
                batches=[
                    BatchStickerResponse(
                        batch_id=batch.batch_id,
                        type=batch.type,
                        batch_name=batch.batch_name,
                        start_at=batch.start_at,
                        end_at=batch.end_at,
                        price=batch.price,
                        created_at=batch.created_at
                    ) for batch in created_batches
                ]
            )
        except ValueError as ve:  # Add this specific exception handler
            logger.warning(f"Validation error in batch creation: {str(ve)}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "error": "Range Conflict",
                    "message": str(ve),
                    "type": "STICKER_RANGE_OVERLAP"
                }
            )
        except Exception as e:
            logger.error(f"Batch sticker creation error: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"Internal server error: {str(e)}"
            )

    @staticmethod
    async def get_batch_stickers_list(
        filter_by: str = None,
        year: int = None,
        db: AsyncSession = Depends(get_db)
    ) -> BatchStickersListResponse:
        """Get list of all batch sticker sessions with optional filtering"""
        try:
            controller = StaffController(db)
            result = await controller.get_all_batch_stickers(filter_by, year)
            
            return BatchStickersListResponse(
                success=result["success"],
                total=result["total"],
                batches=result["batches"]
            )
        except Exception as e:
            logger.error(f"Error fetching batch stickers: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"Internal server error: {str(e)}"
            )

    @staticmethod
    async def delete_staff_account(
        user_id: UUID,
        db: AsyncSession = Depends(get_db)
    ) -> dict:
        """Delete a staff account"""
        try:
            controller = StaffController(db)
            await controller.delete_staff_account(user_id)
            return {
                "success": True,
                "message": "Staff account successfully deleted"
            }
        except ValueError as e:
            raise HTTPException(
                status_code=404,
                detail=str(e)
            )
        except Exception as e:
            logger.error(f"Error deleting staff account: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"Internal server error: {str(e)}"
            )

    @staticmethod
    async def get_recommended_start_values(db: AsyncSession) -> Dict[str, Any]:
        try:
            controller = StaffController(db)
            return await controller.get_recommended_start_values()
        except Exception as e:
            logger.error(f"Error getting sticker recommendations: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"Internal server error: {str(e)}"
            )
