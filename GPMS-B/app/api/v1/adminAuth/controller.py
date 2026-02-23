# app\api\v1\adminAuth\controller.py 
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.core.security import get_password_hash
from app.db.repositories.user import get_user_by_email, create_user
from app.schemas.user import UserCreate, UserOut

class UserController:
    @staticmethod
    async def register_user(db: Session, user: UserCreate) -> UserOut:
        db_user = await get_user_by_email(db, email=user.email)
        if db_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        user.password = get_password_hash(user.password)
        new_user = await create_user(db, user)
        return UserOut.from_orm(new_user)