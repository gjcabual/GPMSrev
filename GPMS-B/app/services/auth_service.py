# app\services\auth_service.py 
from datetime import timedelta, datetime
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import select, delete
from app.core.security import verify_password, create_access_token
from app.db.repositories.user import get_user_by_email
from app.db.repositories.token import create_token
from app.schemas.token import LoginResponse
from app.core.config import settings
from app.db.models.profile import Profile
from app.db.models.token import Token as TokenModel

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def login_for_access_token(form_data: OAuth2PasswordRequestForm, db: Session, required_role: int):
    user = await get_user_by_email(db, email=form_data.username)
    if not user or not verify_password(form_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verification check only for applicant role (role=2)
    if user.role == 2 and not user.verified_at:  # Only check verification for applicants
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Please verify your email before logging in",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check user role
    if user.role != required_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have the required role",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Delete existing tokens for this user
    delete_query = delete(TokenModel).where(TokenModel.user_id == user.user_id)
    await db.execute(delete_query)
    await db.commit()
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role}, expires_delta=access_token_expires
    )
    
    # Get user profile information using async query
    query = select(Profile).where(Profile.user_id == user.user_id)
    result = await db.execute(query)
    profile = result.scalar_one_or_none()
    full_name = f"{profile.first_name} {profile.last_name}" if profile else None
    
    # Get current date information using local device time
    current_time = datetime.now()  # Changed from datetime.utcnow()
    day_of_week = current_time.strftime("%A")
    current_date = current_time.strftime("%Y-%m-%d")
    
    # Save the token in the database
    token_data = {
        "token": access_token,
        "refresh_token": "",  
        "created_at": current_time,
        "expired_at": current_time + access_token_expires,
        "token_type": "access",  
        "user_id": user.user_id
    }
    await create_token(db, token_data)
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        full_name=full_name,
        day_of_week=day_of_week,
        date=current_date
    )