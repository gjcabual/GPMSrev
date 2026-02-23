import os
from pathlib import Path
from datetime import date
from sqlalchemy import delete, select
from app.db.seeders.base_seeder import BaseSeeder
from app.db.models.profile import Profile, Sex
from app.db.models.user import User

class ProfileSeeder(BaseSeeder):
    async def seed(self):
        print("Seeding profiles table...")
        
        # Load profile image
        with open(Path("app/static/images/profile.png"), "rb") as f:
            profile_image = f.read()
        
        # Get all users in a single query - Updated for new user counts
        user_emails = [
            "admin@example.com",
            "staff@example.com",
            "staff1@example.com",
            "staff2@example.com",
            "applicant@example.com",
            *[f"applicant{i}@example.com" for i in range(1, 10)]
        ]
        
        result = await self.session.execute(
            select(User).filter(User.email.in_(user_emails))
        )
        users = {user.email: user for user in result.scalars().all()}
        
        if len(users) < len(user_emails):
            missing = set(user_emails) - set(users.keys())
            print(f"Error: Missing users: {missing}")
            return
        
        # Profile data with corresponding emails - Remove extra staff
        profile_data = [
            {
                "email": "admin@example.com",
                "first_name": "Admin",
                "last_name": "User",
                "birth_date": date(1990, 1, 15),
                "sex": Sex.MALE.value,
                "contact_no": "09123456789",
                "address": "123 Admin St, City"
            },
            {
                "email": "staff@example.com",
                "first_name": "Staff",
                "last_name": "Member",
                "birth_date": date(1992, 5, 20),
                "sex": Sex.FEMALE.value,
                "contact_no": "09187654321",
                "address": "456 Staff Ave, City"
            },
            {
                "email": "staff1@example.com",
                "first_name": "Sarah",
                "last_name": "Johnson",
                "birth_date": date(1988, 3, 12),
                "sex": Sex.FEMALE.value,
                "contact_no": "09187654001",
                "address": "101 Pine Street, City"
            },
            {
                "email": "staff2@example.com",
                "first_name": "Michael",
                "last_name": "Chen",
                "birth_date": date(1991, 6, 25),
                "sex": Sex.PREFER_NOT_TO_SAY.value, 
                "contact_no": "09187654002",
                "address": "202 Oak Avenue, City"
            },
            {
                "email": "applicant@example.com",
                "first_name": "John",
                "last_name": "Applicant",
                "birth_date": date(1995, 7, 10),
                "sex": Sex.MALE.value,
                "contact_no": "09198765432",
                "address": "789 User Blvd, City"
            },
            # Add new applicant profiles
            {
                "email": "applicant1@example.com",
                "first_name": "Alice",
                "last_name": "Smith",
                "birth_date": date(1997, 3, 15),
                "sex": Sex.FEMALE.value,
                "contact_no": "09198765433",
                "address": "101 Student Ave, City"
            },
            {
                "email": "applicant2@example.com",
                "first_name": "Bob",
                "last_name": "Johnson",
                "birth_date": date(1996, 5, 20),
                "sex": Sex.MALE.value,
                "contact_no": "09198765434",
                "address": "202 College St, City"
            },
            {
                "email": "applicant3@example.com",
                "first_name": "Carol",
                "last_name": "Brown",
                "birth_date": date(1998, 8, 25),
                "sex": Sex.FEMALE.value,
                "contact_no": "09198765435",
                "address": "303 University Rd, City"
            },
            {
                "email": "applicant4@example.com",
                "first_name": "David",
                "last_name": "Lee",
                "birth_date": date(1995, 11, 30),
                "sex": Sex.MALE.value,
                "contact_no": "09198765436",
                "address": "404 Campus Dr, City"
            },
            {
                "email": "applicant5@example.com",
                "first_name": "Emma",
                "last_name": "Garcia",
                "birth_date": date(1997, 2, 14),
                "sex": Sex.FEMALE.value,
                "contact_no": "09198765437",
                "address": "505 Scholar St, City"
            },
            {
                "email": "applicant6@example.com",
                "first_name": "Frank",
                "last_name": "Wilson",
                "birth_date": date(1996, 4, 18),
                "sex": Sex.MALE.value,
                "contact_no": "09198765438",
                "address": "606 Research Ave, City"
            },
            {
                "email": "applicant7@example.com",
                "first_name": "Grace",
                "last_name": "Anderson",
                "birth_date": date(1998, 6, 22),
                "sex": Sex.FEMALE.value,
                "contact_no": "09198765439",
                "address": "707 Learning Ln, City"
            },
            {
                "email": "applicant8@example.com",
                "first_name": "Henry",
                "last_name": "Martinez",
                "birth_date": date(1995, 9, 27),
                "sex": Sex.MALE.value,
                "contact_no": "09198765440",
                "address": "808 Education Blvd, City"
            },
            {
                "email": "applicant9@example.com",
                "first_name": "Isabel",
                "last_name": "Thompson",
                "birth_date": date(1997, 12, 5),
                "sex": Sex.FEMALE.value,
                "contact_no": "09198765441",
                "address": "909 Academic St, City"
            }
        ]
        
        try:
            # Create profiles
            profiles = [
                Profile(
                    first_name=data["first_name"],
                    last_name=data["last_name"],
                    birth_date=data["birth_date"],
                    sex=data["sex"],
                    contact_no=data["contact_no"],
                    address=data["address"],
                    image=profile_image,  # Add the image data
                    user_id=users[data["email"]].user_id
                )
                for data in profile_data
            ]
            
            # Bulk insert
            self.session.add_all(profiles)
            await self.session.commit()
            print(f"Successfully seeded {len(profiles)} profiles")
            
        except Exception as e:
            await self.session.rollback()
            print(f"Error seeding profiles: {str(e)}")
            raise
    
    async def clear(self):
        print("Clearing profiles table...")
        await self.session.execute(delete(Profile))
        await self.session.commit()
        print("Profiles table cleared!")