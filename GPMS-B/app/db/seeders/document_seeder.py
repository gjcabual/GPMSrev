import os
from pathlib import Path
from datetime import date, timedelta
from sqlalchemy import delete, select, text
from app.db.seeders.base_seeder import BaseSeeder
from app.db.models.document import Document
from app.db.models.user import User
from app.db.models.vehicle import Vehicle
from app.db.models.application import Application
from app.db.models.auth_driver import AuthDriver

class DocumentSeeder(BaseSeeder):
    async def seed(self):
        print("Seeding documents table...")
        
        # Clear existing documents first
        await self.clear()
        
        # DIRECT DB QUERY to verify applications exist
        app_count = await self.session.execute(text("SELECT COUNT(*) FROM applications_tbl"))
        count = app_count.scalar()
        print(f"Database has {count} applications directly from SQL query")
        
        if count == 0:
            print("No applications in database - creating applications first")
            # Create applications dynamically since they don't exist
            await self._create_applications()
        
        # Get all applicant users (role=2)
        users_result = await self.session.execute(
            select(User).filter(User.role == 2)
        )
        applicant_users = users_result.scalars().all()
        
        # Get all vehicles
        vehicles_result = await self.session.execute(select(Vehicle))
        vehicles = vehicles_result.scalars().all()
        
        # Get all applications with their associated user and plate_no
        applications_result = await self.session.execute(select(Application))
        applications = applications_result.scalars().all()

        # If no applications, raise an error (don't create them in document seeder)
        if not applications:
            print("ERROR: No applications found. Run application seeder first!")
            return
        
        print(f"\nData for document creation:")
        print(f"- Users: {len(applicant_users)}")
        print(f"- Vehicles: {len(vehicles)}")
        print(f"- Applications: {len(applications)}")
        
        if not applications:
            print("ERROR: Still no applications found after attempt to create them")
            return
        
        try:
            today = date.today()
            one_year_later = today + timedelta(days=365)
            documents = []
            
            # Load image files
            base_path = Path("app/static/images")
            
            # Read image binary data
            with open(base_path / "CR_reference.png", "rb") as f:
                cr_image = f.read()
            
            with open(base_path / "or_reference.jpg", "rb") as f:
                or_image = f.read()
            
            with open(base_path / "dl_reference.jpg", "rb") as f:
                dl_image = f.read()
            
            # Create the three required document types for each application
            print("\nCreating application documents...")
            for idx, application in enumerate(applications):
                # Debug info
                print(f"Processing application {application.application_id} for user {application.user_id} with plate {application.plate_no}")
                
                docs = [
                    Document(
                        type="Official Receipt",
                        registered_date=today - timedelta(days=30),
                        expired_at=one_year_later,
                        plate_no=application.plate_no,
                        user_id=application.user_id,
                        application_id=application.application_id,
                        image=or_image
                    ),
                    Document(
                        type="Certificate of Registration",
                        registered_date=today - timedelta(days=30),
                        expired_at=one_year_later,
                        plate_no=application.plate_no,
                        user_id=application.user_id,
                        application_id=application.application_id,
                        image=cr_image
                    ),
                    Document(
                        type="Driver's License",
                        registered_date=today - timedelta(days=30),
                        expired_at=one_year_later,
                        plate_no=application.plate_no,
                        user_id=application.user_id,
                        application_id=application.application_id,
                        image=dl_image
                    )
                ]
                documents.extend(docs)
            
            # Bulk insert all documents
            print(f"Inserting {len(documents)} application documents...")
            self.session.add_all(documents)
            await self.session.commit()
            
            print("\nDocument Distribution:")
            print(f"Total Documents Created: {len(documents)}")
            
            # Count by document type
            doc_types = {}
            for d in documents:
                doc_types[d.type] = doc_types.get(d.type, 0) + 1
                
            for doc_type, count in doc_types.items():
                print(f"- {doc_type}: {count}")
            
        except Exception as e:
            await self.session.rollback()
            print(f"Error seeding documents: {str(e)}")
            raise
    
    async def _create_applications(self):
        """Create applications if none exist - embedded application seeder"""
        print("Creating applications for document seeding...")
        
        # Get users and vehicles
        users_result = await self.session.execute(
            select(User).filter(User.role == 2)
        )
        applicant_users = users_result.scalars().all()
        
        vehicles_result = await self.session.execute(select(Vehicle))
        vehicles = vehicles_result.scalars().all()
        
        if not applicant_users or not vehicles:
            print(f"Cannot create applications - missing users or vehicles")
            return False
            
        print(f"Creating applications for {len(applicant_users)} users")
        
        today = date.today()
        next_year = today + timedelta(days=365)
        applications = []
        
        # Create basic applications - one for each user if possible
        for idx, user in enumerate(applicant_users):
            if idx < len(vehicles):
                vehicle = vehicles[idx]
                
                # Simple application with required fields only
                application = Application(
                    role="Student",
                    building_name="Main Building",
                    app_type="New",
                    date=today,
                    expired_at=next_year,
                    user_id=user.user_id,
                    plate_no=vehicle.plate_no
                )
                applications.append(application)
        
        # Insert applications
        self.session.add_all(applications)
        await self.session.commit()
        
        print(f"Created {len(applications)} applications for document seeding")
        return True

    async def clear(self):
        print("Clearing documents table...")
        await self.session.execute(delete(Document))
        await self.session.commit()
        print("Documents table cleared!")