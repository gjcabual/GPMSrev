from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.vehicle import Vehicle

async def get_vehicle_image_url(plate_no: str, image_type: str, db: AsyncSession) -> Optional[str]:
    """Generate URL for vehicle images if they exist"""
    try:
        stmt = select(Vehicle).where(Vehicle.plate_no == plate_no)
        result = await db.execute(stmt)
        vehicle = result.scalar_one_or_none()
        
        if not vehicle:
            return None

        # Check if image exists
        image = vehicle.front_image if image_type == "front" else vehicle.back_image
        if not image:
            return None

        # Return URL path with correct prefix
        return f"/api/v1/management/{plate_no}/images/{image_type}"
    except Exception:
        return None

def get_profile_image_url(profile_id: int) -> Optional[str]:
    """
    Generate URL for profile images if they exist
    Args:
        profile_id: Profile ID (integer)
    Returns:
        Optional[str]: URL path to the profile image
    """
    if not profile_id:
        return None
    # Ensure we're using the integer profile_id, not UUID
    return f"/api/v1/profile/image/{profile_id}"