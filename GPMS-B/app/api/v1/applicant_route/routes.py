from fastapi import APIRouter, Depends, HTTPException, Response, status, Form, File, UploadFile, Body, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.db.models.document import Document
from app.db.models.vehicle import Vehicle
from app.db.models.profile import Profile
from typing import List, Optional
from datetime import date, datetime, timedelta
import logging
from app.db.session import get_db
from app.core.security import get_current_applicant
from app.schemas.application import (
    ApplicationCreate, 
    ApplicationListResponse, 
    VehicleResponse, 
    AuthorizedDriverResponse,
    DocumentCreate,
    AuthDriverCreate,
    ApplicationUpdate
)
from .views import ApplicantView
from app.schemas.user import UserInDB
from fastapi.exceptions import RequestValidationError
from fastapi import Request
import os
import sys
import tempfile
from app.utils.document_ocr_utils import extract_document_data
from app.schemas.profile import ProfileUpdate, SuccessResponse
from app.utils.email import send_verification_email
from app.db.repositories.token import create_verification_token, get_valid_verification_token, delete_used_token
from .controller import ApplicantController

from app.utils.document_ocr_utils import document_type
from app.core.ocr_doc_validator import validate_document


def _safe_unlink(path: Optional[str]) -> None:
    if path and os.path.isfile(path):
        try:
            os.unlink(path)
        except OSError as e:
            logger.warning("Could not remove temporary file %s: %s", path, e)


def get_full_document_type(doc_type: str) -> str:
    """Convert document type abbreviation to full name"""
    doc_types = {
        "OR": "Official Receipt",
        "CR": "Certificate of Registration",
        "DL": "Driver's License"
    }
    return doc_types.get(doc_type, doc_type)

# Configure logger
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/applicant",
    tags=["Applicant"]
)


def _normalize_file_number(s: Optional[str]) -> str:
    """Normalize file number: remove spaces and hyphens."""
    if not s or not isinstance(s, str):
        return (s or "").strip()
    return s.replace(" ", "").replace("-", "").replace("—", "").replace("–", "").strip()


