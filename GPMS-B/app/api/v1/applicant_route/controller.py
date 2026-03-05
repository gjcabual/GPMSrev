from typing import List, Optional, Dict  # Add this import at the top
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.application import ApplicationCreate, ApplicationUpdate  # Add ApplicationUpdate here
from app.db.models.application import Application
from app.db.models.vehicle import Vehicle
from app.db.models.document import Document
from app.db.models.auth_driver import AuthDriver
from app.db.models.application_status import ApplicationStatus
from app.db.models.slip import Slip
from app.db.models.assigned_driver import AssignedDriver  # Add this import
from app.db.models.profile import Profile  # Add this import
from app.db.models.sticker import Sticker  # Add this import
from datetime import datetime, timedelta, date
from fastapi import HTTPException
from uuid import UUID
from sqlalchemy import select, and_, not_, exists, cast, Date, update, delete, or_, func  
from base64 import b64encode
import secrets
from app.utils.email import send_verification_email
from app.db.repositories.token import create_verification_token, get_valid_verification_token, delete_used_token
from app.db.repositories.user import get_user_by_email, update_user_email
from app.db.repositories.profile import get_profile_by_user_id, update_profile, create_profile, update_profile_image
from fastapi import status
from app.db.models.user import User
from app.db.models.batch_sticker_sessions import BatchStickerSessions
from app.utils.email import send_payment_slip_email  
import random 
from app.utils.application_utils import cleanup_stale_applications
import logging

logger = logging.getLogger(__name__)

ROLE_PRICE_DEFAULTS = {
    "Student": 50.0,
    "Employee Parking": 50.0,
    "Drop Off": 50.0,
    "Concessionaire": 100.0,
}

ROLE_ALIASES = {
    "STUDENT": "Student",
    "EMPLOYEE": "Employee Parking",
    "EMPLOYEE PARKING": "Employee Parking",
    "EMPLOYEE_PARKING": "Employee Parking",
    "DROP OFF": "Drop Off",
    "DROP-OFF": "Drop Off",
    "DROPOFF": "Drop Off",
    "DROP_OFF": "Drop Off",
    "CONCESSIONAIRE": "Concessionaire",
}


