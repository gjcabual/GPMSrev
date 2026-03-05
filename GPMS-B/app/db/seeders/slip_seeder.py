from datetime import date, timedelta
from sqlalchemy import delete, select, text
from app.db.seeders.base_seeder import BaseSeeder
from app.db.models.slip import Slip
from app.db.models.application import Application
from app.db.models.application_status import ApplicationStatus
from app.db.models.user import User
from app.db.models.sticker import Sticker
import random

class SlipSeeder(BaseSeeder):
    async def seed(self):
        print("Seeding slips table...")
        
        # Clear existing slips first
        await self.clear()
        
        try:
            role_price_map = {
                "Student": 50,
                "Employee Parking": 50,
                "Drop Off": 50,
                "Concessionaire": 100,
            }

            # Get approved and pending applications using a direct SQL query
            query = """
            WITH LatestStatus AS (
                SELECT 
                    application_id,
                    status,
                    ROW_NUMBER() OVER (PARTITION BY application_id ORDER BY date DESC) as rn
                FROM application_status_tbl
            )
            SELECT 
                a.*
            FROM applications_tbl a
            JOIN LatestStatus ls ON a.application_id = ls.application_id
            WHERE ls.rn = 1 
            AND ls.status IN ('Approved', 'Pending')
            ORDER BY a.date;
            """
            
            result = await self.session.execute(text(query))
            eligible_apps = result.all()
            
            if not eligible_apps:
                print("Error: No eligible applications found in database")
                return
            
            today = date.today()
            slips = []
            
            # Create slips for each eligible application
            for app in eligible_apps:
                # Generate an official receipt number in format XXXX-XXXXXXXXXXXX
                prefix = f"{random.randint(1000, 9999)}"
                suffix = f"{random.randint(100000000000, 999999999999)}"
                receipt_num = f"{prefix}-{suffix}"
                
                slip = Slip(
                    total_amount=role_price_map.get(getattr(app, "role", None), 50),
                    nature_of_payment="New Application Fee",
                    date=today - timedelta(days=3),
                    user_id=app.user_id,
                    official_receipt=receipt_num  # Add the official receipt number
                )
                slips.append(slip)
                
                # Add to session
                self.session.add(slip)
                await self.session.flush()
                
                # Update application with slip_id
                await self.session.execute(
                    text(f"UPDATE applications_tbl SET slip_id = {slip.slip_id} "
                         f"WHERE application_id = {app.application_id}")
                )
            
            # Commit all changes
            await self.session.commit()
            
            print("\nSlip Assignment Summary:")
            print(f"Total Slips Created: {len(slips)}")
            print(f"Sample Official Receipt Number: {slips[0].official_receipt if slips else 'None'}")
            
        except Exception as e:
            await self.session.rollback()
            print(f"Error seeding slips: {str(e)}")
            raise

    async def clear(self):
        try:
            print("Clearing slips table...")
            await self.session.execute(delete(Slip))
            await self.session.commit()
            print("Slips table cleared!")
        except Exception as e:
            await self.session.rollback()
            print(f"Error clearing slips: {str(e)}")
            raise