@router.post("/application/extract")
async def extract_document_details(
    doc_types: str = Form(...),
    doc_files: List[UploadFile] = File(...),
    plate_no: str = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: UserInDB = Depends(get_current_applicant)
):
    """
    Extract OCR data from documents without validation blocking.
    Returns file numbers and expiration dates for OR, CR, DL.
    Does not raise 422; returns whatever was extracted (null if OCR failed).
    """
    profile_query = select(Profile).where(Profile.user_id == current_user.user_id)
    profile_result = await db.execute(profile_query)
    user_profile = profile_result.scalar_one_or_none()
    if not user_profile:
        raise HTTPException(status_code=404, detail="User profile not found")

    doc_types_list = [dt.strip().upper() for dt in doc_types.split(",")]
    valid_types = {"OR", "CR", "DL"}
    if not all(dt in valid_types for dt in doc_types_list):
        raise HTTPException(status_code=400, detail="Invalid document type(s)")
    if set(doc_types_list) != {"OR", "CR", "DL"}:
        raise HTTPException(status_code=400, detail="Must provide OR, CR, DL")

    validation_results = []
    try:
        for doc_type, doc_file in zip(doc_types_list, doc_files):
            content = await doc_file.read()
            await doc_file.seek(0)
            suffix = os.path.splitext(doc_file.filename or "")[1] or ".bin"
            with tempfile.NamedTemporaryFile(delete=False, prefix="gpms_extract_", suffix=suffix) as f:
                f.write(content)
                temp_path = f.name
            try:
                result = extract_document_data(temp_path, doc_type)
                validation_results.append({"type": doc_type, "result": result, "temp_path": temp_path})
            finally:
                _safe_unlink(temp_path)

        response = {"OR": {"file_number": None, "expiration_date": None}, "CR": {"file_number": None}, "DL": {"expiration_date": None}}
        for v in validation_results:
            r = v["result"]
            dt = v["type"]
            if dt == "OR":
                response["OR"]["file_number"] = r.get("file_number")
                exp = r.get("dates", {}).get("expiration_date")
                if exp:
                    try:
                        s = str(exp)
                        if "/" in s and len(s.split("/")) >= 2:
                            parts = s.split("/")
                            if len(parts) == 3:
                                d = datetime.strptime(s, "%Y/%m/%d")
                                response["OR"]["expiration_date"] = d.strftime("%m/%Y")
                            else:
                                response["OR"]["expiration_date"] = s
                        else:
                            response["OR"]["expiration_date"] = s
                    except Exception:
                        response["OR"]["expiration_date"] = str(exp)
            elif dt == "CR":
                response["CR"]["file_number"] = r.get("file_number")
            elif dt == "DL":
                exp = r.get("dates", {}).get("expiration_date")
                response["DL"]["expiration_date"] = exp
        return response
    except Exception as e:
        for v in validation_results:
            _safe_unlink(v.get("temp_path") if isinstance(v, dict) else None)
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/application/extract-one")
async def extract_one_document(
    doc_type: str = Form(...),
    doc_file: UploadFile = File(...),
    current_user: UserInDB = Depends(get_current_applicant)
):
    """
    Extract OCR data from a single document (OR, CR, or DL). No validation.
    Returns file_number and/or expiration_date per document type.
    """
    doc_type = doc_type.strip().upper()
    if doc_type not in {"OR", "CR", "DL"}:
        raise HTTPException(status_code=400, detail="Invalid document type. Use OR, CR, or DL.")
    temp_path = None
    try:
        content = await doc_file.read()
        await doc_file.seek(0)
        suffix = os.path.splitext(doc_file.filename or "")[1] or ".bin"
        with tempfile.NamedTemporaryFile(delete=False, prefix="gpms_extract_one_", suffix=suffix) as f:
            f.write(content)
            temp_path = f.name
        result = extract_document_data(temp_path, doc_type)
        response = {"file_number": None, "expiration_date": None}
        if doc_type == "OR":
            response["file_number"] = result.get("file_number")
            exp = result.get("dates", {}).get("expiration_date")
            if exp:
                try:
                    s = str(exp)
                    if "/" in s and len(s.split("/")) >= 2:
                        parts = s.split("/")
                        if len(parts) == 3:
                            d = datetime.strptime(s, "%Y/%m/%d")
                            response["expiration_date"] = d.strftime("%m/%Y")
                        else:
                            response["expiration_date"] = s
                    else:
                        response["expiration_date"] = s
                except Exception:
                    response["expiration_date"] = str(exp)
        elif doc_type == "CR":
            def _str(v):
                return str(v).strip() if v is not None else ""
            response["file_number"] = result.get("file_number") or ""
            dates = result.get("dates") or {}
            response["date"] = _str(dates.get("document_date") or dates.get("expiration_date"))
            response["owner_name"] = _str(result.get("owner_name"))
            response["owner_address"] = _str(result.get("owner_address"))
            response["engine_no"] = _str(result.get("engine_no"))
            response["chassis_no"] = _str(result.get("chassis_no"))
            response["plate_number"] = _str(result.get("plate_number"))
            response["make"] = _str(result.get("make"))
            response["year_model"] = _str(result.get("year_model"))
            response["body_type"] = _str(result.get("body_type"))
            response["piston_displacement"] = _str(result.get("piston_displacement"))
        elif doc_type == "DL":
            exp = result.get("dates", {}).get("expiration_date")
            if exp:
                response["expiration_date"] = str(exp)
        return response
    finally:
        _safe_unlink(temp_path)


