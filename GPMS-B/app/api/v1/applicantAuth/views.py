# app\api\v1\applicantAuth\views.py 
from sqlalchemy.orm import Session
from app.api.v1.applicantAuth.controller import UserController
from app.schemas.user import UserCreate, UserOut, VerificationResponse

class UserView:
    @staticmethod
    async def register_user(db: Session, user: UserCreate) -> UserOut:
        return await UserController.register_user(db, user)

    @staticmethod
    async def verify_email(db: Session, email: str, otp: str) -> VerificationResponse:
        """Verify user's email using OTP"""
        return await UserController.verify_email(db, email, otp)

    @staticmethod
    async def resend_verification(db: Session, email: str) -> VerificationResponse:
        """Resend verification email"""
        return await UserController.resend_verification(db, email)