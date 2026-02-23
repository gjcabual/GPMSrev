from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from passlib.context import CryptContext
from datetime import datetime, timedelta
from app.schemas.user import UserInDB
from app.core.config import settings
from app.db.repositories.user import get_user_by_username
from app.db.repositories.token import get_token_by_value
from app.schemas.token import TokenData
from app.db.session import get_db

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    
    # Check if the token exists in the database
    db_token = await get_token_by_value(db, token)
    if db_token is None:
        raise credentials_exception
    
    user = await get_user_by_username(db, username=token_data.username)
    if user is None:
        raise credentials_exception
    return user

async def get_current_applicant(current_user: UserInDB = Depends(get_current_user)):
    if current_user.role != 2:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have applicant privileges",
        )
    return current_user

async def get_current_staff(current_user: UserInDB = Depends(get_current_user)):
    if current_user.role != 1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have staff privileges",
        )
    return current_user

async def get_current_admin(current_user: UserInDB = Depends(get_current_user)):
    if current_user.role != 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have admin privileges",
        )
    return current_user

async def get_current_staff_or_admin(current_user: UserInDB = Depends(get_current_user)):
    if current_user.role not in [0, 1]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have staff or admin privileges",
        )
    return current_user