@router.post("/application")
async def create_application(
    request: Request,
    role: str = Form(...),
    building_name: str = Form(...),
    app_type: str = Form(...),
    plate_no: str = Form(...),
    doc_types: str = Form(...),  # "OR,CR,DL"
    doc_files: List[UploadFile] = File(...),
    driver_ids: str = Form(None),
    confirmed_or_file_number: str = Form(None),
    confirmed_cr_file_number: str = Form(None),
    confirmed_or_expiration: str = Form(None),
    confirmed_dl_expiration: str = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: UserInDB = Depends(get_current_applicant)
):
    try:
        # First get the user's profile data
        profile_query = select(Profile).where(Profile.user_id == current_user.user_id)
        profile_result = await db.execute(profile_query)
        user_profile = profile_result.scalar_one_or_none()

        if not user_profile:
            raise HTTPException(
                status_code=404,
                detail="User profile not found"
            )

        # Get vehicle data
        vehicle_query = select(Vehicle).where(Vehicle.plate_no == plate_no)
        vehicle_result = await db.execute(vehicle_query)
        vehicle = vehicle_result.scalar_one_or_none()

        if not vehicle:
            raise HTTPException(
                status_code=404,
                detail=f"Vehicle with plate number {plate_no} not found"
            )

        # Parse comma-separated strings into lists
        doc_types_list = [dt.strip().upper() for dt in doc_types.split(',')]

        # Validate document types first
        valid_types = {"OR", "CR", "DL"}
        invalid_types = [dt for dt in doc_types_list if dt not in valid_types]
        if invalid_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid document type(s): {', '.join(invalid_types)}"
            )

        # Check if required documents are present
        required_docs = {"OR", "CR", "DL"}
        missing_docs = required_docs - set(doc_types_list)
        if missing_docs:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required document(s): {', '.join(missing_docs)}"
            )

        use_confirmed = all([
            confirmed_or_file_number and confirmed_or_file_number.strip(),
            confirmed_cr_file_number and confirmed_cr_file_number.strip(),
            confirmed_or_expiration and confirmed_or_expiration.strip(),
            confirmed_dl_expiration and confirmed_dl_expiration.strip(),
        ])

        if not use_confirmed:
            raise HTTPException(
                status_code=400,
                detail="Please complete and confirm document details in Step 4 before submitting."
            )

        document_match = (_normalize_file_number(confirmed_or_file_number) ==
                         _normalize_file_number(confirmed_cr_file_number))
        if not document_match:
            raise HTTPException(
                status_code=400,
                detail="OR and CR file numbers do not match. Please correct the values."
            )

        validation_results = []
        for doc_type, doc_file in zip(doc_types_list, doc_files):
            content = await doc_file.read()
            await doc_file.seek(0)
            validation_results.append({
                "type": doc_type,
                "result": {"dates": {"expiration_date": None}},
                "content": content,
                "temp_path": None
            })

        # Convert driver IDs if provided
        driver_id_list = None
        if driver_ids:
            try:
                driver_id_list = [int(id.strip()) for id in driver_ids.split(',')]
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid driver IDs format. Please provide comma-separated numbers"
                )

        # Process the validated documents to extract information (without re-validating)
        documents_data = []
        or_expiration = None

        for validation_data in validation_results:
            try:
                doc_type = validation_data["type"]
                validation_result = validation_data["result"]
                content = validation_data["content"]

                if use_confirmed:
                    if doc_type == "OR":
                        try:
                            exp_date = datetime.strptime(confirmed_or_expiration.strip(), "%m/%Y")
                        except ValueError:
                            raise HTTPException(status_code=400, detail="Invalid OR expiration format. Use MM/YYYY.")
                        exp_date = exp_date.replace(day=28) + timedelta(days=4)
                        exp_date = exp_date - timedelta(days=exp_date.day)
                    elif doc_type == "CR":
                        try:
                            exp_date = datetime.strptime(confirmed_or_expiration.strip(), "%m/%Y")
                        except ValueError:
                            raise HTTPException(status_code=400, detail="Invalid OR expiration format. Use MM/YYYY.")
                        exp_date = exp_date.replace(day=28) + timedelta(days=4)
                        exp_date = exp_date - timedelta(days=exp_date.day)
                    else:
                        try:
                            exp_date = datetime.strptime(confirmed_dl_expiration.strip(), "%Y/%m/%d")
                        except ValueError:
                            try:
                                exp_date = datetime.strptime(confirmed_dl_expiration.strip(), "%Y-%m-%d")
                            except ValueError:
                                raise HTTPException(status_code=400, detail="Invalid DL expiration format. Use YYYY/MM/DD or YYYY-MM-DD.")
                else:
                    if doc_type == "OR":
                        or_expiration = validation_result['dates']['expiration_date']
                        try:
                            exp_date = datetime.strptime(or_expiration, "%m/%Y")
                        except ValueError:
                            exp_date = datetime.strptime(or_expiration, "%Y/%m/%d")
                        exp_date = exp_date.replace(day=28) + timedelta(days=4)
                        exp_date = exp_date - timedelta(days=exp_date.day)
                    elif doc_type == "CR":
                        try:
                            exp_date = datetime.strptime(or_expiration, "%m/%Y")
                        except ValueError:
                            exp_date = datetime.strptime(or_expiration, "%Y/%m/%d")
                        exp_date = exp_date.replace(day=28) + timedelta(days=4)
                        exp_date = exp_date - timedelta(days=exp_date.day)
                    else:
                        exp_date = datetime.strptime(
                            validation_result['dates']['expiration_date'],
                            "%Y/%m/%d"
                        )

                documents_data.append({
                    "type": get_full_document_type(doc_type),
                    "image": content,
                    "registered_date": datetime.now().date(),
                    "expired_at": exp_date.date()
                })
            finally:
                _safe_unlink(validation_data.get("temp_path"))

        # Create application data
        application_data = ApplicationCreate(
            role=role,
            building_name=building_name,
            app_type=app_type,
            plate_no=plate_no,
            documents=[
                DocumentCreate(**doc_data)
                for doc_data in documents_data
            ]
        )
        
        view = ApplicantView(db)
        result = await view.create_application(
            application_data=application_data,
            user_id=current_user.user_id,
            driver_ids=driver_id_list  # Pass as separate parameter
        )


        return result

    except HTTPException as he:
        raise he
    except RequestValidationError as e:
        raise HTTPException(
            status_code=422,
            detail=[{
                "loc": error["loc"],
                "msg": error["msg"],
                "type": error["type"]
            } for error in e.errors()]
        )
    except Exception as e:
        if "validation_results" in locals():
            for v in validation_results:
                _safe_unlink(v.get("temp_path"))
        raise HTTPException(status_code=400, detail=str(e))

