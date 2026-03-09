from sqlalchemy import select, text, func  # Add func to the import
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.user import User
from app.db.models.profile import Profile
from app.db.models.batch_sticker_sessions import BatchStickerSessions
from typing import List, Dict, Any, Set
from datetime import datetime
from app.schemas.batch_sticker import BatchStickerCreate, STICKER_PRICES
from uuid import UUID


class StaffController:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_staff_accounts(self, skip: int = 0, limit: int = 10) -> List[Dict[str, Any]]:
        query = (
            select(User, Profile)
            .join(Profile, User.user_id == Profile.user_id)
            .where(User.role == 1)
            .offset(skip)
            .limit(limit)
            .order_by(User.created_at)
        )
        
        result = await self.db.execute(query)
        staff_list = []
        
        for position, (user, profile) in enumerate(result.fetchall(), start=skip+1):
            staff_list.append({
                "position": position,
                "user_id": str(user.user_id),
                "name": f"{profile.first_name} {profile.last_name}",
                "email": user.email,
                "created_at": user.created_at,
                "updated_at": getattr(user, 'updated_at', None)
            })
        
        return staff_list

    async def get_total_staff_count(self) -> int:
        query = select(User).where(User.role == 1)
        result = await self.db.execute(query)
        return len(result.fetchall())

    async def get_existing_sticker_ranges(self) -> List[Dict[str, Any]]:
        """Get all existing sticker ranges from the database"""
        query = select(BatchStickerSessions.type, BatchStickerSessions.start_at, BatchStickerSessions.end_at)
        result = await self.db.execute(query)
        return [{"type": r[0], "start_at": r[1], "end_at": r[2]} for r in result.fetchall()]
    
    async def check_range_conflicts(self, batches: List[BatchStickerCreate]) -> Dict[str, Any]:
        """Check if any of the new batches conflict with existing ranges in the database"""
        # First validate that all batches have both start_at and end_at
        for batch in batches:
            if (batch.start_at is None) != (batch.end_at is None):
                raise ValueError(
                    f"For {batch.type.value} stickers, both start and end numbers must be provided together"
                )
            if batch.start_at and batch.end_at and batch.start_at > batch.end_at:
                raise ValueError(
                    f"For {batch.type.value} stickers, start number ({batch.start_at}) "
                    f"cannot be greater than end number ({batch.end_at})"
                )

        existing_ranges = await self.get_existing_sticker_ranges()
        
        for batch in batches:
            new_range = set(range(batch.start_at, batch.end_at + 1))
            
            # Only check against existing ranges of the SAME sticker type
            for existing in existing_ranges:
                # Skip if not the same sticker type
                if existing["type"] != batch.type.value:
                    continue
                    
                existing_range = set(range(existing["start_at"], existing["end_at"] + 1))
                overlap = existing_range.intersection(new_range)
                
                if overlap:
                    # Format the overlapping numbers nicely
                    if len(overlap) > 10:
                        overlap_str = f"{min(overlap)}-{max(overlap)}"
                    else:
                        overlap_str = ", ".join(map(str, sorted(overlap)))
                    
                    # Create detailed conflict information
                    return {
                        "has_conflict": True,
                        "type": batch.type.value,
                        "start_at": batch.start_at, 
                        "end_at": batch.end_at,
                        "overlapping_numbers": overlap_str,
                        "conflicting_with": {
                            "type": existing["type"],
                            "start_at": existing["start_at"],
                            "end_at": existing["end_at"],
                            "batch_id": existing.get("batch_id", "Unknown")
                        }
                    }
        
        return {"has_conflict": False}
        
    async def create_batch_sticker_sessions(
        self,
        batches: List[BatchStickerCreate],
        batch_name: str
    ) -> List[BatchStickerSessions]:
        """Create multiple batch sticker sessions at once"""
        # Check for conflicts with existing ranges first
        conflict_info = await self.check_range_conflicts(batches)
        if (conflict_info["has_conflict"]):
            raise ValueError(
                f"Range for {conflict_info['type']} ({conflict_info['start_at']}-{conflict_info['end_at']}) "
                f"overlaps with existing sticker range(s) in database. "
                f"Overlapping numbers: {conflict_info['overlapping_numbers']}"
            )
        
        current_time = datetime.now()
        batch_sessions = []
        
        for batch_data in batches:
            # Create a new batch sticker session
            # Get price from the STICKER_PRICES dictionary
            price = STICKER_PRICES.get(batch_data.type, batch_data.price)
            
            new_batch = BatchStickerSessions(
                type=batch_data.type.value,
                batch_name=batch_name,
                start_at=batch_data.start_at,
                end_at=batch_data.end_at,
                price=price,
                created_at=current_time  # Use current_time with time component
            )
            
            self.db.add(new_batch)
            batch_sessions.append(new_batch)
        
        # Commit all sessions at once
        await self.db.commit()
        
        # Refresh all objects to get their IDs and other DB-generated values
        for batch in batch_sessions:
            await self.db.refresh(batch)
            
        return batch_sessions

    async def get_all_batch_stickers(self, filter_by: str = None, year: int = None) -> Dict[str, Any]:
        """
        Get all batch sticker sessions, grouped by created date
        
        Parameters:
            filter_by: Optional filter - 'month' for current month, 'year' for current year
            year: Optional specific year to filter by (YYYY format)
        """
        # First, get all sticker batch sessions
        query = select(BatchStickerSessions).order_by(
            BatchStickerSessions.created_at.desc(),
            BatchStickerSessions.type
        )
        
        # Apply filters if specified
        today = datetime.today()
        
        if filter_by:
            if filter_by == 'month':
                # Filter by current month and year
                query = query.where(
                    (BatchStickerSessions.created_at >= datetime(today.year, today.month, 1))
                )
            elif filter_by == 'year':
                # Filter by current year
                query = query.where(
                    (BatchStickerSessions.created_at >= datetime(today.year, 1, 1))
                )
        elif year:
            # Filter by specific year
            query = query.where(
                (BatchStickerSessions.created_at >= datetime(year, 1, 1)) &
                (BatchStickerSessions.created_at < datetime(year + 1, 1, 1))
            )
        
        result = await self.db.execute(query)
        all_batches = result.scalars().all()
        
        # Group by created_at (exact datetime)
        grouped_by_exact_time = {}
        
        # Store the exact timestamps for sorting
        timestamp_order = []
        
        for batch in all_batches:
            # Use microsecond precision so separate registrations
            # within the same second don't get merged.
            time_key = batch.created_at.strftime("%Y-%m-%d %H:%M:%S.%f")
            
            if time_key not in grouped_by_exact_time:
                grouped_by_exact_time[time_key] = {
                    "created_at": batch.created_at.date(),  # Convert to date only
                    "exact_timestamp": batch.created_at,    # Keep exact timestamp for sorting
                    "batch_name": batch.batch_name,
                    "student": None,
                    "employee": None,
                    "dropoff": None,
                    "concessionaire": None
                }
                timestamp_order.append(time_key)
            
            # Map the sticker type to its key
            type_mapping = {
                "Student": "student", 
                "Employee Parking": "employee",
                "Drop Off": "dropoff",
                "Concessionaire": "concessionaire"
            }
            
            type_key = type_mapping.get(batch.type)
            if type_key:
                grouped_by_exact_time[time_key][type_key] = {
                    "start_at": batch.start_at,
                    "end_at": batch.end_at,
                    "price": batch.price
                }
        
        # Sort by exact timestamp (oldest first)
        timestamp_order.sort(key=lambda x: grouped_by_exact_time[x]["exact_timestamp"])
        
        # Create result list maintaining timestamp order
        result_list = []
        batch_counter = 1
        
        for time_key in timestamp_order:
            batch = grouped_by_exact_time[time_key]
            # Remove extra fields
            del batch["exact_timestamp"]
            
            batch["batch_no"] = batch_counter
            batch_counter += 1
            result_list.append(batch)
        
        # Reverse the final list to show newest first while maintaining correct batch numbers
        result_list.reverse()
        
        return {
            "success": True,
            "total": len(result_list),
            "batches": result_list
        }

    async def delete_staff_account(self, user_id: UUID) -> bool:
        """Delete a staff account by user_id"""
        # First verify it's a staff account
        query = select(User).where(
            (User.user_id == user_id) & 
            (User.role == 1)
        )
        result = await self.db.execute(query)
        user = result.scalar_one_or_none()

        if not user:
            raise ValueError("Staff account not found or not a staff account")

        try:
            # First delete related tokens
            await self.db.execute(
                text("DELETE FROM tokens_tbl WHERE user_id = :user_id"),
                {"user_id": user_id}
            )
            
            # Then delete the user (cascade will handle other related records)
            await self.db.delete(user)
            await self.db.commit()
            return True
        except Exception as e:
            await self.db.rollback()
            raise ValueError(f"Failed to delete staff account: {str(e)}")

    async def get_recommended_start_values(self) -> Dict[str, int]:
        """Get recommended start values for each sticker type based on existing ranges"""
        # Query to get the maximum end_at value for each sticker type
        query = select(
            BatchStickerSessions.type,
            func.max(BatchStickerSessions.end_at).label('max_end')
        ).group_by(BatchStickerSessions.type)
        
        result = await self.db.execute(query)
        ranges = result.fetchall()
        
        # Default starting values for each type
        recommendations = {
            "Student": 1000,
            "Employee Parking": 2000,
            "Drop Off": 3000,
            "Concessionaire": 4000
        }
        
        # Update with next available numbers based on existing data
        for sticker_type, max_end in ranges:
            if max_end is not None:
                recommendations[sticker_type] = max_end + 1
        
        return {
            "success": True,
            "recommendations": {
                "student": recommendations["Student"],
                "employee": recommendations["Employee Parking"],
                "dropoff": recommendations["Drop Off"],
                "concessionaire": recommendations["Concessionaire"]
            }
        }
