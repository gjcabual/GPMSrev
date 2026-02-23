import asyncio
import argparse
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import async_session

from app.db.seeders.user_seeder import UserSeeder
from app.db.seeders.profile_seeder import ProfileSeeder
from app.db.seeders.application_seeder import ApplicationSeeder
from app.db.seeders.application_status import ApplicationStatusSeeder
from app.db.seeders.auth_driver_seeder import AuthDriverSeeder
from app.db.seeders.vehicle_seeder import VehicleSeeder
from app.db.seeders.slip_seeder import SlipSeeder
from app.db.seeders.document_seeder import DocumentSeeder
from app.db.seeders.sticker_seeder import StickerSeeder
from app.db.seeders.batch_sticker_sessions_seeder import BatchStickerSessionsSeeder
from app.db.seeders.assigned_driver_seeder import AssignedDriverSeeder

async def run_all_seeders(session: AsyncSession):
    """Run all seeders in the defined order"""
    print("=== Starting database seeding... ===")
    
    # Define seeders in order of dependencies
    seeders = [
        # Base tables first (no foreign key dependencies)
        ("users", UserSeeder(session)),
        ("profiles", ProfileSeeder(session)),
        ("vehicles", VehicleSeeder(session)),
        
        # Batch sticker sessions has no dependencies
        ("batch_sticker_sessions", BatchStickerSessionsSeeder(session)),
        
        # Applications depend on users and vehicles
        ("applications", ApplicationSeeder(session)),
        
        # Documents depend on applications, users, and vehicles
        ("documents", DocumentSeeder(session)),
        
        # Auth drivers depend on users and documents
        ("auth_drivers", AuthDriverSeeder(session)),
        
        # Assigned drivers depend on applications and auth drivers
        ("assigned_drivers", AssignedDriverSeeder(session)),
        
        # Application status depends on applications
        ("application_status", ApplicationStatusSeeder(session)),
        
        # Stickers depend on batch sessions and applications with status
        ("stickers", StickerSeeder(session)),
        
        # Slips now only depend on applications (removed document dependency)
        ("slips", SlipSeeder(session)),
    ]
    
    # Try each seeder and report errors
    for name, seeder in seeders:
        print(f"\n>> Running {name} seeder...")
        try:
            await seeder.seed()
            print(f">> {name} seeding complete!")
        except Exception as e:
            print(f"!! Error in {name} seeder: {str(e)}")
            import traceback
            traceback.print_exc()
    
    print("\n=== Database seeding complete! ===")

async def clear_all_data(session: AsyncSession):
    """Clear all database tables in reverse order"""
    print("=== Starting database clearing... ===")
    
    # Reverse order for proper foreign key constraint handling
    seeders = [
        # Start with tables that have foreign key dependencies
        ("assigned_drivers", AssignedDriverSeeder(session)),
        ("stickers", StickerSeeder(session)),
        ("slips", SlipSeeder(session)),  # Moved up since no document dependency
        ("application_status", ApplicationStatusSeeder(session)),
        ("applications", ApplicationSeeder(session)),
        ("batch_sticker_sessions", BatchStickerSessionsSeeder(session)),
        ("auth_drivers", AuthDriverSeeder(session)),
        ("documents", DocumentSeeder(session)),
        ("profiles", ProfileSeeder(session)),
        ("vehicles", VehicleSeeder(session)),
        ("users", UserSeeder(session)),
    ]
    
    for name, seeder in seeders:
        print(f"\n>> Clearing {name} table...")
        try:
            await seeder.clear()
            print(f">> {name} clearing complete!")
        except Exception as e:
            print(f"!! Error clearing {name} table: {str(e)}")
            import traceback
            traceback.print_exc()
    
    print("\n=== Database clearing complete! ===")

_seeder_map = {
    "users": UserSeeder,
    "profiles": ProfileSeeder,
    "vehicles": VehicleSeeder,
    "documents": DocumentSeeder,
    "auth_drivers": AuthDriverSeeder,
    "batch_sticker_sessions": BatchStickerSessionsSeeder,
    "stickers": StickerSeeder,
    "applications": ApplicationSeeder,
    "application_status": ApplicationStatusSeeder,
    "slips": SlipSeeder,
    "assigned_drivers": AssignedDriverSeeder,
}

async def seed_specific(session: AsyncSession, seeder_name: str):
    """Run a specific seeder by name"""
    seeder_map = {name: seeder(session) for name, seeder in _seeder_map.items()}
    
    if seeder_name in seeder_map:
        print(f"\n>> Running {seeder_name} seeder...")
        try:
            await seeder_map[seeder_name].seed()
            print(f"\n>> {seeder_name} seeding complete!")
        except Exception as e:
            print(f"!! Error in {seeder_name} seeder: {str(e)}")
            import traceback
            traceback.print_exc()
    else:
        print(f"Error: Seeder '{seeder_name}' not found")
        print(f"Available seeders: {', '.join(seeder_map.keys())}")

async def clear_specific(session: AsyncSession, seeder_name: str):
    """Clear a specific table"""
    seeder_map = {name: seeder(session) for name, seeder in _seeder_map.items()}
    
    if seeder_name in seeder_map:
        print(f"\n>> Clearing {seeder_name} table...")
        try:
            await seeder_map[seeder_name].clear()
            print(f"\n>> {seeder_name} table cleared!")
        except Exception as e:
            print(f"!! Error clearing {seeder_name} table: {str(e)}")
            import traceback
            traceback.print_exc()
    else:
        print(f"Error: Seeder '{seeder_name}' not found")
        print(f"Available seeders: {', '.join(seeder_map.keys())}")

async def refresh_specific(session: AsyncSession, seeder_name: str):
    """Clear and reseed a specific table"""
    seeder_map = {name: seeder(session) for name, seeder in _seeder_map.items()}
    
    if seeder_name in seeder_map:
        print(f"\n>> Refreshing {seeder_name} table...")
        try:
            await seeder_map[seeder_name].clear()
            await seeder_map[seeder_name].seed()
            print(f"\n>> {seeder_name} table refreshed!")
        except Exception as e:
            print(f"!! Error refreshing {seeder_name} table: {str(e)}")
            import traceback
            traceback.print_exc()
    else:
        print(f"Error: Seeder '{seeder_name}' not found")
        print(f"Available seeders: {', '.join(seeder_map.keys())}")

async def run_seeder(action: str = "seed", seeder_name: str = None):
    """Execute seeder actions with database session"""
    async with async_session() as session:
        if action == "seed":
            if seeder_name:
                await seed_specific(session, seeder_name)
            else:
                await run_all_seeders(session)
        elif action == "clear":
            if seeder_name:
                await clear_specific(session, seeder_name)
            else:
                await clear_all_data(session)
        elif action == "refresh":
            if seeder_name:
                await refresh_specific(session, seeder_name)
            else:
                await clear_all_data(session)
                await run_all_seeders(session)
        else:
            print(f"Invalid action: {action}. Use 'seed', 'clear', or 'refresh'.")

# For command-line usage
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed database tables")
    parser.add_argument("--action", choices=["seed", "clear", "refresh"], default="seed", 
                        help="Action to perform (seed, clear, or refresh)")
    parser.add_argument("--seeder", type=str, help="Specific seeder to run (only with 'seed' action)")
    
    args = parser.parse_args()
    
    if args.action == "seed" and args.seeder:
        asyncio.run(run_seeder(args.action, args.seeder))
    else:
        asyncio.run(run_seeder(args.action))