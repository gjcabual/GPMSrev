from sqlalchemy.ext.asyncio import AsyncSession
from app.db.repositories.token import delete_token
from app.db.repositories.user import get_user_by_email
from app.api.v1.commonAuth.controller import CommonAuthController
from app.schemas.profile import ProfileUpdate, ProfileOut
from typing import Optional, Tuple, Dict
from uuid import UUID

class CommonAuthView:
    @staticmethod
    async def logout_user(db: AsyncSession, token: str):
        """Handle user logout by invalidating their token"""
        await delete_token(db, token)
        return {"msg": "Successfully logged out"}
    
    @staticmethod
    async def request_password_reset(db: AsyncSession, email: str):
        """Request password reset OTP"""
        return await CommonAuthController.request_password_reset(db, email)
    
    @staticmethod
    async def reset_password(db: AsyncSession, email: str, otp: str, new_password: str):
        """Alias for verify_otp_and_reset_password"""
        return await CommonAuthView.verify_otp_and_reset_password(db, email, otp, new_password)
    
    @staticmethod
    async def update_profile(db: AsyncSession, token: str, profile_data: ProfileUpdate):
        """Update user profile information"""
        return await CommonAuthController.update_profile(db, token, profile_data)
    
    @staticmethod
    async def get_profile(db: AsyncSession, token: str) -> ProfileOut:
        """Get current user's profile using token"""
        return await CommonAuthController.get_profile(db, token)
    
    @staticmethod
    async def update_profile_image(db: AsyncSession, token: str, image_data: bytes):
        """Update profile image"""
        return await CommonAuthController.update_profile_image(db, token, image_data)
    
    @staticmethod
    async def get_profile_image(db: AsyncSession, token: str) -> Tuple[Optional[bytes], Optional[str]]:
        """Get profile image data and content type"""
        return await CommonAuthController.get_profile_image(db, token)

    @staticmethod
    async def update_profile_by_user_id(
        db: AsyncSession, 
        user_id: UUID, 
        profile_data: ProfileUpdate
    ) -> ProfileOut:
        """Update user profile information directly by user ID"""
        return await CommonAuthController.update_profile_by_user_id(db, user_id, profile_data)
    
    @staticmethod
    async def update_profile_image_by_user_id(
        db: AsyncSession, 
        user_id: UUID, 
        image_data: bytes
    ) -> Dict[str, str]:
        """Update profile image directly by user ID"""
        return await CommonAuthController.update_profile_image_by_user_id(db, user_id, image_data)
    
    @staticmethod
    async def get_profile_by_user_id(db: AsyncSession, user_id: UUID) -> ProfileOut:
        """Get user profile directly by user ID"""
        return await CommonAuthController.retrieve_profile_by_user_id(db, user_id)

    @staticmethod
    async def reset_password(db: AsyncSession, token: str, new_password: str):
        """Reset password using token authentication"""
        return await CommonAuthController.reset_password(db, token, new_password)

    @staticmethod
    async def verify_reset_otp(db: AsyncSession, email: str, otp: str) -> dict:
        """Verify OTP without changing password"""
        return await CommonAuthController.verify_reset_otp(db, email, otp)

    @staticmethod
    async def verify_otp_and_reset_password(
        db: AsyncSession, 
        email: str, 
        otp: str, 
        new_password: str
    ) -> dict:
        """Reset password with OTP verification"""
        return await CommonAuthController.verify_otp_and_reset_password(
            db, email, otp, new_password
        )

    @staticmethod
    async def request_email_change(
        db: AsyncSession, user_id: UUID, new_email: str, current_password: str
    ) -> dict:
        return await CommonAuthController.request_email_change(
            db, user_id, new_email, current_password
        )

    @staticmethod
    async def resend_email_change_otp(db: AsyncSession, user_id: UUID) -> dict:
        return await CommonAuthController.resend_email_change_otp(db, user_id)

    @staticmethod
    async def verify_email_change(db: AsyncSession, user_id: UUID, otp_code: str) -> dict:
        return await CommonAuthController.verify_email_change(db, user_id, otp_code)
