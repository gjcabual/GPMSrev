# app\db\repositories\token.py 
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, and_, delete
from app.db.models.token import Token as TokenModel
from datetime import datetime, date, timedelta
import uuid
import secrets
from app.db.models.user import User
from sqlalchemy.orm import Session

async def create_token(db: AsyncSession, token_data: dict):
    db_token = TokenModel(**token_data)
    db.add(db_token)
    await db.commit()
    await db.refresh(db_token)
    return db_token

async def delete_token(db: AsyncSession, token: str):
    result = await db.execute(select(TokenModel).filter(TokenModel.token == token))
    db_token = result.scalars().first()
    if (db_token):
        await db.delete(db_token)
        await db.commit()


async def delete_all_tokens_by_user_id(db: AsyncSession, user_id: uuid.UUID):
    await db.execute(delete(TokenModel).where(TokenModel.user_id == user_id))
    await db.commit()

async def get_token_by_value(db: AsyncSession, token: str):
    result = await db.execute(select(TokenModel).filter(TokenModel.token == token))
    return result.scalars().first()

async def create_reset_token(db: AsyncSession, user_id: uuid.UUID, otp: str, expires_at: date):
    """Create a password reset token"""
    token_data = {
        "token": otp,
        "refresh_token": "",  # Not needed for reset tokens
        "created_at": datetime.now().date(),
        "expired_at": expires_at,
        "token_type": "reset",
        "user_id": user_id
    }
    return await create_token(db, token_data)

async def get_valid_reset_token(db: AsyncSession, user_id: uuid.UUID, otp: str):
    """Get valid reset token"""
    result = await db.execute(
        select(TokenModel).where(
            and_(
                TokenModel.user_id == user_id,
                TokenModel.token == otp,
                TokenModel.token_type == "reset",
                TokenModel.expired_at >= datetime.now().date()
            )
        )
    )
    return result.scalars().first()

async def delete_used_reset_token(db: AsyncSession, token_id: int):
    """Delete a reset token after use"""
    stmt = delete(TokenModel).where(TokenModel.token_id == token_id)
    await db.execute(stmt)
    await db.commit()

async def get_user_id_from_token(db: AsyncSession, token: str):
    """Get user ID from an authentication token"""
    result = await db.execute(
        select(TokenModel.user_id).where(
            and_(
                TokenModel.token == token,
                TokenModel.expired_at >= datetime.now().date(),
                TokenModel.token_type == "access"  # Assuming "access" is your authentication token type
            )
        )
    )
    return result.scalar_one_or_none()

# Change these in create_verification_token
async def create_verification_token(db: AsyncSession, user_id: uuid.UUID, token: str, expires_at: datetime, *, commit: bool = True):
    """Create an email verification token. Set commit=False to let caller commit after email is sent."""
    current_time = datetime.now()
    
    if expires_at <= current_time or (isinstance(expires_at, datetime) and expires_at.tzinfo != current_time.tzinfo):
        expires_at = current_time + timedelta(minutes=15)
    
    new_token = TokenModel(
        user_id=user_id,
        token=token,
        refresh_token="",
        created_at=current_time,
        expired_at=expires_at,
        token_type="verification"
    )
    db.add(new_token)
    if commit:
        await db.commit()
    else:
        await db.flush()
    return new_token

# Change these in get_valid_verification_token
async def get_valid_verification_token(db: AsyncSession, user_id: uuid.UUID, token: str):
    query = (
        select(TokenModel)
        .where(
            and_(
                TokenModel.user_id == user_id,
                TokenModel.token == token,
                TokenModel.token_type == "verification",
                TokenModel.expired_at >= datetime.now()  
            )
        )
    )
    result = await db.execute(query)
    return result.scalar_one_or_none()

# Change these in create_email_otp_token
async def create_email_otp_token(db: AsyncSession, user_id: uuid.UUID, otp: str = None) -> TokenModel:
    """Create a verification token for email verification"""
    # Delete any existing verification tokens for this user
    await db.execute(
        delete(TokenModel).where(
            and_(
                TokenModel.user_id == user_id,
                TokenModel.token_type == "verification"
            )
        )
    )
    
    # If no OTP provided, generate one
    if not otp:
        otp = ''.join(secrets.choice('0123456789') for _ in range(6))
    
    current_time = datetime.now()  # Changed from utcnow
    
    # Create new token
    token = TokenModel(
        token=otp,
        refresh_token="",
        created_at=current_time,
        expired_at=current_time + timedelta(days=1),
        token_type="verification",
        user_id=user_id
    )
    
    db.add(token)
    await db.commit()
    await db.refresh(token)
    
    return token

# Change these in verify_user_email
async def verify_user_email(db: Session, user_id: uuid.UUID, otp: str) -> bool:
    """Verify user's email using OTP"""
    current_time = datetime.now()  # Changed from utcnow
    
    # Find token in database
    result = await db.execute(
        select(TokenModel)
        .filter(
            and_(
                TokenModel.user_id == user_id,
                TokenModel.token == otp,
                TokenModel.token_type == "verification"
            )
        )
    )
    token_record = result.scalar_one_or_none()
    
    if not token_record:
        return False
        
    if token_record.expired_at < current_time:  # Compare full datetimes
        await db.delete(token_record)
        await db.commit()
        return False
    
    # Get and update user
    result = await db.execute(
        select(User).filter(User.user_id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        return False
    
    # Update user's verification status
    user.verified_at = datetime.now()  # Changed from utcnow
    
    # Delete used token
    await db.delete(token_record)
    await db.commit()
    
    return True

async def delete_used_token(db: AsyncSession, token_id: int):
    """Delete a token after it has been used"""
    stmt = delete(TokenModel).where(TokenModel.token_id == token_id)
    await db.execute(stmt)
    await db.commit()
