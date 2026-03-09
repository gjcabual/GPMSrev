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
    now = datetime.now()
    user = await get_user_by_email(db, email=form_data.username)
    if user and user.lock_until and user.lock_until > now:
        remaining_minutes = max(
            1, int((user.lock_until - now).total_seconds() // 60) + 1
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed login attempts. Try again in {remaining_minutes} minute(s).",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user or not verify_password(form_data.password, user.password):
        if user:
            next_attempts = (user.failed_login_attempts or 0) + 1
            lock_until = None
            remaining_attempts = max(0, settings.MAX_LOGIN_ATTEMPTS - next_attempts)
            detail = (
                f"Incorrect username or password. {remaining_attempts} attempt(s) remaining."
            )

            if next_attempts >= settings.MAX_LOGIN_ATTEMPTS:
                lock_until = now + timedelta(minutes=settings.LOGIN_LOCKOUT_MINUTES)
                next_attempts = 0
                detail = (
                    f"Attempt {settings.MAX_LOGIN_ATTEMPTS}/{settings.MAX_LOGIN_ATTEMPTS}. "
                    f"Too many failed login attempts. Account locked for "
                    f"{settings.LOGIN_LOCKOUT_MINUTES} minutes."
                )

            user.failed_login_attempts = next_attempts
            user.lock_until = lock_until
            await db.commit()

            raise HTTPException(
                status_code=(
                    status.HTTP_429_TOO_MANY_REQUESTS
                    if lock_until is not None
                    else status.HTTP_401_UNAUTHORIZED
                ),
                detail=detail,
                headers={"WWW-Authenticate": "Bearer"},
            )

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

    # Successful login: reset lockout counters.
    if (user.failed_login_attempts or 0) != 0 or user.lock_until is not None:
        user.failed_login_attempts = 0
        user.lock_until = None
        await db.commit()
    
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
