from sqlalchemy import delete, select, text
from app.db.seeders.base_seeder import BaseSeeder
from app.db.models.sticker import Sticker
from app.db.models.application import Application
from app.db.models.application_status import ApplicationStatus
from app.db.models.batch_sticker_sessions import BatchStickerSessions
from datetime import datetime
import random

class StickerSeeder(BaseSeeder):
    async def seed(self):
        print("Seeding stickers table...")
        await self.clear()

        # Get all batches first
        batch_query = """
            SELECT * FROM batch_sticker_sessions_tbl
            ORDER BY batch_id
        """
        batches = await self.session.execute(text(batch_query))
        batches = batches.all()

        if not batches:
            print("Error: No batch sessions found")
            return

        # Get BOTH APPROVED AND PENDING applications with their latest status
        latest_status_query = """
            WITH LatestStatus AS (
                SELECT 
                    application_id,
                    status,
                    ROW_NUMBER() OVER (PARTITION BY application_id ORDER BY date DESC, status_id DESC) as rn
                FROM application_status_tbl
            )
            SELECT 
                a.*,
                ls.status
            FROM applications_tbl a
            JOIN LatestStatus ls ON a.application_id = ls.application_id
            WHERE ls.rn = 1 
            AND ls.status IN ('Approved', 'Pending')
            ORDER BY a.date;
        """

        applications = await self.session.execute(text(latest_status_query))
        applications = applications.all()
        
        if not applications:
            print("No approved or pending applications found for sticker assignment")
            return

        try:
            stickers = []
            approved_count = 0
            pending_count = 0
            # Use local system datetime
            current_year = str(datetime.now().year)[-2:]
            
            for app in applications:
                # Count by status
                if app.status == 'Approved':
                    approved_count += 1
                else:
                    pending_count += 1
                
                # Get matching batch types for this application's role
                matching_batches = [b for b in batches if b.type.lower() in app.role.lower()]
                
                if not matching_batches:
                    print(f"Warning: No matching batch type for application {app.application_id} ({app.role})")
                    continue

                # Randomly select a batch from matching ones
                selected_batch = random.choice(matching_batches)
                
                # Generate sticker number within batch range
                sticker_number = random.randint(selected_batch.start_at, selected_batch.end_at)
                sticker_id = f"{current_year}-{sticker_number:04d}"

                sticker = Sticker(
                    sticker_id=sticker_id,
                    batch_id=selected_batch.batch_id,
                    plate_no=app.plate_no
                )
                stickers.append(sticker)
                
                self.session.add(sticker)
                await self.session.flush()
                
                # Update application with sticker ID
                await self.session.execute(
                    text(f"UPDATE applications_tbl SET sticker_id = {sticker.id} "
                         f"WHERE application_id = {app.application_id}")
                )

            await self.session.commit()

            print("\nSticker Assignment Summary:")
            print(f"Total stickers assigned: {len(stickers)}")
            print(f"  - For Approved applications: {approved_count}")
            print(f"  - For Pending applications: {pending_count}")
            
            for batch in batches:
                batch_stickers = [s for s in stickers if s.batch_id == batch.batch_id]
                if batch_stickers:
                    print(f"\nBatch {batch.batch_id} ({batch.type}):")
                    print(f"Total assigned: {len(batch_stickers)}")
                    print(f"Sample sticker ID: {batch_stickers[0].sticker_id}")

        except Exception as e:
            await self.session.rollback()
            print(f"Error creating stickers: {str(e)}")
            raise

    async def clear(self):
        print("Clearing stickers table...")
        await self.session.execute(delete(Sticker))
        await self.session.commit()
        print("Stickers table cleared!")