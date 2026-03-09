from fastapi import APIRouter, Depends, Form, File, UploadFile, HTTPException, status, Response
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.api.v1.commonAuth.views import CommonAuthView
from app.schemas.profile import ProfileUpdate, ProfileOut
from app.schemas.user import UserInDB
from app.core.security import get_current_user
from app.db.repositories.profile import get_profile_by_user_id as get_profile_repository  
from app.db.repositories.profile import get_profile_by_id 
from typing import Optional
from datetime import date
from fastapi.responses import Response, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import io
from app.schemas.profile import ProfileUpdateResponse, SuccessResponse

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

@router.post("/logout")
async def logout(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    return await CommonAuthView.logout_user(db, token)

@router.post("/forgot-password", response_model=dict)
async def request_password_reset(
    email: str = Form(...),
    db: AsyncSession = Depends(get_db)
):
    """Request a password reset OTP for forgotten password"""
    return await CommonAuthView.request_password_reset(db, email)

@router.post("/verify-reset-password", response_model=dict)
async def verify_and_reset_password(
    email: str = Form(...),
    otp: str = Form(...),
    new_password: str = Form(...),
    db: AsyncSession = Depends(get_db)
):
    """Verify OTP and reset password"""
    return await CommonAuthView.reset_password(db, email, otp, new_password)

@router.post("/reset-password")
async def reset_password(
    new_password: str = Form(...),
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
):
    """Reset password using user's authentication token"""
    return await CommonAuthView.reset_password(db, token, new_password)

# Step 1: Request OTP by providing email
@router.post("/forgot-password/request-otp", response_model=dict)
async def request_password_reset_otp(
    email: str = Form(...),
    db: AsyncSession = Depends(get_db)
):
    """Step 1: Request OTP for password reset"""
    return await CommonAuthView.request_password_reset(db, email)

# Step 2: Verify OTP
@router.post("/forgot-password/verify-otp", response_model=dict)
async def verify_reset_otp(
    email: str = Form(...),
    otp: str = Form(...),
    db: AsyncSession = Depends(get_db)
):
    """Step 2: Verify the OTP code"""
    return await CommonAuthView.verify_reset_otp(db, email, otp)

# Step 3: Set new password
@router.post("/forgot-password/reset-password", response_model=dict)
async def set_new_password(
    email: str = Form(...),
    otp: str = Form(...),
    new_password: str = Form(...),
    db: AsyncSession = Depends(get_db)
):
    """Step 3: Set new password after OTP verification"""
    return await CommonAuthView.verify_otp_and_reset_password(db, email, otp, new_password)


@router.put("/update-profile", response_model=SuccessResponse)
async def update_profile(
    first_name: Optional[str] = Form(None),
    last_name: Optional[str] = Form(None),
    birth_date: Optional[date] = Form(None),
    sex: Optional[str] = Form(None),
    contact_no: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    current_user: UserInDB = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    """Update user profile information using form data"""
    profile_data_dict = {
        "first_name": first_name,
        "last_name": last_name,
        "birth_date": birth_date,
        "sex": sex,
        "contact_no": contact_no,
        "address": address
    }
    profile_data_dict = {k: v for k, v in profile_data_dict.items() if v is not None}
    profile_data = ProfileUpdate(**profile_data_dict)
    
 
    await CommonAuthView.update_profile_by_user_id(db, current_user.user_id, profile_data)
    
    if image:
        if not image.content_type.startswith("image/"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File uploaded is not an image"
            )
        image_data = await image.read()
        await CommonAuthView.update_profile_image_by_user_id(db, current_user.user_id, image_data)
    
    return SuccessResponse(message="Profile has been updated successfully")

@router.get("/profile", response_model=ProfileOut)
async def get_profile(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
):
    """Get current user's profile with email"""
    # Get the current user to access their email
    current_user = await get_current_user(token=token, db=db)
    
    # Get profile data
    profile = await CommonAuthView.get_profile(db, token)
    
    # Add email to the profile response
    if hasattr(profile, "__dict__"):
        profile_dict = profile.__dict__
        profile_dict["email"] = current_user.email
        return profile_dict
    else:
        # If profile is a Pydantic model, create a copy with email added
        profile_data = profile.dict()
        profile_data["email"] = current_user.email
        return ProfileOut(**profile_data)

# Image handling endpoints
@router.put("/profile/image")
async def upload_profile_image(
    image: UploadFile = File(...),
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
):
    """Upload profile image"""
    if not image.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File uploaded is not an image"
        )
    
    image_data = await image.read()
    return await CommonAuthView.update_profile_image(db, token, image_data)

@router.get("/profile/image", response_class=Response)
async def get_profile_image(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
):
    """Get profile image"""
    image_data, content_type = await CommonAuthView.get_profile_image(db, token)
    
    if not image_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile image not found"
        )
    
    return Response(content=image_data, media_type=content_type or "image/jpeg")

@router.get("/profile/image/{profile_id}")
async def get_profile_image_by_id(
    profile_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get profile image by profile ID"""
    profile = await get_profile_by_id(db, profile_id) 
    if not profile or not profile.image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found"
        )
    
    return Response(
        content=profile.image,
        media_type="image/jpeg",
        headers={
            "Content-Type": "image/jpeg",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "max-age=3600"
        }
    )


@router.post("/profile/email/change/request", response_model=dict)
async def request_email_change(
    new_email: str = Form(...),
    current_password: str = Form(...),
    current_user: UserInDB = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await CommonAuthView.request_email_change(
        db, current_user.user_id, new_email, current_password
    )


@router.post("/profile/email/change/resend", response_model=dict)
async def resend_email_change_otp(
    current_user: UserInDB = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await CommonAuthView.resend_email_change_otp(db, current_user.user_id)


@router.post("/profile/email/change/verify", response_model=dict)
async def verify_email_change(
    otp_code: str = Form(...),
    current_user: UserInDB = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await CommonAuthView.verify_email_change(db, current_user.user_id, otp_code)
