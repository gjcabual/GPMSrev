from fastapi import APIRouter, Depends, Form, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from app.db.session import get_db
from app.schemas.user import UserCreate, UserOut
from fastapi.responses import JSONResponse
from app.schemas.token import Token, LoginResponse
from app.api.v1.adminAuth.views import UserView
from app.services.auth_service import login_for_access_token
from app.utils.email import send_email
from app.schemas.user import UserInDB
from app.core.security import get_current_admin
import random
import string
from datetime import date
from app.schemas.staff import StaffCreate, StaffRegistrationResponse, Sex


router = APIRouter()

def generate_random_password(length: int = 12) -> str:
    characters = string.ascii_letters + string.digits + string.punctuation
    return ''.join(random.choice(characters) for i in range(length))

@router.post("/register", response_model=StaffRegistrationResponse)
async def register(
    first_name: str = Form(...),
    last_name: str = Form(...),
    email: str = Form(...),
    contact_no: str = Form(...),
    birth_date: date = Form(...),
    sex: Sex = Form(...),
    address: str = Form(...),
    current_user: UserInDB = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    password = generate_random_password()
    
    staff_data = StaffCreate(
        email=email,
        first_name=first_name,
        last_name=last_name,
        contact_no=contact_no,
        birth_date=birth_date,
        sex=sex,
        address=address
    )
    
    response = await UserView.register_staff(db, staff_data, password)
    send_email(email, password)
    
    return response

@router.post("/login", response_model=LoginResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db)
):
    return await login_for_access_token(form_data, db, required_role=0)