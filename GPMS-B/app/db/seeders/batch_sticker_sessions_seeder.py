from datetime import datetime
from sqlalchemy import delete, select
from app.db.seeders.base_seeder import BaseSeeder
from app.db.models.batch_sticker_sessions import BatchStickerSessions

class BatchStickerSessionsSeeder(BaseSeeder):
    async def seed(self):
        print("Seeding batch sticker sessions table...")
        
        try:
            
            current_datetime = datetime.now()
            
            batch_sessions = [
                BatchStickerSessions(
                    type="Student",
                    start_at=1001,
                    end_at=1999,
                    price=50,
                    created_at=current_datetime 
                ),
                BatchStickerSessions(
                    type="Employee Parking",
                    start_at=1001,
                    end_at=1999,
                    price=50,
                    created_at=current_datetime
                ),
                BatchStickerSessions(
                    type="Drop Off",
                    start_at=1001,
                    end_at=1999,
                    price=50,
                    created_at=current_datetime
                ),
                BatchStickerSessions(
                    type="Concessionaire",
                    start_at=1001,
                    end_at=1999,
                    price=100,
                    created_at=current_datetime
                )
            ]
            
            # Add batch sessions to session
            for batch in batch_sessions:
                self.session.add(batch)
            
            # Commit to database
            await self.session.commit()
            
            # Verify seeding
            result = await self.session.execute(select(BatchStickerSessions))
            seeded_batches = result.scalars().all()
            if len(seeded_batches) == len(batch_sessions):
                print("Batch sticker sessions seeding complete!")
            else:
                print("Warning: Not all batch sessions were seeded correctly")
                
        except Exception as e:
            await self.session.rollback()
            print(f"Error seeding batch sticker sessions: {str(e)}")
            raise

    async def clear(self):
        print("Clearing batch sticker sessions table...")
        try:
            await self.session.execute(delete(BatchStickerSessions))
            await self.session.commit()
            print("Batch sticker sessions table cleared!")
        except Exception as e:
            await self.session.rollback()
            print(f"Error clearing batch sticker sessions: {str(e)}")
            raise