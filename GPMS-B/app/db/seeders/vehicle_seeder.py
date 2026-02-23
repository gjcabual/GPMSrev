from sqlalchemy import delete, select
from app.db.seeders.base_seeder import BaseSeeder
from app.db.models.vehicle import Vehicle
from app.db.models.user import User
import random
from pathlib import Path

class VehicleSeeder(BaseSeeder):
    async def seed(self):
        print("Seeding vehicles table...")
        
        # Clear existing vehicles
        await self.clear()
        
        # Get all applicant users (role=2)
        result = await self.session.execute(
            select(User).filter(User.role == 2)
        )
        applicant_users = result.scalars().all()
        
        if not applicant_users:
            print("Error: No applicant users found")
            return
        
        # Sample vehicle data: (plate_no, brand, model, vehicle_type, color)
        vehicle_data = [
            ("ABC123", "Toyota", "Vios", "Car", "White"),
            ("XYZ789", "Honda", "Civic", "Car", "Black"),
            ("DEF456", "Isuzu", "D-Max", "Truck", "Silver"),
            ("GHI789", "Yamaha", "NMAX", "Motorcycle", "Red"),
            ("JKL012", "Toyota", "Hiace", "Van", "Blue"),
            ("MNO345", "Honda", "TMX", "Motorcycle", "Gray"),
            ("PQR678", "Bajaj", "RE", "Tricycle", "Black"),
            ("STU901", "Toyota", "Innova", "Car", "White"),
            ("VWX234", "Mitsubishi", "L300", "Van", "Red"),
            ("YZA567", "Kawasaki", "Barako", "Motorcycle", "Silver"),
            ("BCD890", "Ford", "Ranger", "Truck", "Green"),
            ("EFG123", "Honda", "City", "Car", "Gray"),
            ("HIJ456", "Suzuki", "Carry", "Tricycle", "Black"),
            ("KLM789", "Ford", "EcoSport", "Car", "White"),
        ]

        # Load vehicle images
        with open(Path("app/static/images/vehicle_front.png"), "rb") as f:
            front_image = f.read()
        
        with open(Path("app/static/images/vehicle_back.png"), "rb") as f:
            back_image = f.read()

        try:
            vehicles = []
            # Distribute vehicles among users (some users may have multiple vehicles)
            for plate_no, brand, model, vehicle_type, color in vehicle_data:
                # Assign to a random user (ensures some users get multiple vehicles)
                random_user = random.choice(applicant_users)
                
                vehicle = Vehicle(
                    plate_no=plate_no,
                    brand=brand,
                    model=model,
                    vehicle_type=vehicle_type,
                    color=color,
                    front_image=front_image,  # Add front image
                    back_image=back_image,    # Add back image
                    user_id=random_user.user_id
                )
                vehicles.append(vehicle)
            
            # Add all vehicles to session and commit
            self.session.add_all(vehicles)
            await self.session.commit()

            # Get vehicle distribution data for reporting
            user_vehicle_counts = {}
            for vehicle in vehicles:
                user_id = str(vehicle.user_id)
                if user_id in user_vehicle_counts:
                    user_vehicle_counts[user_id] += 1
                else:
                    user_vehicle_counts[user_id] = 1
                    
            print(f"Successfully seeded {len(vehicles)} vehicles")
            print(f"Vehicle distribution among {len(user_vehicle_counts)} users:")
            for user_id, count in user_vehicle_counts.items():
                print(f"  User {user_id[-6:]}: {count} vehicles")
            
        except Exception as e:
            await self.session.rollback()
            print(f"Error seeding vehicles: {str(e)}")
            raise

    async def clear(self):
        print("Clearing vehicles table...")
        await self.session.execute(delete(Vehicle))
        await self.session.commit()
        print("Vehicles table cleared!")