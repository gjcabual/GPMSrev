from sqlalchemy.ext.asyncio import AsyncSession
from abc import ABC, abstractmethod

class BaseSeeder(ABC):
    """
    Abstract base class for all seeders
    """
    def __init__(self, session: AsyncSession):
        self.session = session  
        
    @abstractmethod
    async def seed(self):
        """Seed the database table"""
        pass
    
    @abstractmethod
    async def clear(self):
        """Clear the database table"""
        pass