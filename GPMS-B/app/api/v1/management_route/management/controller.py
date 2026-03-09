from datetime import datetime, timedelta
from typing import Dict, Any
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased
from fastapi import HTTPException 
import logging
from uuid import UUID  # Add this import
from app.db.models.application import Application
from app.db.models.application_status import ApplicationStatus
from app.db.models.user import User
from app.db.models.profile import Profile
from app.db.models.vehicle import Vehicle
from app.db.models.sticker import Sticker
from app.utils.image import get_vehicle_image_url, get_profile_image_url  # Add this import
from app.db.models.document import Document
from app.db.models.slip import Slip
from sqlalchemy.orm import joinedload

logger = logging.getLogger(__name__)

class ManagementController:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_approved_applications(
        self, 
        sticker_id: str | None = None,
        vehicle_type: str | None = None,
        time_filter: str | None = None
    ) -> Dict[str, Any]:
        try:
            # Add count check for approved statuses
            count_query = select(func.count(ApplicationStatus.application_id)).where(
                ApplicationStatus.status == 'Approved'
            )
            total_approved = await self.db.scalar(count_query)
            logger.info(f"Total approved applications found: {total_approved}")

            # Get latest approved status subquery
            latest_status = (
                select(
                    ApplicationStatus.application_id,
                    ApplicationStatus.status,
                    ApplicationStatus.date
                )
                .distinct(ApplicationStatus.application_id)
                .where(ApplicationStatus.status == 'Approved')
                .order_by(
                    ApplicationStatus.application_id,
                    ApplicationStatus.date.desc()
                )
                .subquery()
            )

            # Add debug logging for the subquery
            subquery_count = select(func.count()).select_from(latest_status)
            approved_count = await self.db.scalar(subquery_count)
            logger.info(f"Applications after latest status filter: {approved_count}")

            # Create aliases first
            ApproverUser = aliased(User, name='approver_user')
            ApproverProfile = aliased(Profile, name='approver_profile')

            # Main query
            stmt = (
                select(
                    Application,
                    Profile.profile_id.label('profile_id'),  # Add this line
                    Profile.first_name.label('applicant_first_name'),
                    Profile.last_name.label('applicant_last_name'),
                    Profile.birth_date.label('birth_date'),  # Add birth_date
                    Profile.sex.label('sex'),                # Add sex
                    Vehicle,
                    Sticker,
                    latest_status.c.date.label('approved_date'),
                    func.concat(
                        ApproverProfile.first_name, 
                        ' ', 
                        ApproverProfile.last_name
                    ).label('approver_name')
                )
                .join(User, Application.user_id == User.user_id)
                .join(Profile, User.user_id == Profile.user_id)
                .join(Vehicle, Application.plate_no == Vehicle.plate_no)
                .outerjoin(Sticker, Application.sticker_id == Sticker.id)
                .outerjoin(Document, Application.application_id == Document.application_id)  # Add this
                .outerjoin(Slip, Application.slip_id == Slip.slip_id)  # Add this
                .join(
                    latest_status,
                    Application.application_id == latest_status.c.application_id
                )
                .join(
                    ApplicationStatus,
                    and_(
                        Application.application_id == ApplicationStatus.application_id,
                        ApplicationStatus.status == 'Approved'
                    )
                )
                .outerjoin(
                    ApproverUser,
                    ApplicationStatus.processed_by == ApproverUser.user_id
                )
                .outerjoin(
                    ApproverProfile,
                    ApproverUser.user_id == ApproverProfile.user_id
                )
                .where(User.role == 2)
                .order_by(latest_status.c.date.desc())
                .options(
                    joinedload(Application.documents),
                    joinedload(Application.slip)
                )
            )

            # Add filters
            if sticker_id:
                stmt = stmt.where(Sticker.sticker_id == sticker_id)
                
            if vehicle_type:
                if (vehicle_type.lower() != 'all'):  # Add case-insensitive check for 'all'
                    stmt = stmt.where(Vehicle.vehicle_type == vehicle_type)
                
            if time_filter:
                today = datetime.now().date()
                time_filter = time_filter.lower()  # Convert to lowercase for case-insensitive comparison
                if time_filter == "today":
                    stmt = stmt.where(func.date(latest_status.c.date) == today)
                elif time_filter == "week":
                    week_ago = today - timedelta(days=7)
                    stmt = stmt.where(func.date(latest_status.c.date) >= week_ago)
                elif time_filter == "month":
                    month_ago = today - timedelta(days=30)
                    stmt = stmt.where(func.date(latest_status.c.date) >= month_ago)
                elif time_filter == "year":
                    year_ago = today - timedelta(days=365)
                    stmt = stmt.where(func.date(latest_status.c.date) >= year_ago)

            result = await self.db.execute(stmt)
            applications = result.unique().all()  
            
            logger.info(f"Final number of applications returned: {len(applications)}")

            # Format response
            approved_applications = []
            for app in applications:
                # Calculate age using the labeled birth_date
                today = datetime.now().date()
                age = today.year - app.birth_date.year - (
                    (today.month, today.day) < 
                    (app.birth_date.month, app.birth_date.day)
                )

                application_data = {
                    "application_id": app.Application.application_id,
                    "approved_by": app.approver_name if app.approver_name else None,
                    "date": app.approved_date.strftime("%Y-%m-%d") if app.approved_date else None,
                    "applicant": {
                        "name": f"{app.applicant_first_name} {app.applicant_last_name}",
                        "role": app.Application.role,
                        "sex": app.sex,  # Use labeled sex field
                        "age": age,
                        "profile_img": get_profile_image_url(app.profile_id),  # Moved inside applicant
                        "vehicle": {
                            "plate_no": app.Vehicle.plate_no,
                            "brand": app.Vehicle.brand,
                            "model": app.Vehicle.model,
                            "vehicle_type": app.Vehicle.vehicle_type,
                            "front_image": await get_vehicle_image_url(
                                app.Vehicle.plate_no, 
                                "front",
                                self.db
                            ),
                            "back_image": await get_vehicle_image_url(
                                app.Vehicle.plate_no, 
                                "back",
                                self.db
                            ),
                            "sticker": {
                                "sticker_id": app.Sticker.sticker_id
                            } if app.Sticker else None
                        }
                    },
                    # Add these new fields
                    "documents": [
                        {
                            "document_id": doc.document_id,
                            "type": doc.type,
                            "image": f"/api/v1/staff/document/{doc.document_id}/image"
                        }
                        for doc in app.Application.documents
                    ] if hasattr(app.Application, 'documents') and app.Application.documents else [],
                    "slip": {
                        "slip_id": app.Application.slip.slip_id,
                        "image": f"/api/v1/staff/slip/{app.Application.slip.slip_id}/image" 
                            if app.Application.slip and app.Application.slip.image else None,
                        "official_receipt": app.Application.slip.official_receipt,
                        "amount": app.Application.slip.total_amount,
                        "nature_of_payment": app.Application.slip.nature_of_payment
                    } if hasattr(app.Application, 'slip') and app.Application.slip else None,
                    "has_uploaded_receipt": bool(
                        hasattr(app.Application, 'slip')
                        and app.Application.slip
                        and app.Application.slip.image
                    )
                }
                approved_applications.append(application_data)

            return {"approved_applications": approved_applications}
        except Exception as e:
            raise e

    async def get_applicant_history(
        self, 
        applicant_id: str,
        sticker_number: str | None = None,
        date: str | None = None,  
        vehicle_type: str | None = None,  
        time_filter: str | None = None  
    ) -> Dict[str, Any]:
        try:
            user_id = UUID(applicant_id) if isinstance(applicant_id, str) else applicant_id
            
            # Subquery to get the latest status for each application
            latest_status = (
                select(
                    ApplicationStatus.application_id,
                    ApplicationStatus.status,
                    ApplicationStatus.remarks,
                    ApplicationStatus.date,
                    func.row_number().over(
                        partition_by=ApplicationStatus.application_id,
                        order_by=[
                            ApplicationStatus.date.desc(),
                            ApplicationStatus.status_id.desc()
                        ]
                    ).label('rn')
                ).subquery()
            )

            # Main query
            stmt = (
                select(
                    Application,
                    Profile.first_name,
                    Profile.last_name,
                    Vehicle,
                    Sticker.sticker_id,
                    latest_status.c.status,
                    latest_status.c.remarks,
                    latest_status.c.date.label('submitted_date')
                )
                .join(User, Application.user_id == User.user_id)
                .join(Profile, User.user_id == Profile.user_id)
                .join(Vehicle, Application.plate_no == Vehicle.plate_no)
                .outerjoin(Sticker, Application.sticker_id == Sticker.id)
                # Add this line to include documents
                .options(
                    joinedload(Application.documents),
                    joinedload(Application.slip)
                )
                .join(
                    latest_status,
                    and_(
                        Application.application_id == latest_status.c.application_id,
                        latest_status.c.rn == 1
                    )
                )
                .where(
                    and_(
                        User.user_id == user_id,
                        User.role == 2
                    )
                )
            )

            # Add sticker number filter
            if sticker_number:
                stmt = stmt.where(Sticker.sticker_id == sticker_number)

            # Update the date filter section
            if date:  # Changed from date_filter
                try:
                    # Parse date string in format YYYY-MM-DD
                    filter_date = datetime.strptime(date, "%Y-%m-%d").date()  # Changed from date_filter
                    stmt = stmt.where(func.date(latest_status.c.date) == filter_date)
                except ValueError:
                    raise HTTPException(
                        status_code=400,
                        detail="Invalid date format. Use YYYY-MM-DD (e.g., 2025-02-27)"
                    )

            # Add vehicle type filter
            if vehicle_type:
                stmt = stmt.where(Vehicle.vehicle_type == vehicle_type)

            if time_filter:
                today = datetime.now().date()
                time_filter = time_filter.lower()  # Convert to lowercase for case-insensitive comparison
                if time_filter == "today":
                    stmt = stmt.where(func.date(latest_status.c.date) == today)
                elif time_filter == "week":
                    week_ago = today - timedelta(days=7)
                    stmt = stmt.where(func.date(latest_status.c.date) >= week_ago)
                elif time_filter == "month":
                    month_ago = today - timedelta(days(30))
                    stmt = stmt.where(func.date(latest_status.c.date) >= month_ago)
                elif time_filter == "year":
                    year_ago = today - timedelta(days(365))
                    stmt = stmt.where(func.date(latest_status.c.date) >= year_ago)

            stmt = stmt.order_by(latest_status.c.date.desc())

            result = await self.db.execute(stmt)
            applications = result.unique().all()

            application_history = []
            for app in applications:
                application_data = {
                    "application_id": app.Application.application_id,
                    "applicant_name": f"{app.first_name} {app.last_name}",
                    "plate_number": app.Vehicle.plate_no,
                    "model": app.Vehicle.model,
                    "brand": app.Vehicle.brand,
                    "color": app.Vehicle.color,
                    "vehicle_type": app.Vehicle.vehicle_type,
                    "sticker_number": app.sticker_id,
                    "date_submitted": app.submitted_date.strftime("%Y-%m-%d") if app.submitted_date else None,  # Modified this line
                    "status": app.status,
                    "is_rejected": (app.status or "").strip().lower() == "rejected",
                    "remarks": app.remarks,
                    "rejection_remarks": app.remarks if (app.status or "").strip().lower() == "rejected" else None,
                    "front_image": await get_vehicle_image_url(
                        app.Vehicle.plate_no, 
                        "front",
                        self.db
                    ),
                    "back_image": await get_vehicle_image_url(
                        app.Vehicle.plate_no, 
                        "back",
                        self.db
                    ),
                    "documents": [
                        {
                            "document_id": doc.document_id,
                            "type": doc.type,
                            "image_url": f"/api/v1/staff/document/{doc.document_id}/image"
                        }
                        for doc in app.Application.documents
                    ] if hasattr(app.Application, 'documents') and app.Application.documents else [],
                    "slip": {
                        "slip_id": app.Application.slip.slip_id,
                        "image": f"/api/v1/staff/slip/{app.Application.slip.slip_id}/image"
                            if app.Application.slip and app.Application.slip.image else None,
                        "amount": app.Application.slip.total_amount,
                        "official_receipt": app.Application.slip.official_receipt,
                        "date": app.Application.slip.date.strftime("%Y-%m-%d")
                            if app.Application.slip and app.Application.slip.date else None,
                    } if hasattr(app.Application, 'slip') and app.Application.slip else None
                }
                application_history.append(application_data)

            return {"applications": application_history}
        except HTTPException as http_ex:
            # Re-raise HTTP exceptions directly
            raise http_ex
        except Exception as e:
            logger.error(f"Error getting applicant history: {str(e)}", exc_info=True)
            raise HTTPException(status_code=500, detail="Internal server error")
