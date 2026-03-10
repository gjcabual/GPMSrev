from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SECRET_KEY: str = "92berlnZhU5cIuPgAhixqhakVBYi_oxQKnKmBBAMWmca2JOqTbdAIobII9XVevoZMO90XgNkBa83Qixealwufg"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 360 #6 hours 
    MAX_LOGIN_ATTEMPTS: int = 5
    LOGIN_LOCKOUT_MINUTES: int = 5

settings = Settings()
