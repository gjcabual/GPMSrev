# app\api\v1\staffAuth\routes.py
from fastapi import APIRouter, Depends, Form
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from app.db.session import get_db
from app.schemas.user import UserOut
from app.schemas.token import LoginResponse  # Changed from Token
from app.services.auth_service import login_for_access_token

router = APIRouter()

@router.post("/login", response_model=LoginResponse)  # Changed from Token
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    return await login_for_access_token(form_data, db, required_role=1)