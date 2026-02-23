from datetime import date, timedelta
from sqlalchemy import delete, select
from app.db.seeders.base_seeder import BaseSeeder
from app.db.models.assigned_driver import AssignedDriver
from app.db.models.auth_driver import AuthDriver
from app.db.models.application import Application
from app.db.models.user import User

class AssignedDriverSeeder(BaseSeeder):
    async def seed(self):
        print("Seeding assigned drivers table...")
        
        # Get auth drivers for applicants
        auth_drivers = await self.session.execute(
            select(AuthDriver)
            .join(User)
            .filter(User.role == 2)
        )
        auth_drivers = auth_drivers.scalars().all()
        
        # Get applications
        applications = await self.session.execute(select(Application))
        applications = applications.scalars().all()
        
        if not auth_drivers or not applications:
            print("Error: Required auth drivers or applications not found in database")
            return
        
        try:
            assigned_drivers = []
            
            for application in applications:
                # Find matching auth driver for the application's user
                matching_driver = next(
                    (driver for driver in auth_drivers if driver.user_id == application.user_id),
                    None
                )
                
                if matching_driver:
                    assigned_drivers.append(
                        AssignedDriver(
                            assigned_at=application.date,
                            auth_driver_id=matching_driver.auth_driver_id,
                            application_id=application.application_id
                        )
                    )
                else:
                    print(f"Warning: No matching auth driver found for application {application.application_id}")
            
            # Bulk insert all assigned drivers
            self.session.add_all(assigned_drivers)
            await self.session.commit()
            
            # Print summary
            print(f"\nAssigned Driver Summary:")
            print(f"Total Assignments: {len(assigned_drivers)}")
            for assigned in assigned_drivers:
                driver = next(d for d in auth_drivers if d.auth_driver_id == assigned.auth_driver_id)
                print(f"- {driver.first_name} {driver.last_name} assigned to application {assigned.application_id}")
            
        except Exception as e:
            await self.session.rollback()
            print(f"Error seeding assigned drivers: {str(e)}")
            raise

    async def clear(self):
        print("Clearing assigned drivers table...")
        await self.session.execute(delete(AssignedDriver))
        await self.session.commit()
        print("Assigned drivers table cleared!")