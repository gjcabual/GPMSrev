from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
from app.db.models.profile import Profile
from app.db.models.user import User
from app.schemas.profile import ProfileUpdate, ProfileCreate
from uuid import UUID
from typing import Optional

async def get_profile_by_user_id(db: AsyncSession, user_id: UUID) -> Optional[Profile]:
    """Get profile by user ID with user information"""
    result = await db.execute(
        select(Profile)
        .options(selectinload(Profile.user))  # Include user relationship
        .where(Profile.user_id == user_id)
    )
    return result.scalars().first()


async def get_profile_by_id(db: AsyncSession, profile_id: int) -> Optional[Profile]:
    """Get profile by profile ID"""
    result = await db.execute(
        select(Profile)
        .options(selectinload(Profile.user))
        .where(Profile.profile_id == profile_id)
    )
    return result.scalars().first()

async def create_profile(db: AsyncSession, user_id: UUID, profile_data: ProfileCreate) -> Profile:
    """Create a new profile"""
    profile_dict = profile_data.model_dump()
    profile_dict["user_id"] = user_id
    
    profile = Profile(**profile_dict)
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return profile

async def update_profile(db: AsyncSession, profile_id: int, profile_data: ProfileUpdate) -> Profile:
    """Update profile information"""
    profile_dict = {k: v for k, v in profile_data.model_dump().items() if v is not None}
    
    if profile_dict:
        await db.execute(
            update(Profile)
            .where(Profile.profile_id == profile_id)
            .values(**profile_dict)
        )
        await db.commit()
    
    # Fetch updated profile
    result = await db.execute(
        select(Profile).where(Profile.profile_id == profile_id)
    )
    return result.scalars().first()

async def update_profile_image(db: AsyncSession, profile_id: int, image_data: bytes) -> Profile:
    """Update profile image"""
    await db.execute(
        update(Profile)
        .where(Profile.profile_id == profile_id)
        .values(image=image_data)
    )
    await db.commit()
    
    # Fetch updated profile
    result = await db.execute(
        select(Profile).where(Profile.profile_id == profile_id)
    )
    return result.scalars().first()