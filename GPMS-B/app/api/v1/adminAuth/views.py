# app\api\v1\adminAuth\views.py 
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from fastapi.responses import JSONResponse
from app.api.v1.adminAuth.controller import UserController
from app.schemas.user import UserCreate, UserOut, UserRole
from app.schemas.staff import StaffCreate, StaffResponse
from app.db.models.user import User
from app.db.models.profile import Profile
from app.core.security import get_password_hash
from app.db.repositories.user import get_user_by_email

class UserView:
    @staticmethod
    async def register_user(db: Session, user: UserCreate) -> UserOut:
        return await UserController.register_user(db, user)

    @staticmethod
    async def register_staff(db: Session, staff_data: StaffCreate, password: str) -> JSONResponse:
        # Check if email already exists
        existing_user = await get_user_by_email(db, email=staff_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        try:
            # Create user first
            user = User(
                email=staff_data.email,
                role=UserRole.STAFF,
                password=get_password_hash(password) 
            )
            db.add(user)
            await db.flush()

            # Create profile
            profile = Profile(
                user_id=user.user_id,
                first_name=staff_data.first_name,
                last_name=staff_data.last_name,
                contact_no=staff_data.contact_no,
                birth_date=staff_data.birth_date,
                sex=staff_data.sex,
                address=staff_data.address
            )
            db.add(profile)
            await db.commit()

            return JSONResponse(
                status_code=status.HTTP_201_CREATED,
                content={"message": f"Staff account {staff_data.email} has been created successfully."}
            )

        except Exception as e:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"An error occurred while registering staff: {str(e)}"
            )