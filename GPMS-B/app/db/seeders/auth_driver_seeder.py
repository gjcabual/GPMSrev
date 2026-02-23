from datetime import date
from sqlalchemy import delete, select
from app.db.seeders.base_seeder import BaseSeeder
from app.db.models.auth_driver import AuthDriver
from app.db.models.user import User
from app.db.models.document import Document
from pathlib import Path

class AuthDriverSeeder(BaseSeeder):
    async def seed(self):
        print("Seeding auth drivers table...")
        
        # Load driver profile image
        with open(Path("app/static/images/profile.png"), "rb") as f:
            driver_image = f.read()
        
        # Get all applicant users (role=2)
        result = await self.session.execute(
            select(User).filter(User.role == 2)
        )
        applicant_users = result.scalars().all()
        
        if not applicant_users:
            print("Error: No applicant users found in database")
            return
        
        # Get documents for each applicant
        auth_drivers = []
        
        # Applicant data
        applicant_data = [
            ("John", "Applicant", date(1995, 7, 10)),
            ("Alice", "Smith", date(1997, 3, 15)),
            ("Bob", "Johnson", date(1996, 5, 20)),
            ("Carol", "Brown", date(1998, 8, 25)),
            ("David", "Lee", date(1995, 11, 30)),
            ("Emma", "Garcia", date(1997, 2, 14)),
            ("Frank", "Wilson", date(1996, 4, 18)),
            ("Grace", "Anderson", date(1998, 6, 22)),
            ("Henry", "Martinez", date(1995, 9, 27)),
            ("Isabel", "Thompson", date(1997, 12, 5))
        ]
        
        # Create auth drivers for each applicant
        for user, (first_name, last_name, birth_date) in zip(applicant_users, applicant_data):
            # Get user's driver's license
            doc = await self.session.execute(
                select(Document).filter(
                    Document.user_id == user.user_id,
                    Document.type == "Driver's License"
                )
            )
            doc = doc.scalars().first()
            
            if doc:
                auth_drivers.append(
                    AuthDriver(
                        first_name=first_name,
                        last_name=last_name,
                        birth_date=birth_date,
                        relationship_status="Single",
                        profile_image=driver_image,  # Add the image
                        user_id=user.user_id,
                        document_id=doc.document_id
                    )
                )
            else:
                print(f"Warning: No driver's license found for {user.email}")
        
        try:
            # Bulk insert all auth drivers
            self.session.add_all(auth_drivers)
            await self.session.commit()
            print(f"Successfully seeded {len(auth_drivers)} auth drivers")
            
            # Print summary
            print("\nAuth Driver Distribution:")
            print(f"Total Auth Drivers: {len(auth_drivers)}")
            for driver in auth_drivers:
                print(f"- {driver.first_name} {driver.last_name}")
            
        except Exception as e:
            await self.session.rollback()
            print(f"Error seeding auth drivers: {str(e)}")
            raise

    async def clear(self):
        print("Clearing auth drivers table...")
        await self.session.execute(delete(AuthDriver))
        await self.session.commit()
        print("Auth drivers table cleared!")