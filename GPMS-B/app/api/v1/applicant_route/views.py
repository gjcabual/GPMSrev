from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from .controller import ApplicantController
from app.schemas.application import ApplicationCreate
from uuid import UUID
from datetime import date
from typing import List, Optional

class ApplicantView:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.controller = ApplicantController(db)

    async def create_application(
        self, 
        application_data: ApplicationCreate, 
        user_id: UUID,
        driver_ids: List[int] = None
    ):
        try:
            result = await self.controller.create_application(
                application_data, 
                user_id, 
                driver_ids
            )
            return result
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    async def delete_application(self, application_id: int, user_id: UUID):
        try:
            return await self.controller.delete_application(application_id, user_id)
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    async def send_initial_payment_slip(self, application_id: int, user_id: UUID):
        try:
            return await self.controller.send_initial_payment_slip(application_id, user_id)
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    async def get_non_pending_applications(self, user_id: UUID):
        """
        Get applications that don't have any status records
        """
        try:
            return await self.controller.get_non_pending_applications(user_id)
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    async def get_user_vehicles(self, user_id: UUID):
        """
        Get all vehicles linked to user's applications
        """
        return await self.controller.get_user_vehicles(user_id)

    async def get_authorized_drivers(self, user_id: UUID):
        try:
            return await self.controller.get_authorized_drivers(user_id)
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    async def get_vehicle_image(self, plate_no: str, image_type: str, user_id: UUID):
        try:
            return await self.controller.get_vehicle_image(plate_no, image_type, user_id)
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    async def get_driver_image(self, driver_id: int, user_id: UUID):
        try:
            return await self.controller.get_driver_image(driver_id, user_id)
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    async def get_driver_document_image(self, driver_id: int, user_id: UUID):
        try:
            return await self.controller.get_driver_document_image(driver_id, user_id)
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
            return await self.controller.create_authorized_driver(
                driver_first_name=driver_first_name,
                driver_last_name=driver_last_name,
                driver_birth_date=driver_birth_date,
                driver_relationship=driver_relationship,
                driver_profile=driver_profile,
                driver_license=driver_license,
                driver_license_reg_date=driver_license_reg_date,
                driver_license_exp_date=driver_license_exp_date,
                user_id=user_id
            )
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    async def assign_drivers_to_application(
        self,
        application_id: int,
        driver_ids: List[int],
        user_id: UUID
    ):
        try:
            return await self.controller.assign_drivers_to_application(
                application_id=application_id,
                driver_ids=driver_ids,
                user_id=user_id
            )
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    async def get_approved_applications(
        self,
        user_id: UUID,
        sticker_number: Optional[str] = None,
        date: Optional[str] = None,
        vehicle_type: Optional[str] = None  # Add this parameter
    ):
        """
        Get all approved applications for a specific user
        with optional filtering by sticker number, date and vehicle type
        """
        try:
            return await self.controller.get_approved_applications(
                user_id=user_id,
                sticker_number=sticker_number,
                date=date,
                vehicle_type=vehicle_type  # Pass the parameter to controller
            )
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    async def get_application_by_id(self, application_id: int, user_id: UUID):
        """
        Get detailed application information by ID
        """
        try:
            return await self.controller.get_application_by_id(application_id, user_id)
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    async def request_email_verification(self, email: str, user_id: UUID):
        """Request email verification OTP"""
        try:
            return await self.controller.request_email_verification(email, user_id)
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    async def verify_email_otp(self, user_id: UUID, otp: str) -> dict:
        """Verify email OTP only (no profile update). For application flow."""
        return await self.controller.verify_email_otp(user_id=user_id, otp=otp)

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
    ):
        """Verify email OTP and update profile. For Profile / update profile section only."""
        try:
            return await self.controller.verify_and_update_profile(
                first_name=first_name,
                last_name=last_name,
                birth_date=birth_date,
                sex=sex,
                contact_no=contact_no,
                address=address,
                email=email,
                otp=otp,
                image_data=image_data,
                user_id=user_id
            )
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    async def add_or_update_vehicle(
        self,
        plate_no: str,
        brand: str,
        model: str,
        vehicle_type: str,
        color: str,
        user_id: UUID,  # Move user_id before parameters with default values
        front_image: Optional[bytes] = None,
        back_image: Optional[bytes] = None
    ):
        controller = ApplicantController(self.db)
        return await controller.add_or_update_vehicle(
            plate_no=plate_no,
            brand=brand,
            model=model,
            vehicle_type=vehicle_type,
            color=color,
            user_id=user_id,
            front_image=front_image,
            back_image=back_image
        )

    async def delete_assigned_driver(self, assign_driver_id: int, user_id: UUID):
        """
        Delete an assigned driver from an application by assign_driver_id
        """
        try:
            return await self.controller.delete_assigned_driver(
                assign_driver_id=assign_driver_id,
                user_id=user_id
            )
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    async def delete_driver_from_application(self, application_id: int, driver_id: int, user_id: UUID):
        """
        Delete a driver from a specific application
        """
        try:
            return await self.controller.delete_driver_from_application(
                application_id=application_id,
                driver_id=driver_id,
                user_id=user_id
            )
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    # Update this method
    async def submit_specific_applications_to_pending(
        self, 
        application_ids: List[int], 
        slip_image: bytes,
        official_receipt: str,
        paid_amount: Optional[float],
        user_id: UUID
    ):
        """Submit applications to pending status with payment slip"""
        try:
            return await self.controller.submit_specific_applications_to_pending(
                application_ids=application_ids,
                slip_image=slip_image,
                official_receipt=official_receipt,
                paid_amount=paid_amount,
                user_id=user_id
            )
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
