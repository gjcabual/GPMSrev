from pydantic import BaseModel
from datetime import datetime

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    username: str | None = None

class TokenInDB(BaseModel):
    token_id: int
    token: str
    refresh_token: str
    created_at: datetime
    expired_at: datetime
    user_id: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    full_name: str