from datetime import datetime, timedelta
import calendar
from sqlalchemy import func, and_, select  
from app.db.models.sticker import Sticker
from app.db.models.batch_sticker_sessions import BatchStickerSessions
from app.db.models.application import Application
from app.db.models.application_status import ApplicationStatus

class ReportsController:
    def __init__(self, db_session):
        self.db_session = db_session

    async def get_sticker_stats(self):
        # Add year filter
        current_year = datetime.now().year
        # Initialize data structure
        chart_data = {
            "employee": {"available": 0, "used": 0},
            "drop-off": {"available": 0, "used": 0},
            "student": {"available": 0, "used": 0},
            "concessionaire": {"available": 0, "used": 0}
        }
        
        # Get all batches
        batches = await self.db_session.execute(
            select(BatchStickerSessions)
        )
        batches = batches.scalars().all()

        for batch in batches:
            total_range = batch.end_at - batch.start_at + 1
            
            # Get latest status subquery
            latest_status_subquery = (
                select(
                    ApplicationStatus.application_id,
                    ApplicationStatus.status
                ).distinct(
                    ApplicationStatus.application_id
                ).where(
                    func.extract('year', ApplicationStatus.date) == current_year
                ).order_by(
                    ApplicationStatus.application_id,
                    ApplicationStatus.date.desc()
                ).subquery()
            )

            # Count used stickers
            used_stickers = await self.db_session.execute(
                select(func.count(Sticker.id))
                .select_from(Sticker)
                .join(Application, Application.sticker_id == Sticker.id)
                .join(latest_status_subquery, 
                      latest_status_subquery.c.application_id == Application.application_id)
                .where(
                    and_(
                        Sticker.batch_id == batch.batch_id,
                        latest_status_subquery.c.status.in_(["Approved", "Pending"])
                    )
                )
            )
            
            used_count = used_stickers.scalar() or 0
            available_count = total_range - used_count
            
            # Map batch types to chart categories
            batch_type = batch.type.lower()
            if "employee" in batch_type:
                chart_data["employee"]["available"] += available_count
                chart_data["employee"]["used"] += used_count
            elif "drop" in batch_type:
                chart_data["drop-off"]["available"] += available_count
                chart_data["drop-off"]["used"] += used_count
            elif "student" in batch_type or "graduate" in batch_type:
                chart_data["student"]["available"] += available_count
                chart_data["student"]["used"] += used_count
            elif "concessionaire" in batch_type:
                chart_data["concessionaire"]["available"] += available_count
                chart_data["concessionaire"]["used"] += used_count

        # Format data for frontend chart
        return {
            "series": [
                {
                    "name": "Available",
                    "data": [
                        chart_data["employee"]["available"],
                        chart_data["drop-off"]["available"],
                        chart_data["student"]["available"],
                        chart_data["concessionaire"]["available"]
                    ]
                },
                {
                    "name": "Used",
                    "data": [
                        chart_data["employee"]["used"],
                        chart_data["drop-off"]["used"],
                        chart_data["student"]["used"],
                        chart_data["concessionaire"]["used"]
                    ]
                }
            ],
            "categories": ["Employee", "Drop-off", "Student", "Concessionaire"]
        }

    async def get_payment_stats(self):
        try:
            # Add year filter
            current_year = datetime.now().year
            
            # Initialize data structure
            chart_data = {
                "employee": {"sold": 0, "expected": 0},
                "drop-off": {"sold": 0, "expected": 0},
                "student": {"sold": 0, "expected": 0},
                "concessionaire": {"sold": 0, "expected": 0}
            }
            
            total_sold = 0
            total_expected = 0

            # Use row_number for more reliable status identification
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

            # Get all batches
            batches = await self.db_session.execute(
                select(BatchStickerSessions)
            )
            batches = batches.scalars().all()

            for batch in batches:
                batch_type = batch.type.lower()
                type_key = None
                
                # More precise mapping of batch types to categories
                if "employee" in batch_type and "drop" not in batch_type and "student" not in batch_type:
                    type_key = "employee"
                elif "drop" in batch_type:
                    type_key = "drop-off"
                elif "student" in batch_type or "graduate" in batch_type:
                    type_key = "student"
                elif "concessionaire" in batch_type:
                    type_key = "concessionaire"
                
                if not type_key:
                    continue  # Skip if we can't categorize

                # Better query for approved applications
                approved_stmt = (
                    select(func.count(Application.application_id))
                    .select_from(Application)
                    .join(Sticker, Application.sticker_id == Sticker.id)
                    .join(
                        latest_status,
                        and_(
                            Application.application_id == latest_status.c.application_id,
                            latest_status.c.rn == 1,
                            latest_status.c.status == "Approved"
                        )
                    )
                    .where(
                        and_(
                            Sticker.batch_id == batch.batch_id,
                            func.extract('year', Application.date) == current_year
                        )
                    )
                )
                
                # Better query for pending applications
                pending_stmt = (
                    select(func.count(Application.application_id))
                    .select_from(Application)
                    .join(Sticker, Application.sticker_id == Sticker.id)
                    .join(
                        latest_status,
                        and_(
                            Application.application_id == latest_status.c.application_id,
                            latest_status.c.rn == 1,
                            latest_status.c.status == "Pending"
                        )
                    )
                    .where(
                        and_(
                            Sticker.batch_id == batch.batch_id,
                            func.extract('year', Application.date) == current_year
                        )
                    )
                )
                
                approved_count = await self.db_session.scalar(approved_stmt) or 0
                pending_count = await self.db_session.scalar(pending_stmt) or 0

                # Calculate totals
                approved_amount = approved_count * batch.price
                expected_amount = pending_count * batch.price

                # Add to running totals
                total_sold += approved_amount
                total_expected += expected_amount
                
                # Add to category totals
                chart_data[type_key]["sold"] += approved_amount
                chart_data[type_key]["expected"] += expected_amount

            # Modified calculation
            grand_total = total_expected + total_sold 

            return {
                "series": [
                    {
                        "name": "Pending",
                        "data": [
                            chart_data["employee"]["expected"],
                            chart_data["drop-off"]["expected"],
                            chart_data["student"]["expected"],
                            chart_data["concessionaire"]["expected"]
                        ]
                    },
                    {
                        "name": "Sold",
                        "data": [
                            chart_data["employee"]["sold"],
                            chart_data["drop-off"]["sold"],
                            chart_data["student"]["sold"],
                            chart_data["concessionaire"]["sold"]
                        ]
                    }
                ],
                "categories": ["Employee", "Drop-off", "Student", "Concessionaire"],
                "summary": {
                    "expect_total": grand_total,    
                    "sold_total": total_sold        
                }
            }
        except Exception as e:
            logger.error(f"Error getting payment stats: {str(e)}")
            raise

    async def get_weekly_application_stats(self, filter_type: str = "year"):
        today = datetime.now().date()
        
        if (filter_type == "week"):
            # Start from 6 days ago up to today
            dates = []
            approved_data = []
            pending_data = []

            # Get daily data for past week ending today
            for i in range(6, -1, -1):  # 6,5,4,3,2,1,0
                current_date = today - timedelta(days=i)
                dates.append(current_date.strftime('%A'))  # Full day name
                
                # This is wrong! We shouldn't filter by status date but by application date
                # Create subquery for applications created on this date
                applications_on_date = (
                    select(Application.application_id)
                    .where(func.date(Application.date) == current_date)
                    .subquery()
                )
                
                # Get the latest status for each application regardless of status date
                latest_status = (
                    select(
                        ApplicationStatus.application_id,
                        ApplicationStatus.status,
                        func.row_number().over(
                            partition_by=ApplicationStatus.application_id,
                            order_by=[ApplicationStatus.date.desc(), ApplicationStatus.status_id.desc()]
                        ).label('rn')
                    )
                    .subquery()
                )
                
                # Join with applications created on this date
                filtered_status = (
                    select(
                        latest_status.c.application_id,
                        latest_status.c.status
                    )
                    .select_from(latest_status)
                    .join(
                        applications_on_date,
                        latest_status.c.application_id == applications_on_date.c.application_id
                    )
                    .where(latest_status.c.rn == 1)
                    .subquery()
                )
                
                approved, pending = await self._get_status_counts(filtered_status)
                
                approved_data.append(approved)
                pending_data.append(pending)
        
        elif filter_type == "month":
            # Get current month's dates
            start_date = today.replace(day=1)
            _, last_day = calendar.monthrange(today.year, today.month)
            
            # Get the number of weeks in current month
            first_day_weekday = start_date.weekday()
            total_days = last_day
            num_weeks = (total_days + first_day_weekday + 6) // 7
            
            # Initialize arrays with correct size
            dates = [f"Week {i+1}" for i in range(num_weeks)]
            approved_data = [0] * num_weeks
            pending_data = [0] * num_weeks
            
            # Get all applications created this month
            applications_in_month = (
                select(
                    Application.application_id,
                    func.extract('day', Application.date).label('day')
                )
                .where(
                    and_(
                        func.extract('year', Application.date) == today.year,
                        func.extract('month', Application.date) == today.month
                    )
                )
                .subquery()
            )
            
            # Get latest status for all applications
            latest_status = (
                select(
                    ApplicationStatus.application_id,
                    ApplicationStatus.status,
                    func.row_number().over(
                        partition_by=ApplicationStatus.application_id,
                        order_by=[ApplicationStatus.date.desc(), ApplicationStatus.status_id.desc()]
                    ).label('rn')
                )
                .subquery()
            )
            
            # Filter to only the latest status per application
            filtered_status = (
                select(
                    applications_in_month.c.application_id,
                    applications_in_month.c.day,
                    latest_status.c.status
                )
                .select_from(applications_in_month)
                .join(
                    latest_status,
                    applications_in_month.c.application_id == latest_status.c.application_id
                )
                .where(latest_status.c.rn == 1)
                .subquery()
            )
            
            # Query for statuses
            result = await self.db_session.execute(
                select(
                    filtered_status.c.day,
                    filtered_status.c.status,
                    func.count().label('count')
                )
                .group_by(filtered_status.c.day, filtered_status.c.status)
            )
            day_status_counts = result.all()
            
            # Group by week
            for day_status in day_status_counts:
                day = int(day_status.day)
                status = day_status.status
                count = day_status.count
                
                # Calculate which week this day belongs to (0-based)
                week_num = (day + first_day_weekday - 1) // 7
                
                # Add count to appropriate week and status
                if status == "Approved":
                    approved_data[week_num] += count
                elif status == "Pending":
                    pending_data[week_num] += count
        
        else:  # year - this already works correctly
            # Create month labels
            dates = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
            
            approved_data = []
            pending_data = []
            
            # Get all applications with a specific month
            applications_in_year = (
                select(
                    Application.application_id,
                    func.extract('month', Application.date).label('month')
                )
                .where(func.extract('year', Application.date) == today.year)
                .subquery()
            )
            
            # Get all application statuses with their row numbers
            latest_status = (
                select(
                    ApplicationStatus.application_id,
                    ApplicationStatus.status,
                    func.row_number().over(
                        partition_by=ApplicationStatus.application_id,
                        order_by=[ApplicationStatus.date.desc(), ApplicationStatus.status_id.desc()]
                    ).label('rn')
                )
                .subquery()
            )
            
            # Join applications with their latest status
            filtered_status = (
                select(
                    applications_in_year.c.month,
                    latest_status.c.status
                )
                .select_from(applications_in_year)
                .join(
                    latest_status,
                    applications_in_year.c.application_id == latest_status.c.application_id
                )
                .where(latest_status.c.rn == 1)
                .subquery()
            )
            
            # Count by month and status
            result = await self.db_session.execute(
                select(
                    filtered_status.c.month,
                    filtered_status.c.status,
                    func.count().label('count')
                )
                .group_by(filtered_status.c.month, filtered_status.c.status)
            )
            month_status_counts = result.all()
            
            # Initialize month counts
            month_approved = [0] * 12
            month_pending = [0] * 12
            
            # Fill in the counts
            for month_status in month_status_counts:
                month = int(month_status.month) - 1  # Convert to 0-based
                status = month_status.status
                count = month_status.count
                
                if status == "Approved":
                    month_approved[month] = count
                elif status == "Pending":
                    month_pending[month] = count
            
            approved_data = month_approved
            pending_data = month_pending

        return {
            "categories": dates,
            "series": [
                {
                    "name": "Approved Applications",
                    "color": "#2962FF",
                    "data": approved_data
                },
                {
                    "name": "Pending Applications",
                    "color": "#FF6D00",
                    "data": pending_data
                }
            ],
            "yAxis": {
                "min": 0,
                "max": max(max(approved_data or [0]), max(pending_data or [0])) + 100,
                "steps": 100
            }
        }

    async def _get_status_counts(self, status_subquery):
        # Get approved count
        approved = await self.db_session.execute(
            select(func.count(status_subquery.c.application_id))
            .select_from(status_subquery)
            .where(status_subquery.c.status == "Approved")
        )

        # Get pending count
        pending = await self.db_session.execute(
            select(func.count(status_subquery.c.application_id))
            .select_from(status_subquery)
            .where(status_subquery.c.status == "Pending")
        )

        return approved.scalar() or 0, pending.scalar() or 0

    def _get_status_subquery(self, current_date, filter_type="day"):
        if filter_type == "year":
            date_filter = and_(
                func.extract('year', ApplicationStatus.date) == current_date.year,
                func.extract('month', ApplicationStatus.date) == current_date.month
            )
        else:
            date_filter = ApplicationStatus.date == current_date

        return (
            select(
                ApplicationStatus.application_id,
                ApplicationStatus.status
            ).distinct(
                ApplicationStatus.application_id
            ).order_by(
                ApplicationStatus.application_id,
                ApplicationStatus.date.desc()
            ).where(date_filter).subquery()
        )

    async def get_sticker_distribution(self):
        # Add year filter
        current_year = datetime.now().year
        batches = await self.db_session.execute(
            select(BatchStickerSessions)
        )
        batches = batches.scalars().all()
        
        # Initialize counters
        distribution = {
            "total_employee": 0,
            "total_drop-off": 0,
            "total_student": 0,
            "total_concessionaire": 0,
            "total_available": 0
        }

        for batch in batches:
            # Get latest status subquery
            latest_status_subquery = (
                select(
                    ApplicationStatus.application_id,
                    ApplicationStatus.status
                ).distinct(
                    ApplicationStatus.application_id
                ).where(
                    func.extract('year', ApplicationStatus.date) == current_year
                ).order_by(
                    ApplicationStatus.application_id,
                    ApplicationStatus.date.desc()
                ).subquery()
            )

            # Count approved applications for this batch
            approved_stickers = await self.db_session.execute(
                select(func.count(Sticker.id))
                .select_from(Sticker)
                .join(Application, Application.sticker_id == Sticker.id)
                .join(latest_status_subquery, 
                      latest_status_subquery.c.application_id == Application.application_id)
                .where(
                    and_(
                        Sticker.batch_id == batch.batch_id,
                        latest_status_subquery.c.status == "Approved"
                    )
                )
            )
            
            approved_count = approved_stickers.scalar() or 0
            total_range = batch.end_at - batch.start_at + 1
            
            # Map batch types to distribution categories
            batch_type = batch.type.lower()
            if "employee" in batch_type:
                distribution["total_employee"] += approved_count
            elif "drop" in batch_type:
                distribution["total_drop-off"] += approved_count
            elif "student" in batch_type or "graduate" in batch_type:
                distribution["total_student"] += approved_count
            elif "concessionaire" in batch_type:
                distribution["total_concessionaire"] += approved_count
                
            # Add available stickers to total
            pending_stickers = await self.db_session.execute(
                select(func.count(Sticker.id))
                .select_from(Sticker)
                .join(Application, Application.sticker_id == Sticker.id)
                .join(latest_status_subquery, 
                      latest_status_subquery.c.application_id == Application.application_id)
                .where(
                    and_(
                        Sticker.batch_id == batch.batch_id,
                        latest_status_subquery.c.status == "Pending"
                    )
                )
            )
            pending_count = pending_stickers.scalar() or 0
            distribution["total_available"] += pending_count

        # Format for donut chart
        return {
            "series": list(distribution.values()),
            "colors": [
                "#1C3D5A",  # Employee
                "#6B21A8",  # Drop-off
                "#FACC15",  # Student
                "#FB923C",  # Concessionaire
                "#D1D5DB"   # Available
            ],
            "chart": {
                "type": "donut"
            },
            "labels": [
                "Employee",
                "Drop-off",
                "Student",
                "Concessionaire",
                "Available"
            ],
            "distribution": distribution  
        }