class ApplicantController:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def check_vehicle_exists(self, plate_no: str) -> bool:
        query = select(Vehicle).where(Vehicle.plate_no == plate_no)
        result = await self.db.execute(query)
        return result.scalar() is not None

    async def create_application(
        self, 
        application_data: ApplicationCreate, 
        user_id: UUID,
        driver_ids: List[int] = None
    ) -> Dict:
        try:
            # Run cleanup first
            deleted_count = await cleanup_stale_applications(self.db)
            if deleted_count:
                logger.info("Cleanup completed: %s stale applications removed", deleted_count)
            now_datetime = datetime.now()
            
            current_date = datetime.now().date()
            
            # Calculate expiration date (1 year from now)
            expiration_date = current_date + timedelta(days=365)
            
            try:
                # Check if vehicle exists
                vehicle_exists = await self.check_vehicle_exists(application_data.plate_no)
                
                if not vehicle_exists:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Vehicle with plate number {application_data.plate_no} not found"
                    )

                # Create Application
                application = Application(
                    role=application_data.role,
                    building_name=application_data.building_name,
                    app_type=application_data.app_type,
                    date=datetime.now(),
                    expired_at=datetime(datetime.now().year, 12, 31, 23, 59, 59),
                    user_id=user_id,
                    plate_no=application_data.plate_no
                )
                self.db.add(application)
                await self.db.flush()


                # Create User's Application Documents (OR, CR, DL)
                for doc_data in application_data.documents:
                    document = Document(
                        type=doc_data.type,
                        image=doc_data.image,
                        registered_date=doc_data.registered_date,
                        expired_at=doc_data.expired_at,
                        plate_no=application_data.plate_no,
                        user_id=user_id,
                        application_id=application.application_id  # Add this line
                    )
                    self.db.add(document)
                    await self.db.flush()

                # Handle driver assignments if provided
                if driver_ids:
                    # Verify all drivers exist and belong to user
                    driver_query = select(AuthDriver).where(
                        and_(
                            AuthDriver.auth_driver_id.in_(driver_ids),
                            AuthDriver.user_id == user_id
                        )
                    )
                    driver_result = await self.db.execute(driver_query)
                    drivers = driver_result.scalars().all()

                    # Check if all drivers were found
                    found_driver_ids = {d.auth_driver_id for d in drivers}
                    missing_driver_ids = set(driver_ids) - found_driver_ids
                    if missing_driver_ids:
                        raise HTTPException(
                            status_code=404,
                            detail=f"Drivers not found or unauthorized: {missing_driver_ids}"
                        )

                    # Create assignments for each driver
                    for driver_id in driver_ids:
                        assigned_driver = AssignedDriver(
                            assigned_at=datetime.utcnow(),
                            auth_driver_id=driver_id,
                            application_id=application.application_id
                        )
                        self.db.add(assigned_driver)

                # Create initial Pending status so the application appears in staff/admin pending lists
                initial_status = ApplicationStatus(
                    status="Pending",
                    date=current_date,
                    application_id=application.application_id,
                    processed_by=None
                )
                self.db.add(initial_status)

                await self.db.commit()

                # Format response with both application and driver details
                result = {
                    "application_id": application.application_id,
                    "role": application.role,
                    "building_name": application.building_name,
                    "app_type": application.app_type,
                    "date": application.date,
                    "expired_at": application.expired_at,
                    "plate_no": application.plate_no,
                    "documents": [],
                    "assigned_drivers": []  
                }

                # Get documents
                doc_query = (
                    select(Document)
                    .where(Document.application_id == application.application_id)
                    .order_by(Document.document_id.desc())
                )
                docs = await self.db.execute(doc_query)
                for doc in docs.scalars():
                    result["documents"].append({
                        "document_id": doc.document_id,
                        "type": doc.type,
                        "image_url": f"/api/v1/applicant/document/{doc.document_id}/image",
                        "registered_date": doc.registered_date,
                        "expired_at": doc.expired_at
                    })

                # Get assigned drivers if any
                if driver_ids:
                    driver_query = (
                        select(AuthDriver)
                        .where(AuthDriver.auth_driver_id.in_(driver_ids))
                    )
                    drivers = await self.db.execute(driver_query)
                    for driver in drivers.scalars():
                        result["assigned_drivers"].append({
                            "driver_id": driver.auth_driver_id,
                            "name": f"{driver.first_name} {driver.last_name}",
                            "profile_url": f"/api/v1/applicant/authorized-driver/{driver.auth_driver_id}/profile-image"
                        })

                return result

            except Exception as e:
                await self.db.rollback()
                raise HTTPException(status_code=400, detail=str(e))

        except Exception as e:
            await self.db.rollback()
            raise HTTPException(status_code=400, detail=str(e))

    async def get_sticker_price_by_role(self, role: str) -> float:
        """Get the current sticker price for the given role type"""
        try:
            normalized_role = ROLE_ALIASES.get(
                str(role or "").strip().upper(),
                str(role or "").strip(),
            )

            # Query the latest batch session for the role type
            query = (
                select(BatchStickerSessions)
                .where(BatchStickerSessions.type == normalized_role)
                .order_by(BatchStickerSessions.created_at.desc())
                .limit(1)
            )
            
            result = await self.db.execute(query)
            batch = result.scalar_one_or_none()
            
            if batch:
                return float(batch.price)

            # Role-specific default price if no batch exists yet for this role.
            return float(ROLE_PRICE_DEFAULTS.get(normalized_role, 50.0))

        except Exception as e:
            logger.warning("Error getting sticker price: %s", e)
            normalized_role = ROLE_ALIASES.get(
                str(role or "").strip().upper(),
                str(role or "").strip(),
            )
            return float(ROLE_PRICE_DEFAULTS.get(normalized_role, 50.0))

    async def send_initial_payment_slip(self, application_id: int, user_id: UUID) -> dict:
        """
        Send the initial payment slip email for a specific application.
        This can be triggered from the dashboard via a \"Get Payment Slip\" action.
        """
        try:
            # Fetch application and verify ownership
            query = select(Application).where(Application.application_id == application_id)
            result = await self.db.execute(query)
            application = result.scalar_one_or_none()

            if not application:
                raise HTTPException(status_code=404, detail="Application not found")

            if application.user_id != user_id:
                raise HTTPException(status_code=403, detail="You are not authorized to access this application")

            # Check current status
            status_query = select(ApplicationStatus.status).where(
                ApplicationStatus.application_id == application_id
            )
            status_result = await self.db.execute(status_query)
            status_row = status_result.first()
            app_status = status_row[0] if status_row else None

            # Only allow requesting slip when application is Pending and no slip has been attached
            if app_status is not None and app_status not in ("Pending", "Waiting for approval"):
                raise HTTPException(
                    status_code=400,
                    detail="Payment slip can only be requested while the application is in Pending status"
                )
            if application.slip_id is not None:
                raise HTTPException(
                    status_code=400,
                    detail="A payment slip has already been attached for this application"
                )

            # Get estimated price based on role and send email
            estimated_price = await self.get_sticker_price_by_role(application.role)

            slip_sent = await send_payment_slip_email(
                db=self.db,
                user_id=user_id,
                nature_of_payment=f"New Parking Sticker Application ({application.role})",
                total_amount=estimated_price,
            )

            if not slip_sent:
                raise HTTPException(
                    status_code=400,
                    detail="Payment slip email could not be sent. Please contact support."
                )

            # Add a new status entry for "Waiting for approval"
            current_date = datetime.utcnow().date()
            waiting_status = ApplicationStatus(
                status="Waiting for approval",
                date=current_date,
                application_id=application.application_id,
                processed_by=None
            )
            self.db.add(waiting_status)
            await self.db.commit()

            return {"message": "Payment slip has been sent to your email."}

        except HTTPException as he:
            raise he
        except Exception as e:
            logger.exception("Error in send_initial_payment_slip: %s", e)
            raise HTTPException(status_code=400, detail=str(e))
            
        except Exception as e:
            logger.warning("Error getting sticker price: %s", e)
            # Return a reasonable default if there's an error
            return 500.00

    async def delete_application(self, application_id: int, user_id: UUID):
        try:
            # Get the application
            query = select(Application).where(Application.application_id == application_id)
            result = await self.db.execute(query)
            application = result.first()

            if not application:
                raise HTTPException(
                    status_code=404,
                    detail="Application not found"
                )

            # Ensure the application belongs to the current user
            if application[0].user_id != user_id:
                raise HTTPException(
                    status_code=403,
                    detail="You are not authorized to delete this application"
                )

            # Check latest application status (by most recent status_id)
            status_query = (
                select(ApplicationStatus.status)
                .where(ApplicationStatus.application_id == application_id)
                .order_by(ApplicationStatus.status_id.desc())
                .limit(1)
            )
            status_result = await self.db.execute(status_query)
            status_row = status_result.first()
            app_status = status_row[0] if status_row else None

            # Only allow delete when:
            # - no status yet (draft), OR
            # - status is Pending AND no slip has been uploaded
            if app_status is not None:
                if app_status != "Pending" or application[0].slip_id is not None:
                    raise HTTPException(
                        status_code=400,
                        detail="The application has already been submitted and cannot be deleted"
                    )

            # Handle slip deletion if exists
            if application[0].slip_id:  # Access first element since result.first() returns a tuple
                slip_query = select(Slip).where(Slip.slip_id == application[0].slip_id)
                slip_result = await self.db.execute(slip_query)
                slip = slip_result.first()
                if slip:
                    await self.db.delete(slip[0])  # Access first element of slip tuple

            # Delete application
            await self.db.delete(application[0])  # Access first element of application tuple
            await self.db.commit()

            return {
                "message": "Application deleted successfully"
            }

        except HTTPException as he:
            await self.db.rollback()
            raise he
        except Exception as e:
            await self.db.rollback()
            raise HTTPException(
                status_code=400,
                detail="The application has already been submitted and cannot be deleted"
            )

    async def get_non_pending_applications(self, user_id: UUID, vehicle_type: Optional[str] = None):
        try:
            # Run cleanup first to remove stale applications
            await cleanup_stale_applications(self.db)
            
            # Return applications whose *latest* status is Pending / Waiting for approval.
            # Keep Waiting-for-approval visible even after receipt upload (slip_id present).
            latest_status_subquery = (
                select(
                    ApplicationStatus.application_id.label("application_id"),
                    func.max(ApplicationStatus.status_id).label("latest_status_id"),
                )
                .group_by(ApplicationStatus.application_id)
                .subquery()
            )

            query = (
                select(
                    Application,
                    Vehicle,
                    ApplicationStatus.status
                )
                .join(Vehicle, Application.plate_no == Vehicle.plate_no)
                .outerjoin(
                    latest_status_subquery,
                    Application.application_id == latest_status_subquery.c.application_id
                )
                .outerjoin(
                    ApplicationStatus,
                    ApplicationStatus.status_id == latest_status_subquery.c.latest_status_id
                )
                .where(
                    and_(
                        Application.user_id == user_id,
                        or_(
                            ApplicationStatus.status.is_(None),
                            ApplicationStatus.status.in_(["Pending", "Waiting for approval"])
                        )
                    )
                )
                .order_by(Application.application_id.desc())
            )

            # Add vehicle type filter if provided
            if vehicle_type and vehicle_type.lower() != 'all':
                query = query.where(Vehicle.vehicle_type == vehicle_type)

            result = await self.db.execute(query)
            applications = result.fetchall()

            return [
                {
                    "application_id": app.application_id,
                    "plate": vehicle.plate_no,
                    "model": vehicle.model,
                    "brand": vehicle.brand,
                    "application_role": app.role,
                    "vehicle_type": vehicle.vehicle_type,
                    "status": status_value or "Pending",
                    "has_uploaded_receipt": bool(app.slip_id),
                    "front_image": f"/applicant/vehicle/{vehicle.plate_no}/image/front" if vehicle.front_image else None,
                    "back_image": f"/applicant/vehicle/{vehicle.plate_no}/image/back" if vehicle.back_image else None
                }
                for app, vehicle, status_value in applications
            ]

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error retrieving applications: {str(e)}"
            )

    async def get_user_vehicles(self, user_id: UUID):
        try:
            # Query to get vehicles directly owned by the user
            query = (
                select(Vehicle)
                .where(Vehicle.user_id == user_id)
                .order_by(Vehicle.plate_no)
            )
            
            result = await self.db.execute(query)
            vehicles = result.scalars().all()

            formatted_vehicles = []
            for vehicle in vehicles:
                # Handle potential None values for images
                front_image = (
                    b64encode(vehicle.front_image).decode('utf-8') 
                    if vehicle.front_image is not None 
                    else None
                )
                back_image = (
                    b64encode(vehicle.back_image).decode('utf-8') 
                    if vehicle.back_image is not None 
                    else None
                )
                
                formatted_vehicle = {
                    "plate_no": vehicle.plate_no,
                    "brand": vehicle.brand,
                    "model": vehicle.model,
                    "vehicle_type": vehicle.vehicle_type,
                    "color": vehicle.color,
                    "front_image": front_image,
                    "back_image": back_image
                }
                formatted_vehicles.append(formatted_vehicle)

            return formatted_vehicles

        except Exception as e:
            logger.exception("Error in get_user_vehicles: %s", e)
            raise HTTPException(status_code=400, detail=str(e))

    async def get_authorized_drivers(self, user_id: UUID):
        try:
            # Modified query to get all authorized drivers, even if not assigned to applications
            query = (
                select(
                    AuthDriver,
                    Document
                )
                .join(Document, AuthDriver.document_id == Document.document_id)
                .where(AuthDriver.user_id == user_id)
                .order_by(AuthDriver.auth_driver_id.desc())
            )
            
            result = await self.db.execute(query)
            drivers_data = result.fetchall()

            formatted_drivers = []
            for driver, document in drivers_data:
                # Check if the driver's license is still valid based on expiration date
                is_valid = document.expired_at >= datetime.now().date() if document.expired_at else False
                
                # Get the latest application this driver is assigned to (if any)
                app_query = (
                    select(Application)
                    .join(AssignedDriver, Application.application_id == AssignedDriver.application_id)
                    .where(AssignedDriver.auth_driver_id == driver.auth_driver_id)
                    .order_by(AssignedDriver.assigned_at.desc())
                    .limit(1)
                )
                app_result = await self.db.execute(app_query)
                application = app_result.scalar_one_or_none()
                
                formatted_driver = {
                    "auth_driver_id": driver.auth_driver_id,
                    "first_name": driver.first_name,
                    "last_name": driver.last_name,
                    "birth_date": driver.birth_date,
                    "relationship_status": driver.relationship_status,
                    "profile_image": f"/api/v1/applicant/authorized-driver/{driver.auth_driver_id}/profile-image" if driver.profile_image else None,
                    "application_id": application.application_id if application else None,
                    "document": {
                        "type": document.type,
                        "registered_date": document.registered_date,
                        "expired_at": document.expired_at,
                        "image": f"/api/v1/applicant/authorized-driver/{driver.auth_driver_id}/document-image" if document.image else None
                    },
                    "is_valid": is_valid
                }
                formatted_drivers.append(formatted_driver)

            return formatted_drivers

        except Exception as e:
            logger.exception("Error in get_authorized_drivers: %s", e)
            raise HTTPException(status_code=400, detail=str(e))

    async def get_vehicle_image(self, plate_no: str, image_type: str, user_id: UUID):
        try:
            if image_type not in ["front", "back"]:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid image type. Must be 'front' or 'back'"
                )

            query = (
                select(Vehicle)
                .distinct()
                .join(Application, Vehicle.plate_no == Application.plate_no)
                .where(Vehicle.plate_no == plate_no)
                .where(Application.user_id == user_id)
            )
            
            result = await self.db.execute(query)
            vehicle = result.scalar_one_or_none()

            if not vehicle:
                raise HTTPException(status_code=404, detail="Vehicle not found")

            image = vehicle.front_image if image_type == "front" else vehicle.back_image
            if not image:
                raise HTTPException(
                    status_code=404,
                    detail=f"Vehicle {image_type} image not found"
                )

            return image

        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    async def get_driver_image(self, driver_id: int, user_id: UUID):
        try:
            query = (
                select(AuthDriver)
                .where(AuthDriver.auth_driver_id == driver_id)
                .where(AuthDriver.user_id == user_id)
            )
            
            result = await self.db.execute(query)
            driver = result.scalar_one_or_none()

            if not driver or not driver.profile_image:
                raise HTTPException(status_code=404, detail="Driver image not found")

            return driver.profile_image

        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    async def get_driver_document_image(self, driver_id: int, user_id: UUID):
        try:
            query = (
                select(Document)
                .join(AuthDriver, Document.document_id == AuthDriver.document_id)
                .where(AuthDriver.auth_driver_id == driver_id)
                .where(AuthDriver.user_id == user_id)
            )
            
            result = await self.db.execute(query)
            document = result.scalar_one_or_none()

            if not document or not document.image:
                raise HTTPException(status_code=404, detail="Document image not found")

            return document.image

        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    async def create_authorized_driver(
        self,
        driver_first_name: str,
        driver_last_name: str,
        driver_birth_date: date,
        driver_relationship: str,
        driver_profile: bytes,
        driver_license: bytes,
        driver_license_reg_date: date,
        driver_license_exp_date: date,
        user_id: UUID
    ):
        try:
            # Create driver's document without plate_no
            driver_document = Document(
                type="DL",
                image=driver_license,
                registered_date=driver_license_reg_date,
                expired_at=driver_license_exp_date,
                user_id=user_id,
                plate_no=None  # Remove the plate_no assignment
            )
            self.db.add(driver_document)
            await self.db.flush()

            # Create authorized driver
            auth_driver = AuthDriver(
                first_name=driver_first_name,
                last_name=driver_last_name,
                birth_date=driver_birth_date,
                relationship_status=driver_relationship,
                profile_image=driver_profile,
                user_id=user_id,
                document_id=driver_document.document_id
            )
            self.db.add(auth_driver)
            await self.db.commit()

            return {
                "auth_driver_id": auth_driver.auth_driver_id,
                "first_name": auth_driver.first_name,
                "last_name": auth_driver.last_name,
                "birth_date": auth_driver.birth_date,
                "relationship_status": auth_driver.relationship_status,
                "profile_url": f"/api/v1/applicant/authorized-driver/{auth_driver.auth_driver_id}/profile-image",
                "document": {
                    "document_id": driver_document.document_id,
                    "type": driver_document.type,
                    "image_url": f"/api/v1/applicant/authorized-driver/{auth_driver.auth_driver_id}/document-image",
                    "registered_date": driver_document.registered_date,
                    "expired_at": driver_document.expired_at
                }
            }

        except Exception as e:
            await self.db.rollback()
            raise HTTPException(status_code=400, detail=str(e))

    async def assign_drivers_to_application(self, application_id: int, driver_ids: List[int], user_id: UUID):
        try:
            # Verify application exists and belongs to user
            app_query = select(Application).where(
                and_(
                    Application.application_id == application_id,
                    Application.user_id == user_id
                )
            )
            app_result = await self.db.execute(app_query)
            application = app_result.scalar_one_or_none()

            if not application:
                raise HTTPException(
                    status_code=404,
                    detail="Application not found or unauthorized"
                )

            # Verify all drivers exist and belong to user
            driver_query = select(AuthDriver).where(
                and_(
                    AuthDriver.auth_driver_id.in_(driver_ids),
                    AuthDriver.user_id == user_id
                )
            )
            driver_result = await self.db.execute(driver_query)
            drivers = driver_result.scalars().all()

            # Check if all drivers were found
            found_driver_ids = {d.auth_driver_id for d in drivers}
            missing_driver_ids = set(driver_ids) - found_driver_ids
            if missing_driver_ids:
                raise HTTPException(
                    status_code=404,
                    detail=f"Drivers not found or unauthorized: {missing_driver_ids}"
                )

            # Create assignments for each driver
            assignments = []
            for driver_id in driver_ids:
                # Check if assignment already exists
                existing_query = select(AssignedDriver).where(
                    and_(
                        AssignedDriver.application_id == application_id,
                        AssignedDriver.auth_driver_id == driver_id
                    )
                )
                existing = await self.db.execute(existing_query)
                if existing.scalar_one_or_none():
                    continue  # Skip if already assigned

                assigned_driver = AssignedDriver(
                    assigned_at=datetime.utcnow(),
                    auth_driver_id=driver_id,
                    application_id=application_id
                )
                self.db.add(assigned_driver)
                assignments.append({
                    "driver_id": driver_id,
                    "assigned_at": assigned_driver.assigned_at
                })

            await self.db.commit()

            return {
                "message": "Drivers successfully assigned to application",
                "application_id": application_id,
                "assignments": assignments
            }

        except HTTPException as he:
            await self.db.rollback()
            raise he
        except Exception as e:
            await self.db.rollback()
            raise HTTPException(status_code=400, detail=str(e))

    async def get_approved_applications(
        self, 
        user_id: UUID, 
        sticker_number: Optional[str] = None,
        date: Optional[str] = None,
        vehicle_type: Optional[str] = None
    ):
        try:
            # Get all applications with their IDs first
            app_query = (
                select(Application.application_id)
                .where(Application.user_id == user_id)
            )
            
            # Add filters
            if date:
                try:
                    filter_date = datetime.strptime(date, "%Y-%m-%d").date()
                    app_query = app_query.where(cast(Application.date, Date) == filter_date)
                except ValueError:
                    raise HTTPException(
                        status_code=400, 
                        detail="Invalid date format. Use YYYY-MM-DD"
                    )
                    
            if vehicle_type and vehicle_type.lower() != 'all':
                app_query = app_query.join(Vehicle, Application.plate_no == Vehicle.plate_no)
                app_query = app_query.where(Vehicle.vehicle_type == vehicle_type)
                
            app_result = await self.db.execute(app_query)
            application_ids = [app_id for app_id, in app_result.all()]
            
            if not application_ids:
                return []
                
            # For each application ID, fetch the latest status in separate queries
            formatted_applications = []
            
            for app_id in application_ids:
                # Get application details
                details_query = (
                    select(
                        Application,
                        Vehicle,
                        Sticker
                    )
                    .join(Vehicle, Application.plate_no == Vehicle.plate_no)
                    .outerjoin(Sticker, Application.sticker_id == Sticker.id)
                    .where(Application.application_id == app_id)
                )
                
                if sticker_number:
                    details_query = details_query.where(Sticker.sticker_id.ilike(f"%{sticker_number}%"))
                    
                details_result = await self.db.execute(details_query)
                app_details = details_result.first()
                
                if not app_details:
                    continue
                    
                app, vehicle, sticker = app_details
                
                # Get the LATEST status for this application
                status_query = (
                    select(ApplicationStatus)
                    .where(ApplicationStatus.application_id == app_id)
                    .order_by(ApplicationStatus.date.desc(), ApplicationStatus.status_id.desc())
                    .limit(1)
                )
                
                status_result = await self.db.execute(status_query)
                latest_status = status_result.scalar_one_or_none()
                
                # Now construct the response with the guaranteed latest status
                front_image_url = f"/applicant/vehicle/{vehicle.plate_no}/image/front" if vehicle.front_image else None
                back_image_url = f"/applicant/vehicle/{vehicle.plate_no}/image/back" if vehicle.back_image else None
                
                formatted_app = {
                    "application_id": app.application_id,
                    "role": app.role,
                    "building_name": app.building_name,
                    "sticker_number": sticker.sticker_id if sticker else "Not Assigned",
                    "brand": vehicle.brand,
                    "model": vehicle.model,  
                    "plate_number": app.plate_no,
                    "vehicle_type": vehicle.vehicle_type,  
                    "date": app.date.strftime("%Y-%m-%d") if app.date else None,
                    "status": latest_status.status if latest_status else "Pending",
                    "processed_date": latest_status.date.strftime("%Y-%m-%d") if latest_status else None,
                    "vehicle_images": {
                        "front": front_image_url,
                        "back": back_image_url
                    }
                }

                # Add documents for each application
                doc_query = (
                    select(Document)
                    .where(Document.application_id == app.application_id)
                )
                doc_result = await self.db.execute(doc_query)
                documents = doc_result.scalars().all()

                formatted_app["documents"] = [
                    {
                        "type": doc.type,
                        "image_url": f"/api/v1/applicant/document/{doc.document_id}/image"
                    }
                    for doc in documents
                ]

                formatted_applications.append(formatted_app)

            # Sort by date descending
            formatted_applications.sort(key=lambda x: x["date"] if x["date"] else "", reverse=True)
            
            return formatted_applications

        except HTTPException as he:
            raise he
        except Exception as e:
            logger.exception("Error in get_approved_applications: %s", e)
            raise HTTPException(status_code=400, detail=str(e))

    async def get_application_by_id(self, application_id: int, user_id: UUID):
        try:
            # Get application with vehicle and sticker
            app_query = (
                select(
                    Application,
                    Vehicle,
                    Sticker
                )
                .join(Vehicle, Application.plate_no == Vehicle.plate_no)
                .outerjoin(Sticker, Application.sticker_id == Sticker.id)
                .where(
                    and_(
                        Application.application_id == application_id,
                        Application.user_id == user_id
                    )
                )
            )
            
            app_result = await self.db.execute(app_query)
            app_data = app_result.first()
            
            if not app_data:
                raise HTTPException(
                    status_code=404,
                    detail=f"Application with ID {application_id} not found"
                )
                
            app, vehicle, sticker = app_data
            
            # Get application status - Fix the potential multiple rows issue
            status_query = (
                select(ApplicationStatus)
                .where(ApplicationStatus.application_id == application_id)
                .order_by(ApplicationStatus.date.desc(), ApplicationStatus.status_id.desc())
                .limit(1)
            )
            status_result = await self.db.execute(status_query)
            status = status_result.scalar_one_or_none()

            # Get uploaded receipt/slip details (if any)
            slip_payload = None
            if app.slip_id:
                slip_query = select(Slip).where(Slip.slip_id == app.slip_id)
                slip_result = await self.db.execute(slip_query)
                slip = slip_result.scalar_one_or_none()
                if slip:
                    slip_payload = {
                        "slip_id": slip.slip_id,
                        "image": f"/api/v1/applicant/slip/{slip.slip_id}/image" if slip.image else None,
                        "official_receipt": slip.official_receipt,
                        "amount": float(slip.total_amount) if slip.total_amount is not None else None,
                        "date": slip.date.isoformat() if slip.date else None,
                    }
            
            # Get profile data
            profile_query = (
                select(Profile)
                .where(Profile.user_id == user_id)
            )
            profile_result = await self.db.execute(profile_query)
            profile = profile_result.scalar_one_or_none()
            
            if not profile:
                raise HTTPException(
                    status_code=404,
                    detail="Profile not found for this user"
                )
            
            # Get user's email address
            from app.db.models.user import User
            user_query = (
                select(User.email)
                .where(User.user_id == user_id)
            )
            user_result = await self.db.execute(user_query)
            email = user_result.scalar_one()
            
            # Get all documents FOR THIS SPECIFIC APPLICATION
            doc_query = (
                select(Document)
                .where(Document.application_id == application_id)
            )
            doc_result = await self.db.execute(doc_query)
            documents = doc_result.scalars().all()
            
            # Get authorized drivers for this application
            drivers_query = (
                select(AuthDriver)
                .join(AssignedDriver, AuthDriver.auth_driver_id == AssignedDriver.auth_driver_id)
                .where(AssignedDriver.application_id == application_id)
            )
            drivers_result = await self.db.execute(drivers_query)
            drivers = drivers_result.scalars().all()
            
            # Format document data - now a list of multiple documents
            formatted_documents = []
            for doc in documents:
                formatted_documents.append({
                    "type": doc.type,
                    "image": f"/api/v1/applicant/document/{doc.document_id}/image"
                })
            
            # Format drivers data
            formatted_drivers = []
            for driver in drivers:
                # Get driver document
                driver_doc_query = (
                    select(Document)
                    .where(Document.document_id == driver.document_id)
                )
                driver_doc_result = await self.db.execute(driver_doc_query)
                driver_doc = driver_doc_result.scalar_one_or_none()
                
                # Check if the driver's license is still valid
                is_valid = False
                if driver_doc and driver_doc.expired_at:
                    is_valid = driver_doc.expired_at >= datetime.now().date()
                
                formatted_drivers.append({
                    "driver_id": driver.auth_driver_id,  
                    "full_name": f"{driver.first_name} {driver.last_name}",
                    "birthdate": driver.birth_date,
                    "relationship": driver.relationship_status,
                    "profile_image": f"/api/v1/applicant/authorized-driver/{driver.auth_driver_id}/profile-image",
                    "document": {
                        "type": driver_doc.type if driver_doc else "Unknown",
                        "image": f"/api/v1/applicant/authorized-driver/{driver.auth_driver_id}/document-image"
                    },
                    "is_valid": is_valid
                })
            
            # Construct the response object
            response = {
                "sticker_id": sticker.sticker_id if sticker else None,
                "application_role": app.role,
                "date": app.date,
                "building_name": app.building_name,
                "status": status.status if status else "Pending",
                "slip": slip_payload,
                "applicant": {
                    "first_name": profile.first_name,
                    "last_name": profile.last_name,
                    "birth_date": profile.birth_date, 
                    "email_address": email,
                    "phone_number": profile.contact_no,
                    "sex": profile.sex.value if profile.sex else None,
                    "address": profile.address,
                    "profile_image": f"/api/v1/profile/image/{profile.profile_id}" if profile.image else None,  # Changed from profile_picture to image
                    "vehicle_information": {
                        "front_image": f"/api/v1/applicant/vehicle/{vehicle.plate_no}/image/front",
                        "back_image": f"/api/v1/applicant/vehicle/{vehicle.plate_no}/image/back",
                        "plate_number": vehicle.plate_no,
                        "model": vehicle.model,
                        "brand": vehicle.brand,
                        "vehicle_type": vehicle.vehicle_type
                    },
                    "documents": formatted_documents,  # Changed from document (singular) to documents (plural)
                    "driver": formatted_drivers if formatted_drivers else None
                }
            }
            
            return response

        except HTTPException as he:
            raise he
        except Exception as e:
            logger.exception("Error in get_application_by_id: %s", e)
            raise HTTPException(status_code=400, detail=(str(e)))

    async def request_email_verification(self, email: str, user_id: UUID) -> dict:
        """Create email verification request and send OTP"""
        # Check if email is already registered to another user
        user_query = select(User).where(
            and_(
                User.email == email,
                User.user_id != user_id  # Exclude the current user
            )
        )
        user_result = await self.db.execute(user_query)
        user = user_result.scalar_one_or_none()
        
        if user:
            # If email is already taken by another user
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already registered to another user"
            )
        
        # Generate OTP
        otp = ''.join(secrets.choice('0123456789') for _ in range(6))
        
        # Set expiry (15 minutes from now) using system datetime
        expires_at = datetime.now() + timedelta(minutes=15)
        
        try:
            # Check for existing verification tokens for this user
            from app.db.models.token import Token
            token_query = select(Token).where(
                and_(
                    Token.user_id == user_id,
                    Token.token_type == "verification"
                )
            )
            token_result = await self.db.execute(token_query)
            existing_tokens = token_result.scalars().all()
            
            # Delete all existing verification tokens for this user
            if existing_tokens:
                for token in existing_tokens:
                    await self.db.delete(token)
                await self.db.flush()
            
            # Save new OTP as verification token
            await create_verification_token(self.db, user_id=user_id, token=otp, expires_at=expires_at)
            
            # Send email with OTP
            await send_verification_email(email, otp)
            return {"message": "Email verification OTP has been sent to your email"}
        
        except Exception as e:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to send OTP: {str(e)}"
            )

    async def verify_email_otp(self, user_id: UUID, otp: str) -> dict:
        """Verify email OTP only (no profile update). Used by application flow."""
        valid_token = await get_valid_verification_token(self.db, user_id, otp)
        if not valid_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired OTP"
            )
        await delete_used_token(self.db, valid_token.token_id)
        await self.db.commit()
        return {"message": "Email verified successfully"}

    async def verify_and_update_profile(
        self,
        first_name: str,
        last_name: str,
        birth_date: date,
        sex: str,
        contact_no: str,
        address: str,
        email: str,
        otp: str,
        image_data: Optional[bytes],
        user_id: UUID
    ) -> dict:
        """Verify email OTP and update profile. For use only in Profile / update profile section."""
        valid_token = await get_valid_verification_token(self.db, user_id, otp)
        if not valid_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired OTP"
            )
        await delete_used_token(self.db, valid_token.token_id)
        try:
            # Check if email already exists for another user
            if email:
                user_query = select(User).where(
                    and_(
                        User.email == email,
                        User.user_id != user_id
                    )
                )
                user_result = await self.db.execute(user_query)
                existing_user = user_result.scalar_one_or_none()
                
                if existing_user:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Email is already registered to another user"
                    )
                
                # Update email in user table
                user_update_query = (
                    update(User)
                    .where(User.user_id == user_id)
                    .values(email=email)
                )
                await self.db.execute(user_update_query)
            
            # Get existing profile or create new one
            profile_query = select(Profile).where(Profile.user_id == user_id)
            profile_result = await self.db.execute(profile_query)
            profile = profile_result.scalar_one_or_none()
            
            if not profile:
                # Create new profile
                profile = Profile(
                    user_id=user_id,
                    first_name=first_name,
                    last_name=last_name,
                    birth_date=birth_date,
                    sex=sex,
                    contact_no=contact_no,
                    address=address,
                    image=image_data 
                )
                self.db.add(profile)
            else:
                # Update profile fields
                update_data = {
                    "first_name": first_name,
                    "last_name": last_name,
                    "birth_date": birth_date,
                    "sex": sex,
                    "contact_no": contact_no,
                    "address": address,
                }
                
                # Add image to update data if provided
                if image_data is not None:
                    update_data["image"] = image_data  # Changed from profile_picture to image
                    
                # Update profile with all fields including image
                await self.db.execute(
                    update(Profile)
                    .where(Profile.profile_id == profile.profile_id)
                    .values(**update_data)
                )
                
                # Refresh profile to get updated data
                await self.db.refresh(profile)
            
            await self.db.commit()
            
            return {
                "message": "Profile has been verified and updated successfully",
                "profile": {
                    "first_name": profile.first_name,
                    "last_name": profile.last_name,
                    "email": email,
                    "birth_date": profile.birth_date,
                    "sex": profile.sex,
                    "contact_no": profile.contact_no,
                    "address": profile.address,
                    "profile_image": f"/api/v1/profile/image/{profile.profile_id}" if profile.image else None
                }
            }
            
        except HTTPException as he:
            await self.db.rollback()
            raise he
        except Exception as e:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update profile: {str(e)}"
            )

    async def add_or_update_vehicle(
        self,
        plate_no: str,
        brand: str,
        model: str,
        vehicle_type: str,
        color: str,
        user_id: UUID,
        front_image: Optional[bytes] = None,
        back_image: Optional[bytes] = None
    ):
        """Add or update vehicle with images"""
        try:
            # Check if vehicle exists
            query = select(Vehicle).where(Vehicle.plate_no == plate_no)
            result = await self.db.execute(query)
            vehicle = result.scalar_one_or_none()

            if vehicle:
                # Update existing vehicle with user validation
                if vehicle.user_id != user_id:
                    raise HTTPException(
                        status_code=403,
                        detail="You don't have permission to update this vehicle"
                    )
                    
                # Update basic info
                vehicle.brand = brand
                vehicle.model = model 
                vehicle.vehicle_type = vehicle_type
                vehicle.color = color
                
                # Update images if provided
                if front_image is not None:  # Changed from if front_image:
                    vehicle.front_image = front_image
                if back_image is not None:   # Changed from if back_image:
                    vehicle.back_image = back_image
                
            else:
                # Create new vehicle
                vehicle = Vehicle(
                    plate_no=plate_no,
                    brand=brand,
                    model=model,
                    vehicle_type=vehicle_type,
                    color=color,
                    front_image=front_image,
                    back_image=back_image,
                    user_id=user_id
                )
                self.db.add(vehicle)

            # Commit and refresh
            await self.db.commit()
            await self.db.refresh(vehicle)

            # Return response with URL paths for images
            return {
                "plate_no": vehicle.plate_no,
                "brand": vehicle.brand,
                "model": vehicle.model,
                "vehicle_type": vehicle.vehicle_type,
                "color": vehicle.color,
                "front_image": f"/api/v1/applicant/vehicle/{vehicle.plate_no}/image/front" if vehicle.front_image else None,
                "back_image": f"/api/v1/applicant/vehicle/{vehicle.plate_no}/image/back" if vehicle.back_image else None
            }

        except HTTPException as he:
            await self.db.rollback()
            raise he
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error in add_or_update_vehicle: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to process vehicle: {str(e)}"
            )

    async def update_application(
        self,
        application_id: int,
        update_data: dict,
        user_id: UUID
    ) -> Dict:
        try:
            # Get existing application
            query = (
                select(Application)
                .where(
                    and_(
                        Application.application_id == application_id,
                        Application.user_id == user_id
                    )
                )
            )
            result = await self.db.execute(query)
            application = result.scalar_one_or_none()

            if not application:
                raise HTTPException(
                    status_code=404,
                    detail="Application not found or unauthorized"
                )

            # Update application basic info
            if "application_role" in update_data:
                application.role = update_data["application_role"]
            if "application_type" in update_data:
                application.app_type = update_data["application_type"]  # Note: using app_type here
            if "applied_date" in update_data:
                application.date = datetime.strptime(update_data["applied_date"], "%Y-%m-%d")
            if "expiration_date" in update_data:
                application.expired_at = datetime.strptime(update_data["expiration_date"], "%Y-%m-%d")
            if "plate_number" in update_data:
                application.plate_no = update_data["plate_number"]

            # Update owner/profile information if provided
            if "owner" in update_data:
                owner_data = update_data["owner"]
                profile_query = select(Profile).where(Profile.user_id == user_id)
                profile_result = await self.db.execute(profile_query)
                profile = profile_result.scalar_one_or_none()

                if profile:
                    if "first_name" in owner_data:
                        profile.first_name = owner_data["first_name"]
                    if "last_name" in owner_data:
                        profile.last_name = owner_data["last_name"]
                    if "contact_no" in owner_data:
                        profile.contact_no = owner_data["contact_no"]
                    if "date_of_birth" in owner_data:
                        profile.birth_date = datetime.strptime(owner_data["date_of_birth"], "%Y-%m-%d").date()
                    if "gender" in owner_data:
                        profile.sex = owner_data["gender"]
                    if "address" in owner_data:
                        profile.address = owner_data["address"]
                    if "email" in owner_data:
                        # Update user email if changed
                        user_query = select(User).where(User.user_id == user_id)
                        user_result = await self.db.execute(user_query)
                        user = user_result.scalar_one_or_none()
                        if user and user.email != owner_data["email"]:
                            user.email = owner_data["email"]

            # Update vehicle information if provided
            if "vehicle" in update_data:
                vehicle_data = update_data["vehicle"]
                vehicle_query = select(Vehicle).where(Vehicle.plate_no == application.plate_no)
                vehicle_result = await self.db.execute(vehicle_query)
                vehicle = vehicle_result.scalar_one_or_none()

                if vehicle:
                    if "brand" in vehicle_data:
                        vehicle.brand = vehicle_data["brand"]
                    if "model" in vehicle_data:
                        vehicle.model = vehicle_data["model"]
                    if "type" in vehicle_data:
                        vehicle.vehicle_type = vehicle_data["type"]
                    if "color" in vehicle_data:
                        vehicle.color = vehicle_data["color"]

            await self.db.commit()

            return {
                "message": "Application updated successfully",
                "application_id": application_id
            }

        except HTTPException as he:
            await self.db.rollback()
            raise he
        except Exception as e:
            await self.db.rollback()
            logger.exception("Error in update_application: %s", e)
            raise HTTPException(
                status_code=500,
                detail=f"Failed to update application: {str(e)}"
            )

    async def delete_assigned_driver(self, assign_driver_id: int, user_id: UUID):
        try:
            # First get the assigned driver record to verify ownership
            query = (
                select(AssignedDriver)
                .join(Application, AssignedDriver.application_id == Application.application_id)
                .where(
                    and_(
                        AssignedDriver.assign_driver_id == assign_driver_id,
                        Application.user_id == user_id
                    )
                )
            )
            
            result = await self.db.execute(query)
            assigned_driver = result.scalar_one_or_none()
            
            if not assigned_driver:
                raise HTTPException(
                    status_code=404,
                    detail="Assigned driver not found or you're not authorized to remove this driver"
                )
            
            # Delete the assignment
            await self.db.delete(assigned_driver)
            await self.db.commit()
            
            return {
                "message": "Assigned driver successfully removed",
                "assign_driver_id": assign_driver_id
            }
                
        except HTTPException as he:
            await self.db.rollback()
            raise he
        except Exception as e:
            await self.db.rollback()
            logger.exception("Error in delete_assigned_driver: %s", e)
            raise HTTPException(status_code=400, detail=str(e))

    async def delete_driver_from_application(self, application_id: int, driver_id: int, user_id: UUID):
        """
        Remove an authorized driver from an application
        """
        try:
            # First, verify the application belongs to the user
            app_query = (
                select(Application)
                .where(
                    and_(
                        Application.application_id == application_id,
                        Application.user_id == user_id
                    )
                )
            )
            app_result = await self.db.execute(app_query)
            application = app_result.scalar_one_or_none()
            
            if not application:
                raise HTTPException(
                    status_code=404,
                    detail=f"Application with ID {application_id} not found or you don't have permission to modify it"
                )
            
            # Find the assignment that connects this driver to the application
            assignment_query = (
                select(AssignedDriver)
                .where(
                    and_(
                        AssignedDriver.application_id == application_id,
                        AssignedDriver.auth_driver_id == driver_id
                    )
                )
            )
            
            assignment_result = await self.db.execute(assignment_query)
            assignment = assignment_result.scalar_one_or_none()
            
            if not assignment:
                raise HTTPException(
                    status_code=404,
                    detail=f"Driver with ID {driver_id} is not assigned to application {application_id}"
                )
            
            # Delete the assignment
            await self.db.delete(assignment)
            await self.db.commit()
            
            return {
                "message": "Driver successfully removed from application",
                "application_id": application_id,
                "driver_id": driver_id
            }
                
        except HTTPException as he:
            await self.db.rollback()
            raise he
        except Exception as e:
            await self.db.rollback()
            logger.exception("Error in delete_driver_from_application: %s", e)
            raise HTTPException(status_code=400, detail=str(e))

    async def submit_specific_applications_to_pending(
        self, 
        application_ids: List[int], 
        slip_image: bytes,
        official_receipt: str,  # Add this parameter
        paid_amount: Optional[float],
        user_id: UUID
    ) -> dict:
        try:
            if not application_ids:
                raise HTTPException(status_code=400, detail="No application IDs were provided")

            normalized_ids = sorted(set(application_ids))

            # Get applications and validate ownership
            apps_query = select(Application).where(
                and_(
                    Application.application_id.in_(normalized_ids),
                    Application.user_id == user_id
                )
            )
            apps_result = await self.db.execute(apps_query)
            applications = apps_result.scalars().all()

            if len(applications) != len(normalized_ids):
                raise HTTPException(
                    status_code=404,
                    detail="Some applications were not found or do not belong to your account"
                )

            # Validate latest status per application:
            # receipt upload is allowed only for Pending / Waiting for approval
            latest_status_subquery = (
                select(
                    ApplicationStatus.application_id,
                    func.max(ApplicationStatus.status_id).label("latest_status_id")
                )
                .where(ApplicationStatus.application_id.in_(normalized_ids))
                .group_by(ApplicationStatus.application_id)
                .subquery()
            )
            latest_status_query = (
                select(ApplicationStatus.application_id, ApplicationStatus.status)
                .join(
                    latest_status_subquery,
                    and_(
                        ApplicationStatus.application_id == latest_status_subquery.c.application_id,
                        ApplicationStatus.status_id == latest_status_subquery.c.latest_status_id
                    )
                )
            )
            latest_status_result = await self.db.execute(latest_status_query)
            latest_status_map = {row.application_id: row.status for row in latest_status_result.all()}

            invalid_status_apps = []
            already_uploaded_apps = []
            for app in applications:
                latest_status = latest_status_map.get(app.application_id)
                if latest_status not in ("Pending", "Waiting for approval"):
                    invalid_status_apps.append(app.application_id)
                if app.slip_id is not None:
                    already_uploaded_apps.append(app.application_id)

            if invalid_status_apps:
                raise HTTPException(
                    status_code=400,
                    detail=f"Only Pending or Waiting for approval applications can upload a receipt: {invalid_status_apps}"
                )
            if already_uploaded_apps:
                raise HTTPException(
                    status_code=400,
                    detail=f"Receipt already uploaded for application(s): {already_uploaded_apps}"
                )

            # Create slip record first with user-provided receipt number
            current_date = datetime.now().date()  
            
            slip = Slip(
                total_amount=0,  # Set after processing all applications / paid amount
                nature_of_payment="Parking Sticker Application",
                date=current_date,
                image=slip_image,
                official_receipt=official_receipt,  # Use the provided receipt number
                user_id=user_id
            )
            self.db.add(slip)
            await self.db.flush()

            submitted_apps = []
            computed_amount = 0.0
            role_names = sorted({app.role for app in applications})

            # Fallback computation when cashier amount is not sent.
            for role in role_names:
                role_count = sum(1 for app in applications if app.role == role)
                role_price = await self.get_sticker_price_by_role(role)
                computed_amount += float(role_price) * role_count

            for app in applications:
                app.slip_id = slip.slip_id
                submitted_apps.append({
                    "application_id": app.application_id,
                    "status": latest_status_map.get(app.application_id) or "Pending",
                    "date": current_date.isoformat(),
                    "sticker_number": None,
                    "role": app.role,
                    "amount": float(paid_amount) if paid_amount is not None and paid_amount > 0 else None
                })

            # Use cashier amount when provided; otherwise use computed amount by role.
            slip.total_amount = float(paid_amount) if paid_amount is not None and paid_amount > 0 else float(computed_amount)
            slip.nature_of_payment = f"Parking Sticker Application ({', '.join(role_names)})"
            
            await self.db.commit()

            return {
                "message": f"Successfully submitted {len(submitted_apps)} applications",
                "submitted_applications": submitted_apps,
                "slip_id": slip.slip_id,
                "total_amount": slip.total_amount
            }

        except HTTPException as he:
            await self.db.rollback()
            raise he
        except Exception as e:
            await self.db.rollback()
            logger.exception("Error in submit_specific_applications: %s", e)
            raise HTTPException(
                status_code=500,
                detail=f"Failed to submit applications: {str(e)}"
            )
