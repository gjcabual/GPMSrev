from datetime import datetime, timedelta
from sqlalchemy import select, delete, text
from app.db.seeders.base_seeder import BaseSeeder
from app.db.models.application_status import ApplicationStatus
from app.db.models.application import Application
from app.db.models.sticker import Sticker
from app.db.models.batch_sticker_sessions import BatchStickerSessions
from app.db.models.user import User  # Add this import

class ApplicationStatusSeeder(BaseSeeder):
    async def seed(self):
        print("Seeding application status table...")
        
        # Clear existing records first
        await self.clear()

        # Get applications ordered by date
        applications = await self.session.execute(
            select(Application).order_by(Application.date)
        )
        applications = applications.scalars().all()

        # Get staff users (role=1) to process applications
        staff_users = await self.session.execute(
            select(User).filter(User.role == 1)
        )
        staff_users = staff_users.scalars().all()

        if not applications:
            print("Error: No applications found in database")
            return

        if not staff_users:
            print("Error: No staff users found in database")
            return

        try:
            used_sticker_ids = set()
            status_records = []
            
            for idx, app in enumerate(applications):
                base_date = app.date
                staff_user = staff_users[idx % len(staff_users)]  # Round-robin assignment
                
                # Always create Pending status first (no processor for pending)
                pending_status = ApplicationStatus(
                    application_id=app.application_id,
                    status="Pending",
                    date=base_date,
                    processed_by=None  # Pending status has no processor
                )
                status_records.append(pending_status)

                # Add subsequent status based on index
                if idx < 3:  # First 3: Approved
                    await self._assign_sticker(app, "Graduate/Undergrad Student", used_sticker_ids)
                    status_records.append(
                        ApplicationStatus(
                            application_id=app.application_id,
                            status="Approved",
                            date=base_date + timedelta(days=2),
                            processed_by=staff_user.user_id  # Add processor
                        )
                    )
                elif idx >= 8:  # Last 2: Rejected
                    status_records.append(
                        ApplicationStatus(
                            application_id=app.application_id,
                            status="Rejected",
                            date=base_date + timedelta(days=1),
                            processed_by=staff_user.user_id  # Add processor
                        )
                    )

            # Bulk insert all status records
            self.session.add_all(status_records)
            await self.session.commit()

            # Verify distribution and processors
            print("\nApplication Status Distribution:")
            print(f"First 3 applications: Pending -> Approved (with processor)")
            print(f"Middle 5 applications: Pending only (no processor)")
            print(f"Last 2 applications: Pending -> Rejected (with processor)")

        except Exception as e:
            await self.session.rollback()
            print(f"!! Error in application status seeder: {str(e)}")
            raise

    async def _assign_sticker(self, app, batch_type, used_sticker_ids):
        batch_id = (await self.session.execute(
            select(BatchStickerSessions.batch_id)
            .filter(BatchStickerSessions.type == text("'" + batch_type + "'"))
        )).scalar()

        # Modified part of ApplicationStatusSeeder._assign_sticker
        # Only assign stickers that already exist, don't try to create them
        sticker_query = select(Sticker).filter(
            Sticker.batch_id == batch_id,
            Sticker.plate_no == app.plate_no
        )
        available_sticker = (await self.session.execute(sticker_query)).scalars().first()

        if available_sticker:
            app.sticker_id = available_sticker.id

    async def clear(self):
        print("Clearing application status table...")
        await self.session.execute(delete(ApplicationStatus))
        await self.session.commit()
        print("Application status table cleared!")