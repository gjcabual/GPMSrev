from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update
from app.db.models.user import User
from app.schemas.user import UserCreate
import uuid

async def get_user_by_email(db: AsyncSession, email: str):
    result = await db.execute(select(User).filter(User.email == email))
    return result.scalars().first()

async def create_user(db: AsyncSession, user: UserCreate):
    db_user = User(
        email=user.email,
        password=user.password,  # Make sure to hash the password before storing
        role=user.role
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

async def get_user_by_username(db: AsyncSession, username: str):
    result = await db.execute(select(User).filter(User.email == username))
    return result.scalars().first()

async def update_user_password(db: AsyncSession, user_id: uuid.UUID, hashed_password: str):
    """Update user's password"""
    stmt = (
        update(User)
        .where(User.user_id == user_id)
        .values(password=hashed_password)
    )
    await db.execute(stmt)
    await db.commit()
    return True

async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> User:
    """Get user by ID"""
    result = await db.execute(select(User).filter(User.user_id == user_id))
    return result.scalars().first()

async def update_user_email(db: AsyncSession, user_id: uuid.UUID, new_email: str):
    """Update a user's email address"""
    stmt = (
        update(User)
        .where(User.user_id == user_id)
        .values(email=new_email)
    )
    await db.execute(stmt)
    await db.commit()
    return True