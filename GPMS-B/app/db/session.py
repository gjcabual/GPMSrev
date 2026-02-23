from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv


# Load environment variables
load_dotenv()

DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

DATABASE_URL = f"postgresql+asyncpg://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Create an async engine
engine = create_async_engine(DATABASE_URL, echo=True)

# Create an async session
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# Dependency to get the session
async def get_db():
    async with async_session() as session:
        yield session
