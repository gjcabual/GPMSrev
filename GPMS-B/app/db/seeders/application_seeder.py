from datetime import date, timedelta, datetime
from sqlalchemy import delete, select
from app.db.seeders.base_seeder import BaseSeeder
from app.db.models.application import Application
from app.db.models.user import User
from app.db.models.vehicle import Vehicle

class ApplicationSeeder(BaseSeeder):
    async def seed(self):
        print("Seeding applications table...")
        
        # Clear existing applications
        await self.clear()
        
        # Get all applicant users with their vehicles
        users_result = await self.session.execute(
            select(User).filter(User.role == 2)
        )
        applicant_users = users_result.scalars().all()
        
        if not applicant_users:
            print("Error: No applicant users found")
            return
            
        # Get vehicles with their associated users
        vehicles_result = await self.session.execute(select(Vehicle))
        vehicles = vehicles_result.scalars().all()
        
        if not vehicles:
            print("Error: No vehicles found")
            return
            
        print(f"Found {len(applicant_users)} applicant users and {len(vehicles)} vehicles")
        
        try:
            today = date.today()
            next_year = today + timedelta(days=365)
            applications = []
            
            # Create applications - one for each vehicle
            # This ensures that even users with multiple vehicles get applications for each
            for vehicle in vehicles:
                # Create application for this vehicle and its owner
                application = Application(
                    role="Student",
                    building_name="Main Building",
                    app_type="New",
                    date=today,
                    expired_at=next_year,
                    user_id=vehicle.user_id,  # User who owns this vehicle
                    plate_no=vehicle.plate_no
                )
                applications.append(application)
            
            if not applications:
                print("Error: No applications created")
                return
                
            # Insert applications
            self.session.add_all(applications)
            await self.session.commit()
            
            print(f"Successfully created {len(applications)} applications")
            
        except Exception as e:
            await self.session.rollback()
            print(f"Error seeding applications: {str(e)}")
            raise
            
    async def clear(self):
        print("Clearing applications table...")
        await self.session.execute(delete(Application))
        await self.session.commit()
        print("Applications table cleared!")