# Add this new route
@router.delete("/application/{application_id}", response_model=dict)
async def delete_application(
    application_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: UserInDB = Depends(get_current_applicant)
):
    """
    Temporarily delete an application and all its related records (cascade delete)
    """
    view = ApplicantView(db)
    return await view.delete_application(application_id, current_user.user_id)

@router.post("/application/{application_id}/payment-slip", response_model=dict)
async def send_payment_slip(
    application_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: UserInDB = Depends(get_current_applicant)
):
    """
    Send the initial payment slip email for a specific application.
    Can be triggered from the applicant dashboard via \"Get Payment Slip\".
    """
    view = ApplicantView(db)
    return await view.send_initial_payment_slip(application_id, current_user.user_id)

@router.get("/applications/to-submit", response_model=List[ApplicationListResponse])
async def get_to_submit_applications(
    vehicle_type: Optional[str] = Query(None, description="Filter by vehicle type (Car, Truck, Motorcycle, Van, Tricycle, or all)"),
    db: AsyncSession = Depends(get_db),
    current_user: UserInDB = Depends(get_current_applicant)
):
    controller = ApplicantController(db)
    return await controller.get_non_pending_applications(current_user.user_id, vehicle_type)

@router.get("/vehicles", response_model=List[VehicleResponse])
async def get_user_vehicles(
    db: AsyncSession = Depends(get_db),
    current_user: UserInDB = Depends(get_current_applicant)
):
    """
    Get all vehicles linked to the current user's applications
    """
    view = ApplicantView(db)
    return await view.get_user_vehicles(current_user.user_id)

@router.get("/authorized-drivers", response_model=List[AuthorizedDriverResponse])
async def get_authorized_drivers(
    db: AsyncSession = Depends(get_db),
    current_user: UserInDB = Depends(get_current_applicant)
):
    """
    Get all authorized drivers associated with the current user's applications
    """
    view = ApplicantView(db)
    return await view.get_authorized_drivers(current_user.user_id)

