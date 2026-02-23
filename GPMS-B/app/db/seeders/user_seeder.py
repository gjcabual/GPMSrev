import uuid
from datetime import datetime
from sqlalchemy import delete
from app.db.seeders.base_seeder import BaseSeeder
from app.db.models.user import User
from app.core.security import get_password_hash

class UserSeeder(BaseSeeder):
    async def seed(self):
        print("Seeding users table...")
        
        current_time = datetime.utcnow()
        
        # Define user types with their roles
        user_types = {
            "admin": {"email": "admin@example.com", "password": "admin123", "role": 0},
            "staff": ["staff@example.com"] + [f"staff{i}@example.com" for i in range(1, 3)],  # Changed to 3 staff
            "applicant": ["applicant@example.com"] + [f"applicant{i}@example.com" for i in range(1, 10)]
        }
        
        # Debug: Print expected counts
        print("\nExpected User Counts:")
        print(f"Staff: {len(user_types['staff'])}")
        print(f"Applicants: {len(user_types['applicant'])}")
        
        users = []
        
        # Add admin user
        users.append(
            User(
                user_id=uuid.uuid4(),
                email=user_types["admin"]["email"],
                password=get_password_hash(user_types["admin"]["password"]),
                verified_at=current_time,
                created_at=current_time,
                updated_at=current_time,
                role=user_types["admin"]["role"]
            )
        )
        
        # Add staff users (now only 3)
        print("\nCreating Staff Users:")
        for staff_email in user_types["staff"]:
            print(f"- Adding staff: {staff_email}")
            users.append(
                User(
                    user_id=uuid.uuid4(),
                    email=staff_email,
                    password=get_password_hash("staff123"),
                    verified_at=current_time,
                    created_at=current_time,
                    updated_at=current_time,
                    role=1
                )
            )
        
        # Add applicant users with better debug output
        print("\nCreating Applicant Users:")
        applicant_count = 0
        for applicant_email in user_types["applicant"]:
            applicant_count += 1
            print(f"- Adding applicant {applicant_count}: {applicant_email}")
            users.append(
                User(
                    user_id=uuid.uuid4(),
                    email=applicant_email,
                    password=get_password_hash("applicant123"),
                    verified_at=current_time,
                    created_at=current_time,
                    updated_at=current_time,
                    role=2
                )
            )
        
        try:
            # Clear existing users first
            await self.clear()
            
            # Bulk insert all users
            self.session.add_all(users)
            await self.session.commit()
            
            # Verify in database after commit
            result = await self.session.execute(
                "SELECT email, role FROM users_tbl ORDER BY role, email"
            )
            db_users = await result.fetchall()
            
            print("\nActual Database Users:")
            roles = {0: "Admin", 1: "Staff", 2: "Applicant"}
            for email, role in db_users:
                print(f"- {roles[role]}: {email}")
            
            print("\nFinal Counts:")
            role_counts = {}
            for _, role in db_users:
                role_counts[role] = role_counts.get(role, 0) + 1
            
            print(f"- Admin (role 0): {role_counts.get(0, 0)}")
            print(f"- Staff (role 1): {role_counts.get(1, 0)}")
            print(f"- Applicants (role 2): {role_counts.get(2, 0)}")
            
            expected_counts = {0: 1, 1: 3, 2: 10}
            for role, expected in expected_counts.items():
                actual = role_counts.get(role, 0)
                if actual != expected:
                    print(f"\n⚠️ WARNING: Role {role} - Expected {expected}, got {actual}")
            
        except Exception as e:
            await self.session.rollback()
            print(f"Error seeding users: {str(e)}")
            raise
    
    async def clear(self):
        print("Clearing users table...")
        await self.session.execute(delete(User))
        await self.session.commit()
        print("Users table cleared!")