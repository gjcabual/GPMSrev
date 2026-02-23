# app\api\v1\applicantAuth\routes.py
from fastapi import APIRouter, Depends, Form, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from datetime import date  # Add this import
from app.db.session import get_db
from app.schemas.user import UserAppCreate, UserVerify, VerificationResponse, ResendVerificationRequest, UserOut, RegistrationResponse, ResendVerificationResponse
from app.schemas.token import LoginResponse 
from app.api.v1.applicantAuth.views import UserView
from app.services.auth_service import login_for_access_token
from app.db.models.profile import Sex  # Add this import

router = APIRouter()

@router.post("/signup", response_model=RegistrationResponse)  # Change response model
async def register(
    email: str = Form(...),
    password: str = Form(...),
    first_name: str = Form(...),
    last_name: str = Form(...),
    birth_date: date = Form(...),
    sex: Sex = Form(None),
    contact_no: str = Form(...),
    address: str = Form(None),  # Changed to None default
    db: Session = Depends(get_db)
):
    """Register a new applicant user with profile"""
    user_data = UserAppCreate(
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
        birth_date=birth_date,
        sex=sex.value if sex else None,
        contact_no=contact_no,
        address=address if address else None  # Handle None case
    )
    return await UserView.register_user(db, user_data)

@router.post("/verify-email", response_model=VerificationResponse)
async def verify_email(
    email: str = Form(...),
    otp: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Verify user's email address using OTP
    Returns:
        - Status of verification
        - Access token for immediate login
        - User's full name
    """
    try:
        return await UserView.verify_email(db, email, otp)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/resend-verification", response_model=ResendVerificationResponse)
async def resend_verification(
    email: str = Form(...),
    db: Session = Depends(get_db)
):
    """Resend verification email"""
    return await UserView.resend_verification(db, email)

@router.post("/login", response_model=LoginResponse)  
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    return await login_for_access_token(form_data, db, required_role=2)