@router.get("/vehicle/{plate_no}/image/{image_type}")
async def get_vehicle_image(
    plate_no: str,
    image_type: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserInDB = Depends(get_current_applicant)  
):
    """Get vehicle image by plate number and type (front/back)"""
    view = ApplicantView(db)
    image_data = await view.get_vehicle_image(plate_no, image_type, current_user.user_id)
    
    return Response(
        content=image_data,
        media_type="image/jpeg",
        headers={
            "Content-Type": "image/jpeg",
            "Cache-Control": "max-age=3600"
        }
    )

@router.get("/authorized-driver/{driver_id}/image")
async def get_driver_image(
    driver_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: UserInDB = Depends(get_current_applicant)
):
    """Get authorized driver's profile image"""
    view = ApplicantView(db)
    image_data = await view.get_driver_image(driver_id, current_user.user_id)
    
    return Response(
        content=image_data,
        media_type="image/jpeg",
        headers={
            "Content-Type": "image/jpeg",
            "Cache-Control": "max-age=3600"
        }
    )

@router.get("/authorized-driver/{driver_id}/document-image")
async def get_driver_document_image(
    driver_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: UserInDB = Depends(get_current_applicant)
):
    """Get authorized driver's document image"""
    try:
        view = ApplicantView(db)
        image_data = await view.get_driver_document_image(driver_id, current_user.user_id)
        
        return Response(
            content=image_data,
            media_type="image/jpeg",
            headers={
                "Content-Type": "image/jpeg",
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "max-age=3600"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving document image: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/authorized-driver/{driver_id}/profile-image")
async def get_driver_profile_image(
    driver_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: UserInDB = Depends(get_current_applicant)
):
    """Get authorized driver's profile image"""
    try:
        view = ApplicantView(db)
        image_data = await view.get_driver_image(driver_id, current_user.user_id)
        
        return Response(
            content=image_data,
            media_type="image/jpeg",
            headers={
                "Content-Type": "image/jpeg",
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "max-age=3600"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving driver image: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/document/{document_id}/image")
async def get_document_image(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: UserInDB = Depends(get_current_applicant)
):
    """Get document image by ID"""
    try:
        query = (
            select(Document)
            .where(
                and_(
                    Document.document_id == document_id,
                    Document.user_id == current_user.user_id
                )
            )
        )
        result = await db.execute(query)
        document = result.scalar_one_or_none()

        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        return Response(
            content=document.image,
            media_type="image/jpeg",
            headers={
                "Content-Type": "image/jpeg",
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "max-age=3600"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/authorized-driver", response_model=dict)
async def create_authorized_driver(
    driver_first_name: str = Form(...),
    driver_last_name: str = Form(...),
    driver_birth_date: date = Form(...),
    driver_relationship: str = Form(...),
    driver_profile: UploadFile = File(...),
    driver_license: UploadFile = File(...),
    driver_license_reg_date: date = Form(...),
    driver_license_exp_date: date = Form(...),
    db: AsyncSession = Depends(get_db),
    current_user: UserInDB = Depends(get_current_applicant)
):
    driver_temp_path = None
    try:
        content = await driver_license.read()
        await driver_license.seek(0)
        suffix = os.path.splitext(driver_license.filename or "")[1] or ".bin"
        with tempfile.NamedTemporaryFile(delete=False, prefix="gpms_dl_", suffix=suffix) as f:
            f.write(content)
            driver_temp_path = f.name
        driver_text_array = [
            driver_first_name,
            driver_last_name,
            driver_birth_date.strftime("%Y/%m/%d"),
            driver_relationship,
        ]
        reference_path = document_type("DL")  # Optional; validation uses OCR + applicant data
        driver_validation = validate_document(
            reference_path,
            driver_temp_path,
            driver_text_array,
            doc_type="DL",
            show_results=False,
            save_results=False,
        )
        if not driver_validation["is_valid"]:
            raise HTTPException(
                status_code=422,
                detail={
                    "message": "Driver document validation failed",
                    "errors": {
                        "image": not driver_validation["image_valid"],
                        "text": not driver_validation["text_valid"],
                        "expiration": not driver_validation["date_valid"],
                        "message": driver_validation.get("date_message", "")
                    }
                }
            )
        view = ApplicantView(db)
        return await view.create_authorized_driver(
            driver_first_name=driver_first_name,
            driver_last_name=driver_last_name,
            driver_birth_date=driver_birth_date,
            driver_relationship=driver_relationship,
            driver_profile=await driver_profile.read(),
            driver_license=await driver_license.read(),
            driver_license_reg_date=driver_license_reg_date,
            driver_license_exp_date=driver_license_exp_date,
            user_id=current_user.user_id
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        _safe_unlink(driver_temp_path)

@router.post("/application/{application_id}/assign-drivers")
async def assign_drivers_to_application(
    application_id: int,
    driver_ids: str = Form(...),  # Accept as string first
    db: AsyncSession = Depends(get_db),
    current_user: UserInDB = Depends(get_current_applicant)
):
    """
    Assign multiple drivers to an application
    """
    try:
        # Convert string of comma-separated IDs to list of integers
        driver_id_list = [int(id.strip()) for id in driver_ids.split(',')]
        
        view = ApplicantView(db)
        return await view.assign_drivers_to_application(
            application_id=application_id,
            driver_ids=driver_id_list,
            user_id=current_user.user_id
        )
    except HTTPException as he:
        raise he
    except ValueError:
        raise HTTPException(
            status_code=400, 
            detail="Invalid driver IDs format. Please provide comma-separated numbers"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/applications/approved", response_model=List[dict])
async def get_approved_applications(
    sticker_number: Optional[str] = Query(None, description="Filter by sticker number"),
    date: Optional[str] = Query(None, description="Filter by date (YYYY-MM-DD)"),
    vehicle_type: Optional[str] = Query(
        None, 
        description="Filter by vehicle type (Car, Truck, Motorcycle, Van, Tricycle, or all)"
    ),
    db: AsyncSession = Depends(get_db),
    current_user: UserInDB = Depends(get_current_applicant)
):
    """
    Get all approved applications with optional filters
    """
    view = ApplicantView(db)
    return await view.get_approved_applications(
        user_id=current_user.user_id,
        sticker_number=sticker_number,
        date=date,
        vehicle_type=vehicle_type
    )

@router.get("/application/{application_id}", response_model=dict)
async def get_application_by_id(
    application_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: UserInDB = Depends(get_current_applicant)
):
    """
    Get detailed information about a specific application by ID, including
    vehicle information, applicant details, documents, and authorized drivers.
    """
    view = ApplicantView(db)
    return await view.get_application_by_id(application_id, current_user.user_id)

@router.put("/application/{application_id}", response_model=dict)
async def update_application(
    application_id: int,
    application_role: str = Form(None),
    application_type: str = Form(None),
    applied_date: str = Form(None),
    expiration_date: str = Form(None),
    plate_number: str = Form(None),
    first_name: str = Form(None),
    last_name: str = Form(None),
    email: str = Form(None),
    contact_no: str = Form(None),
    date_of_birth: str = Form(None),
    gender: str = Form(None),
    address: str = Form(None),
    brand: str = Form(None),
    model: str = Form(None),
    vehicle_type: str = Form(None),
    color: str = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: UserInDB = Depends(get_current_applicant)
):
    """
    Update application details using form data. Only updates fields that are provided.
    """
    try:
        update_data = {}

        # Add application info if provided (with date validation)
        app_data = {}
        if application_role:
            app_data["application_role"] = application_role
        if application_type:
            app_data["application_type"] = application_type
        if applied_date and applied_date.strip():
            try:
                datetime.strptime(applied_date, "%Y-%m-%d")
                app_data["applied_date"] = applied_date
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid applied_date format. Use YYYY-MM-DD"
                )
        if expiration_date and expiration_date.strip():
            try:
                datetime.strptime(expiration_date, "%Y-%m-%d")
                app_data["expiration_date"] = expiration_date
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid expiration_date format. Use YYYY-MM-DD"
                )
        if plate_number:
            app_data["plate_number"] = plate_number
        
        if app_data:
            update_data.update(app_data)

        # Add owner info if provided (with date validation)
        owner_data = {}
        if any([first_name, last_name, email, contact_no, date_of_birth, gender, address]):
            if first_name:
                owner_data["first_name"] = first_name
            if last_name:
                owner_data["last_name"] = last_name
            if email:
                owner_data["email"] = email
            if contact_no:
                owner_data["contact_no"] = contact_no
            if date_of_birth and date_of_birth.strip():
                try:
                    datetime.strptime(date_of_birth, "%Y-%m-%d")
                    owner_data["date_of_birth"] = date_of_birth
                except ValueError:
                    raise HTTPException(
                        status_code=400,
                        detail="Invalid date_of_birth format. Use YYYY-MM-DD"
                    )
            if gender:
                owner_data["gender"] = gender
            if address:
                owner_data["address"] = address
            
            if owner_data:
                update_data["owner"] = owner_data

        # Add vehicle info if provided
        vehicle_data = {}
        if any([brand, model, vehicle_type, color, plate_number]):
            if brand:
                vehicle_data["brand"] = brand
            if model:
                vehicle_data["model"] = model
            if vehicle_type:
                vehicle_data["type"] = vehicle_type
            if color:
                vehicle_data["color"] = color
            if plate_number:
                vehicle_data["plate_number"] = plate_number
            
            if vehicle_data:
                update_data["vehicle"] = vehicle_data

        if not update_data:
            raise HTTPException(
                status_code=400,
                detail="No data provided for update"
            )

        controller = ApplicantController(db)
        return await controller.update_application(
            application_id=application_id,
            update_data=update_data,
            user_id=current_user.user_id
        )
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.exception("Error in update_application: %s", e)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update application: {str(e)}"
        )

@router.post("/request-email-verification", response_model=dict)
async def request_email_verification(
    email: str = Form(...),
    db: AsyncSession = Depends(get_db),
    current_user: UserInDB = Depends(get_current_applicant)
):
    """Request a verification OTP for email"""
    view = ApplicantView(db)
    return await view.request_email_verification(email, current_user.user_id)


@router.post("/verify-email-otp", response_model=dict)
async def verify_email_otp(
    otp: str = Form(...),
    db: AsyncSession = Depends(get_db),
    current_user: UserInDB = Depends(get_current_applicant)
):
    """Verify email OTP only (no profile update). Used by application flow."""
    return await ApplicantView(db).verify_email_otp(
        user_id=current_user.user_id,
        otp=otp
    )


@router.put("/verify-and-update-profile", response_model=dict)
async def verify_and_update_profile(
    first_name: str = Form(...),
    last_name: str = Form(...),
    birth_date: str = Form(...),
    sex: str = Form(...),
    contact_no: str = Form(...),
    address: str = Form(...),
    email: str = Form(...),
    otp: str = Form(...),
    image: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    current_user: UserInDB = Depends(get_current_applicant)
):
    """Verify OTP and update profile. For use only in Profile / update profile section."""
    try:
        try:
            birth_date_parsed = datetime.strptime(birth_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid birth_date format (use YYYY-MM-DD)"
            )
        image_data = None
        if image:
            if not image.content_type.startswith("image/"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="File uploaded is not an image"
                )
            image_data = await image.read()
        return await ApplicantView(db).verify_and_update_profile(
            first_name=first_name,
            last_name=last_name,
            birth_date=birth_date_parsed,
            sex=sex,
            contact_no=contact_no,
            address=address,
            email=email,
            otp=otp,
            image_data=image_data,
            user_id=current_user.user_id
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/vehicle", response_model=VehicleResponse)
async def add_or_update_vehicle(
    plate_no: str = Form(...),
    brand: str = Form(...),
    model: str = Form(...),
    vehicle_type: str = Form(...),
    color: str = Form(...),
    front_image: UploadFile = File(None),
    back_image: UploadFile = File(None),
    db: AsyncSession = Depends(get_db),
    current_user: UserInDB = Depends(get_current_applicant)
):
    """
    Add a new vehicle or update an existing one if it has the same plate number
    """
    try:
        # Process front image if provided
        front_image_data = None
        if front_image and front_image.filename:
            # Validate content type
            if not front_image.content_type.startswith('image/'):
                raise HTTPException(
                    status_code=400,
                    detail="Front image must be an image file"
                )
            # Read image data
            front_image_data = await front_image.read()
            
        # Process back image if provided
        back_image_data = None
        if back_image and back_image.filename:
            # Validate content type
            if not back_image.content_type.startswith('image/'):
                raise HTTPException(
                    status_code=400,
                    detail="Back image must be an image file"
                )
            # Read image data
            back_image_data = await back_image.read()

        # Input validation
        if not plate_no.strip():
            raise HTTPException(status_code=400, detail="Plate number is required")
        if not brand.strip():
            raise HTTPException(status_code=400, detail="Brand is required")
        if not model.strip():
            raise HTTPException(status_code=400, detail="Model is required")
        if not vehicle_type.strip():
            raise HTTPException(status_code=400, detail="Vehicle type is required")
        if not color.strip():
            raise HTTPException(status_code=400, detail="Color is required")

        view = ApplicantView(db)
        return await view.add_or_update_vehicle(
            plate_no=plate_no,
            brand=brand,
            model=model,
            vehicle_type=vehicle_type,
            color=color,
            user_id=current_user.user_id,
            front_image=front_image_data,
            back_image=back_image_data
        )
    
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error in add_or_update_vehicle: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process vehicle: {str(e)}"
        )

@router.get("/profile/image/{profile_id}")  
async def get_profile_image(
    profile_id: int,  # Changed from UUID to int
    db: AsyncSession = Depends(get_db),
    current_user: UserInDB = Depends(get_current_applicant)
):
    """Get profile image of a user"""
    try:
        # Get profile directly by profile_id
        query = select(Profile).where(Profile.profile_id == profile_id)
        result = await db.execute(query)
        profile = result.scalar_one_or_none()
        
        if not profile or not profile.profile_picture:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile image not found"
            )
            
        # Security check - only allow access to own profile image
        if profile.user_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this profile image"
            )
            
        return Response(
            content=profile.profile_picture,
            media_type="image/jpeg",
            headers={
                "Content-Type": "image/jpeg",
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "max-age=3600"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving profile image: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/application/{application_id}/driver/{driver_id}", response_model=dict)
async def delete_driver_from_application(
    application_id: int,
    driver_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: UserInDB = Depends(get_current_applicant)
):
    """
    Remove a specific driver from an application
    """
    try:
        view = ApplicantView(db)
        return await view.delete_driver_from_application(
            application_id=application_id,
            driver_id=driver_id,
            user_id=current_user.user_id
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/applications/submit-pending", response_model=dict)
async def submit_applications_to_pending(
    application_ids: str = Form(..., description="Comma-separated application IDs"),
    slip_image: UploadFile = File(..., description="Payment slip image"),
    official_receipt: str = Form(..., description="Official receipt number (XXXX-XXXXXXXXXXXX)"),  # Add this parameter
    db: AsyncSession = Depends(get_db),
    current_user: UserInDB = Depends(get_current_applicant)
):
    """Submit selected applications for approval with payment slip"""
    try:
        # Handle file upload
        contents = await slip_image.read()
        
        # Parse application IDs
        id_list = [int(id.strip()) for id in application_ids.split(',') if id.strip()]
        
        controller = ApplicantController(db)
        result = await controller.submit_specific_applications_to_pending(
            application_ids=id_list, 
            slip_image=contents,
            official_receipt=official_receipt,  # Pass the receipt number
            user_id=current_user.user_id
        )
        
        return result
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid application ID format. Please provide comma-separated integer IDs"
        )

@router.post("/cleanup-stale", response_model=dict)
async def cleanup_stale_applications_route(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: UserInDB = Depends(get_current_applicant)
):
    """
    Manually clean up stale applications (for testing)
    """
    deleted_count = await cleanup_stale_applications(db)
    return {
        "message": "Cleanup complete",
        "deleted_count": deleted_count
    }