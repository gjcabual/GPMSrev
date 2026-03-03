from datetime import datetime, timedelta, date  
from typing import List  
from sqlalchemy import func, and_, select
from sqlalchemy.ext.asyncio import AsyncSession
import logging  

# Initialize logger
logger = logging.getLogger(__name__)

from app.db.models.application import Application
from app.db.models.application_status import ApplicationStatus
from app.db.models.sticker import Sticker
from app.db.models.vehicle import Vehicle
from app.db.models.batch_sticker_sessions import BatchStickerSessions
from app.schemas.dashboard import (
    ApplicationStatusCounts,
    StickerTypeCounts,
    ChargesSummary,
    VehicleCount,
    PendingVehicle
)

class DashboardController:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.pending_like_statuses = ("Pending", "Waiting for approval")

    async def get_application_status_counts(self) -> ApplicationStatusCounts:
        try:
            # Use row_number() to get the latest status for each application
            latest_status = (
                select(
                    ApplicationStatus.application_id,
                    ApplicationStatus.status,
                    func.row_number().over(
                        partition_by=ApplicationStatus.application_id,
                        order_by=[ApplicationStatus.date.desc(), ApplicationStatus.status_id.desc()]
                    ).label('rn')
                ).subquery()
            )

            # Main query using the row_number approach
            stmt = (
                select(
                    latest_status.c.status,
                    func.count(latest_status.c.application_id)
                )
                .select_from(latest_status)
                .where(latest_status.c.rn == 1)  # Only the latest status per application
                .group_by(latest_status.c.status)
            )

            # Execute query
            result = await self.db.execute(stmt)
            status_counts = result.all()

            status_counts_dict = {
                'total_approved': next((count for status, count in status_counts if status == 'Approved'), 0),
                'total_rejected': next((count for status, count in status_counts if status == 'Rejected'), 0),
                'total_pending': sum(
                    count for status, count in status_counts
                    if status in self.pending_like_statuses
                )
            }
            return ApplicationStatusCounts(**status_counts_dict)
        except Exception as e:
            logger.error(f"Error getting application status counts: {str(e)}")
            raise e

    async def get_sticker_type_counts(self) -> StickerTypeCounts:
        try:
            # Subquery to get latest application status
            latest_status = (
                select(
                    ApplicationStatus.application_id,
                    ApplicationStatus.status,
                    func.row_number().over(
                        partition_by=ApplicationStatus.application_id,
                        order_by=ApplicationStatus.date.desc()
                    ).label('rn')
                ).subquery()
            )

            # Main query to count stickers by type
            stmt = (
                select(
                    BatchStickerSessions.type,
                    func.count(Sticker.id).label('count')
                )
                .select_from(BatchStickerSessions)
                .join(Sticker, BatchStickerSessions.batch_id == Sticker.batch_id)
                .join(Application, Application.sticker_id == Sticker.id)
                .join(
                    latest_status,
                    and_(
                        Application.application_id == latest_status.c.application_id,
                        latest_status.c.rn == 1,
                        latest_status.c.status.in_(['Approved', 'Pending'])
                    )
                )
                .group_by(BatchStickerSessions.type)
            )

            result = await self.db.execute(stmt)
            counts = result.all()

            # Initialize default counts
            type_counts = {
                'total_employee': 0,
                'total_dropoff': 0,
                'total_student': 0,
                'total_concessionaire': 0
            }

            # Map database types to response fields
            type_mapping = {
                'Employee Parking': 'total_employee',
                'Student': 'total_student',
                'Drop Off': 'total_dropoff',
                'Concessionaire': 'total_concessionaire'
            }

            # Update counts based on query results
            for type_, count in counts:
                if type_ in type_mapping:
                    type_counts[type_mapping[type_]] = count

            return StickerTypeCounts(**type_counts)

        except Exception as e:
            logger.error(f"Error getting sticker type counts: {str(e)}")
            raise

    async def get_charges_summary(self) -> ChargesSummary:
        try:
            # Use row_number() for more reliable identification of latest status
            latest_status = (
                select(
                    ApplicationStatus.application_id,
                    ApplicationStatus.status,
                    func.row_number().over(
                        partition_by=ApplicationStatus.application_id,
                        order_by=[ApplicationStatus.date.desc(), ApplicationStatus.status_id.desc()]
                    ).label('rn')
                ).subquery()
            )

            # Approved charges query - starting from Application to avoid duplicate counting
            approved_stmt = (
                select(func.sum(BatchStickerSessions.price))
                .select_from(Application)
                .join(Sticker, Application.sticker_id == Sticker.id)
                .join(BatchStickerSessions, Sticker.batch_id == BatchStickerSessions.batch_id)
                .join(
                    latest_status,
                    and_(
                        Application.application_id == latest_status.c.application_id,
                        latest_status.c.rn == 1,
                        latest_status.c.status == 'Approved'
                    )
                )
            )
            
            approved_result = await self.db.execute(approved_stmt)
            approved_total = approved_result.scalar() or 0

            # Pending charges query - similar approach as approved
            pending_stmt = (
                select(func.sum(BatchStickerSessions.price))
                .select_from(Application)
                .join(Sticker, Application.sticker_id == Sticker.id)
                .join(BatchStickerSessions, Sticker.batch_id == BatchStickerSessions.batch_id)
                .join(
                    latest_status,
                    and_(
                        Application.application_id == latest_status.c.application_id,
                        latest_status.c.rn == 1,
                        latest_status.c.status == 'Pending'
                    )
                )
            )
            
            pending_result = await self.db.execute(pending_stmt)
            pending_total = pending_result.scalar() or 0

            logger.debug(f"Approved total: {approved_total}")
            logger.debug(f"Pending total: {pending_total}")

            return ChargesSummary(
                approved=approved_total,
                pending=pending_total,
                overall_total=approved_total + pending_total
            )
        except Exception as e:
            logger.error(f"Error getting charges summary: {str(e)}")
            raise

    async def get_vehicle_counts(self, time_filter: str = None, vehicle_type: str = None) -> dict:
        try:
            today = datetime.now().date()
            time_filter_clause = None
            
            # Set up time filter
            if time_filter:
                if time_filter == 'today':
                    time_filter_clause = func.date(Application.date) == today
                elif time_filter == 'week':
                    week_ago = today - timedelta(days=7)
                    time_filter_clause = func.date(Application.date) >= week_ago
                elif time_filter == 'month':
                    month_ago = today - timedelta(days=30)
                    time_filter_clause = func.date(Application.date) >= month_ago
                    
            # Get the latest status for each application
            latest_status = (
                select(
                    ApplicationStatus.application_id,
                    ApplicationStatus.status,
                    func.row_number().over(
                        partition_by=ApplicationStatus.application_id,
                        order_by=[ApplicationStatus.date.desc(), ApplicationStatus.status_id.desc()]
                    ).label('rn')
                ).subquery()
            )
            
            # Get vehicle types by role counts
            matrix_stmt = (
                select(
                    Application.role,
                    Vehicle.vehicle_type,
                    func.count(Vehicle.plate_no).label('count')
                )
                .join(Vehicle, Application.plate_no == Vehicle.plate_no)
                .join(
                    latest_status,
                    and_(
                        Application.application_id == latest_status.c.application_id,
                        latest_status.c.rn == 1,
                        latest_status.c.status == 'Approved'
                    )
                )
            )
            
            # Apply time filter if specified
            if time_filter_clause is not None:
                matrix_stmt = matrix_stmt.where(time_filter_clause)
                
            matrix_stmt = matrix_stmt.group_by(Application.role, Vehicle.vehicle_type)
            matrix_stmt = matrix_stmt.order_by(Application.role, Vehicle.vehicle_type)
            
            # Execute matrix query
            matrix_result = await self.db.execute(matrix_stmt)
            matrix_data = matrix_result.all()
            
            # Get unique roles and vehicle types for the matrix
            roles = []
            vehicle_types = []
            
            for row in matrix_data:
                if row.role not in roles:
                    roles.append(row.role)
                if row.vehicle_type not in vehicle_types:
                    vehicle_types.append(row.vehicle_type)
            
            # Sort them for consistency
            roles.sort()
            vehicle_types.sort()
            
            # Build role-vehicle matrix with summary calculations
            matrix = []
            vehicle_type_totals = {vt: 0 for vt in vehicle_types}  # To track column totals
            
            for role in roles:
                row_data = {"role": role}
                role_total = 0  # To track row total
                
                # Add count for each vehicle type
                for vehicle_type in vehicle_types:
                    count = 0
                    for item in matrix_data:
                        if item.role == role and item.vehicle_type == vehicle_type:
                            count = item.count
                            break
                            
                    row_data[vehicle_type] = count
                    role_total += count
                    vehicle_type_totals[vehicle_type] += count
                
                # Add row total as last column
                row_data["Total"] = role_total
                matrix.append(row_data)
            
            # Add a summary row for column totals
            summary_row = {"role": "Total"}
            grand_total = 0
            
            for vt in vehicle_types:
                summary_row[vt] = vehicle_type_totals[vt]
                grand_total += vehicle_type_totals[vt]
                
            summary_row["Total"] = grand_total
            matrix.append(summary_row)
            
            # Return the enhanced matrix format with summary row and column
            return {
                "headers": ["Application Role"] + vehicle_types + ["Total"],
                "data": matrix,
                "summary": {
                    "total_vehicles": grand_total,
                    "by_type": vehicle_type_totals,
                    "by_role": {row["role"]: row["Total"] for row in matrix if row["role"] != "Total"}
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting vehicle counts: {str(e)}")
            raise

    async def get_pending_vehicles(self, vehicle_type: str = None) -> List[PendingVehicle]:
        try:
            current_time = datetime.now().date()

            # Subquery to get the latest status_id for each application
            latest_status_ids = (
                select(
                    ApplicationStatus.application_id,
                    func.max(ApplicationStatus.status_id).label('max_status_id')
                )
                .group_by(ApplicationStatus.application_id)
                .subquery()
            )

            # Get applications with latest status pending-like (Pending / Waiting for approval)
            pending_applications = (
                select(
                    Application.application_id,
                    Vehicle.plate_no,
                    Vehicle.vehicle_type,
                    Vehicle.brand,
                    ApplicationStatus.date
                )
                .select_from(ApplicationStatus)
                .join(
                    latest_status_ids,
                    and_(
                        ApplicationStatus.application_id == latest_status_ids.c.application_id,
                        ApplicationStatus.status_id == latest_status_ids.c.max_status_id
                    )
                )
                .join(Application, ApplicationStatus.application_id == Application.application_id)
                .join(Vehicle, Application.plate_no == Vehicle.plate_no)
                .where(ApplicationStatus.status.in_(self.pending_like_statuses))
            )

            # Add vehicle type filter if specified
            if vehicle_type and vehicle_type.lower() not in ['all', 'none']:
                pending_applications = pending_applications.where(Vehicle.vehicle_type == vehicle_type)

            # Order by status date (oldest first)
            pending_applications = pending_applications.order_by(ApplicationStatus.date.asc())

            result = await self.db.execute(pending_applications)
            pending_vehicles = result.all()

            return [
                PendingVehicle(
                    plate_number=row.plate_no,
                    vehicle_type=row.vehicle_type,
                    brand=row.brand,
                    time=f"{(current_time - row.date).days} days"
                )
                for row in pending_vehicles
            ]

        except Exception as e:
            logger.error(f"Error getting pending vehicles: {str(e)}")
            raise
