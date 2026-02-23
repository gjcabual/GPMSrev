# app\api\v1\applicantAuth\controller.py 
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.core.security import get_password_hash
from app.db.repositories.user import get_user_by_email, create_user
from app.schemas.user import UserOut, UserAppCreate, VerificationResponse, RegistrationResponse,ResendVerificationResponse 
from app.utils.email import send_verification_email
from app.db.repositories.token import create_verification_token, verify_user_email
from app.db.models.profile import Profile, Sex
from app.db.models.user import User  
import secrets
from datetime import timedelta
from app.core.security import create_access_token
from app.core.config import settings
from fastapi.responses import JSONResponse
from sqlalchemy import select
from datetime import datetime
from app.db.repositories.token import create_token 

class UserController:
    @staticmethod
    async def register_user(db: Session, user: UserAppCreate) -> RegistrationResponse:
        # Check for existing email
        db_user = await get_user_by_email(db, email=user.email)
        if db_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        try:
            # Create user with verified_at as None
            new_user = User(
                email=user.email,
                password=get_password_hash(user.password),
                role=user.role,
                verified_at=None  # Explicitly set as unverified
            )
            db.add(new_user)
            await db.flush()

            # Create profile
            profile = Profile(
                user_id=new_user.user_id,
                first_name=user.first_name,
                last_name=user.last_name,
                birth_date=user.birth_date,
                sex=user.sex,
                contact_no=user.contact_no,
                address=user.address
            )
            db.add(profile)

            # Generate and store verification token with OTP
            otp = ''.join(secrets.choice('0123456789') for _ in range(6))
            expires_at = datetime.now() + timedelta(minutes=15) 
            token = await create_verification_token(db, new_user.user_id, otp, expires_at, commit=False)
            
            # Send verification email before committing - rollback if it fails
            email_sent = await send_verification_email(user.email, otp)
            if not email_sent:
                await db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to send verification email"
                )
            
            await db.commit()
            
            # Return new response format
            return RegistrationResponse(
                message="Registration successful. Please check your email for the verification code.",
                status=True,
                email=user.email
            )

        except Exception as e:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error creating user: {str(e)}"
            )

    @staticmethod
    async def verify_email(db: Session, email: str, otp: str) -> VerificationResponse:
        try:
            # Get user by email
            user = await get_user_by_email(db, email)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            # Debug: Get the token directly
            from app.db.models.token import Token
            from sqlalchemy import and_
            
            debug_query = select(Token).where(
                and_(
                    Token.user_id == user.user_id,
                    Token.token_type == "verification"
                )
            ).order_by(Token.created_at.desc())
            
            debug_result = await db.execute(debug_query)
            debug_token = debug_result.scalar_one_or_none()
            
            print("==== DEBUG INFO ====")
            print(f"Current time: {datetime.now()}")
            print(f"Provided OTP: {otp}")
            
            if debug_token:
                print(f"Token in DB: {debug_token.token}")
                print(f"Token type: {debug_token.token_type}")
                print(f"Created at: {debug_token.created_at}")
                print(f"Expires at: {debug_token.expired_at}")
                print(f"Is expired: {debug_token.expired_at < datetime.now()}")
                print(f"OTP match: {debug_token.token == otp}")
            else:
                print("No verification token found")
            
            # Continue with normal verification
            verification_result = await verify_user_email(db, user.user_id, otp)
            if not verification_result:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid or expired verification code"
                )

            # Get user profile
            result = await db.execute(
                select(Profile).where(Profile.user_id == user.user_id)
            )
            profile = result.scalar_one_or_none()
            if not profile:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Profile not found"
                )

            # Create access token
            access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
            access_token = create_access_token(
                data={"sub": user.email, "role": user.role},
                expires_delta=access_token_expires
            )

            # Create token in database
            token_data = {
                "token": access_token,
                "refresh_token": "",
                "created_at": datetime.now(),
                "expired_at": datetime.now() + access_token_expires,
                "token_type": "access",
                "user_id": user.user_id
            }
            await create_token(db, token_data)

            # Return successful response with token and full name
            return VerificationResponse(
                message="Email verified successfully",
                status=True,
                access_token=access_token,
                token_type="bearer",
                full_name=f"{profile.first_name} {profile.last_name}"
            )

        except HTTPException as http_ex:
            # Re-raise HTTP exceptions
            raise http_ex
        except Exception as e:
            # Log the error here if you have logging set up
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Verification failed: {str(e)}"
            )

    @staticmethod
    async def resend_verification(db: Session, email: str) -> ResendVerificationResponse:
        user = await get_user_by_email(db, email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
            
        if user.verified_at:
            return ResendVerificationResponse(
                message="Email already verified",
                status=False
            )
            
        # Create new verification token
        otp = ''.join(secrets.choice('0123456789') for _ in range(6))
        expires_at = datetime.now() + timedelta(minutes=15)
        token = await create_verification_token(db, user.user_id, otp, expires_at)
        
        # Send verification email - use the OTP directly
        await send_verification_email(email, otp)
        
        return ResendVerificationResponse(
            message="A new verification code has been sent to your email",
            status=True
        )