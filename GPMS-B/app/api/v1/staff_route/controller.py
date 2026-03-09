from datetime import date, datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.models.application_status import ApplicationStatus
from app.schemas.application import (
    ApplicationStatusUpdate, 
    ApplicationDetail,
    OwnerDetail,
    VehicleDetail,
    AssignedDriverDetail,
    DocumentDetail
)
from fastapi import HTTPException
from uuid import UUID
from .views import StaffView
from app.utils.image import get_vehicle_image_url, get_profile_image_url

class StaffController:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.view = StaffView(db)

    async def update_application_status(
        self,
        status_update: ApplicationStatusUpdate,
        current_user_id: UUID
    ) -> ApplicationStatus:
        # Get latest status and validate in view layer
        await self.view.get_latest_status(status_update.application_id)
        
        # Create new status using view
        return await self.view.create_status_update(
            application_id=status_update.application_id,
            status=status_update.status,
            remarks=status_update.remarks,
            current_user_id=current_user_id
        )

    async def get_application_by_id(self, application_id: int) -> ApplicationDetail:
        application = await self.view.get_application_detail(application_id)
        
        owner_profile = application.user.profiles[0]
        
        # Update URLs to be consistent
        front_image_url = f"/api/v1/staff/vehicle/{application.vehicle.plate_no}/front-image" if application.vehicle else None
        back_image_url = f"/api/v1/staff/vehicle/{application.vehicle.plate_no}/back-image" if application.vehicle else None
        profile_image_url = f"/api/v1/profile/image/{owner_profile.profile_id}" if owner_profile else None

        # Filter documents by application_id to get only documents specific to this application
        application_documents = []
        if application.vehicle and hasattr(application.vehicle, 'documents'):
            for doc in application.vehicle.documents:
                # Only include documents associated with this specific application
                if doc.application_id == application.application_id:
                    application_documents.append(doc)

        # Include uploaded payment slip as part of documents for staff/admin modal.
        if hasattr(application, "slip") and application.slip and application.slip.image:
            application_documents = [*application_documents, {
                "document_id": application.slip.slip_id,
                "type": "Payment Slip",
                "image": f"/api/v1/staff/slip/{application.slip.slip_id}/image",
                "registered_at": application.slip.date,
                "expire_at": None,
            }]

        return ApplicationDetail(
            application_id=application.application_id,
            application_role=application.role,
            application_type=application.app_type,
            applied_date=application.date,
            expiration_date=application.expired_at,
            plate_number=application.vehicle.plate_no if application.vehicle else None,
            owner=OwnerDetail(
                user_id=str(application.user.user_id),
                fullname=f"{owner_profile.first_name} {owner_profile.last_name}",
                email=application.user.email,
                contact_no=owner_profile.contact_no,
                date_of_birth=owner_profile.birth_date,
                profile_img=profile_image_url,
                gender=owner_profile.sex,
                address=owner_profile.address
            ),
            vehicle=VehicleDetail(
                brand=application.vehicle.brand if application.vehicle else None,
                model=application.vehicle.model if application.vehicle else None,
                plate_number=application.vehicle.plate_no if application.vehicle else None,
                sticker_id=application.sticker.sticker_id if application.sticker else None,
                color=application.vehicle.color if application.vehicle else None,
                type=application.vehicle.vehicle_type if application.vehicle else None,
                front_img=front_image_url,
                back_img=back_image_url,
                assigned_drivers=[
                    AssignedDriverDetail(
                        fullname=f"{driver.auth_driver.first_name} {driver.auth_driver.last_name}",
                        birth_date=driver.auth_driver.birth_date,
                        relationship=driver.auth_driver.relationship_status,
                        profile_img=f"/api/v1/staff/driver/{driver.auth_driver.auth_driver_id}/profile-image" 
                            if driver.auth_driver.profile_image else None,
                        document=DocumentDetail(
                            document_id=driver.auth_driver.document.document_id,  
                            type=driver.auth_driver.document.type,
                            image=f"/api/v1/staff/document/{driver.auth_driver.document.document_id}/image" 
                                if driver.auth_driver.document and driver.auth_driver.document.image else None,
                            registered_at=driver.auth_driver.document.registered_date,
                            expire_at=driver.auth_driver.document.expired_at
                        ) if hasattr(driver.auth_driver, 'document') and driver.auth_driver.document else None
                    )
                    for driver in application.assigned_drivers
                ] if hasattr(application, 'assigned_drivers') else [],
                # Use the filtered documents list instead
                documents=[
                    (
                        DocumentDetail(
                            document_id=doc["document_id"],
                            type=doc["type"],
                            image=doc["image"],
                            registered_at=doc["registered_at"],
                            expire_at=doc["expire_at"],
                        )
                        if isinstance(doc, dict)
                        else DocumentDetail(
                            document_id=doc.document_id,
                            type=doc.type,
                            image=f"/api/v1/staff/document/{doc.document_id}/image" if doc.image else None,
                            registered_at=doc.registered_date,
                            expire_at=doc.expired_at,
                        )
                    )
                    for doc in application_documents
                ]
            ) if application.vehicle else None
        )

    async def get_pending_applications(self) -> dict:
        try:
            applications = await self.view.get_pending_applications()
            pending_list = []
            for app in applications:
                owner_profile = app.user.profiles[0]
                
                # Calculate age
                today = datetime.now().date()
                age = today.year - owner_profile.birth_date.year - (
                    (today.month, today.day) < 
                    (owner_profile.birth_date.month, owner_profile.birth_date.day)
                )

                # Use consistent URL structure for all images
                front_image = f"/api/v1/staff/vehicle/{app.vehicle.plate_no}/front-image" if app.vehicle else None
                back_image = f"/api/v1/staff/vehicle/{app.vehicle.plate_no}/back-image" if app.vehicle else None
                profile_image = f"/api/v1/profile/image/{owner_profile.profile_id}" if owner_profile and owner_profile.profile_id else None

                # Add assigned drivers with their documents
                assigned_drivers = [
                    {
                        "fullname": f"{driver.auth_driver.first_name} {driver.auth_driver.last_name}",
                        "birth_date": driver.auth_driver.birth_date,
                        "relationship": driver.auth_driver.relationship_status,
                        "profile_img": f"/api/v1/staff/driver/{driver.auth_driver.auth_driver_id}/profile-image" 
                            if driver.auth_driver.profile_image else None,
                        "document": {
                            "document_id": driver.auth_driver.document.document_id,  # Add this line
                            "type": driver.auth_driver.document.type,
                            "image": f"/api/v1/staff/document/{driver.auth_driver.document.document_id}/image" 
                                if driver.auth_driver.document and driver.auth_driver.document.image else None,
                            "registered_at": driver.auth_driver.document.registered_date,
                            "expire_at": driver.auth_driver.document.expired_at
                        } if hasattr(driver.auth_driver, 'document') and driver.auth_driver.document else None
                    }
                    for driver in app.assigned_drivers
                ] if hasattr(app, 'assigned_drivers') and app.assigned_drivers else []

                # Get slip information from the joined data
                slip_image = f"/api/v1/staff/slip/{app.slip.slip_id}/image" if hasattr(app, 'slip') and app.slip and app.slip.image else None

                # Simplified document structure
                application_documents = [
                    {
                        "document_id": doc.document_id,
                        "type": doc.type,
                        "image": f"/api/v1/staff/document/{doc.document_id}/image"
                    }
                    for doc in app.documents
                ] if hasattr(app, 'documents') and app.documents else []

                pending_data = {
                    "application_id": app.application_id, 
                    "full_name": f"{owner_profile.first_name} {owner_profile.last_name}",
                    "sex": owner_profile.sex or "",
                    "age": age,
                    "profile_img": profile_image,
                    "sticker_id": app.sticker.sticker_id if hasattr(app, 'sticker') and app.sticker else None,
                    "plate_number": app.vehicle.plate_no if app.vehicle else "",
                    "model": app.vehicle.model if app.vehicle else "",
                    "brand": app.vehicle.brand if app.vehicle else "",
                    "color": app.vehicle.color if app.vehicle else "",
                    "front_img": front_image,
                    "back_img": back_image,
                    "applied_date": app.date.strftime("%Y-%m-%d") if app.date else None,
                    "application_role": app.role,
                    "vehicle_type": app.vehicle.vehicle_type if app.vehicle else "",
                    "assigned_drivers": assigned_drivers,
                    "slip_id": app.slip.slip_id if hasattr(app, 'slip') and app.slip else None,
                    "slip_image": slip_image,
                    "slip_amount": app.slip.total_amount if hasattr(app, 'slip') and app.slip else None,
                    "slip_official_receipt": app.slip.official_receipt if hasattr(app, 'slip') and app.slip else None,
                    "slip_date": app.slip.date.strftime("%Y-%m-%d") if hasattr(app, 'slip') and app.slip and app.slip.date else None,
                    "nature_of_payment": app.slip.nature_of_payment if hasattr(app, 'slip') and app.slip else None,
                    "has_uploaded_receipt": bool(
                        hasattr(app, 'slip')
                        and app.slip
                        and app.slip.image
                        and app.slip.official_receipt
                        and app.slip.total_amount is not None
                        and float(app.slip.total_amount) > 0
                    ),
                    "documents": application_documents,
                }
                pending_list.append(pending_data)

            return {"pending_applications": pending_list}
        
        except Exception as e:
            # Log the actual error for debugging
            print(f"Error in get_pending_applications: {str(e)}")
            raise HTTPException(
                status_code=500, 
                detail="An error occurred while fetching pending applications"
            )
