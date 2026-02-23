from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.user import UserInDB
from app.core.security import get_current_admin
from app.schemas.staff import StaffListResponse
from app.schemas.batch_sticker import BatchStickersCreateResponse, BatchStickerForm, BatchStickersListResponse
from .views import StaffView
import logging
from uuid import UUID
from typing import Dict, Any  # Add this import

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get(
    "/accounts", 
    response_model=StaffListResponse,
    summary="Get list of staff accounts",
    description="Retrieve a paginated list of staff accounts. Only accessible by admin users."
)
async def list_staff_accounts(
    db: AsyncSession = Depends(get_db),
    current_user: UserInDB = Depends(get_current_admin),
    skip: int = Query(
        default=0, 
        ge=0, 
        description="Number of records to skip"
    ),
    limit: int = Query(
        default=10, 
        ge=1, 
        le=100, 
        description="Number of records to return"
    )
):
    if current_user.role != 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this resource"
        )
    
    return await StaffView.get_staff_list(skip, limit, db)

@router.post(
    "/batch-stickers",
    response_model=BatchStickersCreateResponse,
    summary="Create batch sticker sessions using form data",
    description="Create sticker batch sessions for any combination of sticker types."
)
async def create_batch_sticker_sessions(
    form_data: BatchStickerForm = Depends(),
    db: AsyncSession = Depends(get_db),
    current_user: UserInDB = Depends(get_current_admin)
):
    if current_user.role != 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this resource"
        )
    
    try:
        batch_data = form_data.to_request_object()
        return await StaffView.create_batch_sticker_sessions(batch_data, db)
    except ValueError as ve:
        error_message = str(ve)
        if "must be provided together" in error_message:
            # Handle missing start/end validation
            logger.warning(f"Sticker range validation error: {error_message}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "error": "Validation Error",
                    "message": error_message,
                    "type": "STICKER_RANGE_VALIDATION"
                }
            )
        # Handle other range conflicts
        logger.warning(f"Sticker range conflict: {error_message}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": "Range Conflict",
                "message": error_message,
                "type": "STICKER_RANGE_OVERLAP"
            }
        )

@router.get(
    "/batch-stickers",
    response_model=BatchStickersListResponse,
    summary="Get all batch sticker sessions",
    description="Retrieve all sticker batch sessions, grouped by created date. Can be filtered by current month, current year, or specific year."
)
async def list_batch_stickers(
    filter_by: str = Query(
        None, 
        description="Filter results: 'month' for current month, 'year' for current year, None for all"
    ),
    year: int = Query(
        None,
        description="Filter by specific year (YYYY format)",
        ge=2000,
        le=2100
    ),
    db: AsyncSession = Depends(get_db),
    current_user: UserInDB = Depends(get_current_admin)
):
    if current_user.role != 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this resource"
        )
    
    # Validate filter_by parameter
    if filter_by and filter_by not in ['month', 'year']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid filter value. Use 'month', 'year', or leave empty for all records."
        )
    
    # Don't allow both filter_by and year parameters simultaneously
    if filter_by and year:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot use both 'filter_by' and 'year' parameters simultaneously."
        )
    
    return await StaffView.get_batch_stickers_list(filter_by, year, db)

@router.get(
    "/batch-stickers/recommendations",
    response_model=Dict[str, Any],
    summary="Get recommended start values for stickers",
    description="Returns recommended starting values for each sticker type based on existing ranges in the database."
)
async def get_sticker_recommendations(
    db: AsyncSession = Depends(get_db),
    current_user: UserInDB = Depends(get_current_admin)
):
    if current_user.role != 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this resource"
        )
    
    return await StaffView.get_recommended_start_values(db)

@router.delete(
    "/accounts/{user_id}",
    response_model=dict,
    summary="Delete staff account",
    description="Delete a staff account by user ID. Only works for accounts with role=1 (staff)."
)
async def delete_staff_account(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: UserInDB = Depends(get_current_admin)
):
    if current_user.role != 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this resource"
        )
    
    return await StaffView.delete_staff_account(user_id, db)