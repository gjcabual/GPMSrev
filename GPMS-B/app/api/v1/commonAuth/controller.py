import asyncio
import functools
import imghdr
import random
import string
from datetime import datetime, timedelta
from typing import Optional, Tuple, Callable, Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash, verify_password
from app.db.repositories.user import get_user_by_email, update_user_password, get_user_by_id
from app.db.repositories.token import (
    create_reset_token, get_valid_reset_token, delete_used_reset_token, 
    get_user_id_from_token
)
from app.db.repositories.profile import (
    get_profile_by_user_id as get_profile_repository, 
    update_profile, create_profile, update_profile_image
)
from app.schemas.profile import ProfileUpdate, ProfileOut
from app.utils.email import send_password_reset_otp


def validate_token(func: Callable) -> Callable:
    """Decorator to validate token and extract user_id"""
    @functools.wraps(func)
    async def wrapper(cls, db: AsyncSession, token: str, *args, **kwargs):
        user_id = await get_user_id_from_token(db, token)
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )
        return await func(cls, db, user_id, *args, **kwargs)
    return wrapper


class CommonAuthController:
    @staticmethod
    async def generate_otp(length=6) -> str:
        """Generate a random numeric OTP"""
        return ''.join(random.choices(string.digits, k=length))
    
    @staticmethod
    async def request_password_reset(db: AsyncSession, email: str) -> dict:
        """Create password reset request and send OTP"""
        # Check if user exists
        user = await get_user_by_email(db, email=email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Email not registered"
            )
        
        # Generate OTP
        otp = await CommonAuthController.generate_otp()
        
        # Set expiry (15 minutes from now)
        expires_at = datetime.now() + timedelta(minutes=15)
        
        # Save OTP as reset token
        await create_reset_token(db, user.user_id, otp, expires_at)
        
        # Send email with OTP
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, send_password_reset_otp, email, otp)
            return {"message": "Password reset OTP has been sent to your email"}
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to send OTP: {str(e)}"
            )
    
    @staticmethod
    async def verify_otp_and_reset_password(
        db: AsyncSession, email: str, otp: str, new_password: str
    ) -> dict:
        """Verify OTP and reset user password"""
        # Check password strength
        if len(new_password) < 8:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 8 characters long"
            )
            
        # Find user by email
        user = await get_user_by_email(db, email=email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Verify OTP
        valid_token = await get_valid_reset_token(db, user.user_id, otp)
        if not valid_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired OTP"
            )
        
        # Update password
        hashed_password = get_password_hash(new_password)
        await update_user_password(db, user.user_id, hashed_password)
        
        # Delete used token
        await delete_used_reset_token(db, valid_token.token_id)
        
        return {"message": "Password has been reset successfully"}
    
    @staticmethod
    @validate_token
    async def update_profile(db: AsyncSession, user_id: UUID, profile_data: ProfileUpdate) -> ProfileOut:
        """Update user profile"""
        # Get current profile or create if it doesn't exist
        profile = await get_profile_repository(db, user_id)
        if not profile:
            # Create a new profile if updating for the first time
            # This would require full profile data, not just updates
            if not all(getattr(profile_data, field) for field in ["first_name", "last_name", "birth_date", "sex", "address"]):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Complete profile information required for initial creation"
                )
            profile = await create_profile(db, user_id, profile_data)
            return ProfileOut.from_orm_with_image(profile)
        
        # Update existing profile
        updated_profile = await update_profile(db, profile.profile_id, profile_data)
        return ProfileOut.from_orm_with_image(updated_profile)
    
    @staticmethod
    @validate_token
    async def get_profile(db: AsyncSession, user_id: UUID) -> ProfileOut:
        """Get user profile"""            
        profile = await get_profile_repository(db, user_id)
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found"
            )
            
        return ProfileOut.from_orm_with_image(profile)
    
    @staticmethod
    @validate_token
    async def update_profile_image(
        db: AsyncSession, user_id: UUID, image_data: bytes
    ) -> dict:
        """Update profile image"""            
        profile = await get_profile_repository(db, user_id)
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found, create a profile first"
            )
        
        # Check image size
        if len(image_data) > 5_000_000:  # 5MB limit
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Image too large. Maximum size is 5MB"
            )
        
        # Detect image format
        image_format = imghdr.what(None, h=image_data)
        if not image_format:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid image format"
            )
            
        await update_profile_image(db, profile.profile_id, image_data)
        return {"message": "Profile image updated successfully"}
    
    @staticmethod
    @validate_token
    async def get_profile_image(
        db: AsyncSession, user_id: UUID
    ) -> Tuple[Optional[bytes], Optional[str]]:
        """Get profile image with content type"""            
        profile = await get_profile_repository(db, user_id)
        if not profile or not profile.image:
            return None, None
            
        # Try to detect image format
        image_format = imghdr.what(None, h=profile.image)
        content_type = f"image/{image_format}" if image_format else "image/jpeg"
            
        return profile.image, content_type

    @staticmethod
    async def update_profile_by_user_id(
        db: AsyncSession, user_id: UUID, profile_data: ProfileUpdate
    ) -> ProfileOut:
        """Update user profile directly with user_id"""
        # Skip the token lookup since we already have the user_id
        profile = await get_profile_repository(db, user_id)
        
        # Fetch the user to get the email
        user = await get_user_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        if not profile:
            # Create a new profile if updating for the first time
            if not all(getattr(profile_data, field) for field in ["first_name", "last_name", "birth_date", "sex", "address"]):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Complete profile information required for initial creation"
                )
            profile = await create_profile(db, user_id, profile_data)
        else:
            # Update existing profile
            profile = await update_profile(db, profile.profile_id, profile_data)
        
        # Convert to ProfileOut model
        profile_out = ProfileOut.from_orm_with_image(profile)
        
        # Add the email to the profile response
        profile_dict = profile_out.dict()
        profile_dict["email"] = user.email
        return ProfileOut(**profile_dict)

    @staticmethod
    async def update_profile_image_by_user_id(
        db: AsyncSession, user_id: UUID, image_data: bytes
    ) -> dict:
        """Update profile image directly with user_id"""
        profile = await get_profile_repository(db, user_id)
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found, create a profile first"
            )
        
        # Check image size
        if len(image_data) > 5_000_000:  # 5MB limit
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Image too large. Maximum size is 5MB"
            )
            
        await update_profile_image(db, profile.profile_id, image_data)
        return {"message": "Profile image updated successfully"}
    
    @staticmethod
    async def retrieve_profile_by_user_id(db: AsyncSession, user_id: UUID) -> ProfileOut:
        """Get user's profile directly by user ID"""
        profile = await get_profile_repository(db, user_id)
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found"
            )
        return ProfileOut.from_orm_with_image(profile)

    @staticmethod
    async def get_profile(db: AsyncSession, token: str) -> ProfileOut:
        """Get user profile using token"""
        # Get user_id from token
        user_id = await get_user_id_from_token(db, token)
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )
        
        # Get profile using user_id directly
        profile = await get_profile_repository(db, user_id)
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found"
            )
        
        return ProfileOut.from_orm_with_image(profile)

    @staticmethod
    async def reset_password(db: AsyncSession, token: str, new_password: str) -> dict:
        """Reset user password using token authentication"""
        # Check password strength
        if len(new_password) < 8:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 8 characters long"
            )
        
        # Get user from token
        user_id = await get_user_id_from_token(db, token)
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )
        
        # Get user from database
        user = await get_user_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Check if new password is same as current password
        if verify_password(new_password, user.password):  # Changed from user.hashed_password to user.password
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password must be different from current password"
            )
        
        # Update password
        hashed_password = get_password_hash(new_password)
        await update_user_password(db, user_id, hashed_password)
        
        return {"message": "Password updated successfully"}

    @staticmethod
    async def verify_reset_otp(db: AsyncSession, email: str, otp: str) -> dict:
        """Verify reset OTP without changing password"""
        # Find user by email
        user = await get_user_by_email(db, email=email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Verify OTP
        valid_token = await get_valid_reset_token(db, user.user_id, otp)
        if not valid_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired OTP"
            )
        
        return {"message": "OTP verified successfully"}