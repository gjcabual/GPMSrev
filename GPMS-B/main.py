from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware  # Add this import
from app.db.session import engine
from app.db.models.user import Base as UserBase
from app.db.models.profile import Base as ProfileBase
from app.db.models.auth_driver import Base as AuthDriverBase
from app.db.models.token import Base as TokenBase
from app.db.models.application import Base as ApplicationBase
from app.db.models.application_status import Base as ApplicationStatusBase
from app.db.models.vehicle import Base as VehicleBase
from app.db.models.slip import Base as SlipBase
from app.db.models.document import Base as DocumentBase
from app.db.models.sticker import Base as StickerBase
from app.db.models.batch_sticker_sessions import Base as BatchStickerSessionsBase
from app.db.models.assigned_driver import Base as AssignedDriverBase

from app.core.security import get_current_user, get_current_applicant, get_current_staff, get_current_admin
from app.schemas.user import UserInDB
from app.api.v1.adminAuth import routes as admin_routes
from app.api.v1.applicantAuth import routes as applicant_routes
from app.api.v1.staffAuth import routes as staff_routes
from app.api.v1.commonAuth import routes as common_routes
from app.api.v1.management_route.dashboard import routes as dashboard_routes
from app.api.v1.admin_route.staff_page.routes import router as admin_staff_router  
from app.api.v1.management_route.management import routes as management_routes
from app.api.v1.temp_route import routes as vehicle_routes  
from app.api.v1.management_route.reports import routes as reports_routes  
from app.api.v1.staff_route.route import router as staff_application_router  
from app.api.v1.applicant_route import routes as applicant_application_routes 
from app.api.v1.management_route.appliant_logs.route import router as applicant_logs_router  

app = FastAPI(title="GPMS-Backend System", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],  
)

# Auto-create tables
async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(UserBase.metadata.create_all)
        await conn.run_sync(ProfileBase.metadata.create_all)
        await conn.run_sync(TokenBase.metadata.create_all)
        await conn.run_sync(ApplicationBase.metadata.create_all)
        await conn.run_sync(ApplicationStatusBase.metadata.create_all)
        await conn.run_sync(AuthDriverBase.metadata.create_all)
        await conn.run_sync(VehicleBase.metadata.create_all)
        await conn.run_sync(SlipBase.metadata.create_all)
        await conn.run_sync(DocumentBase.metadata.create_all)
        await conn.run_sync(StickerBase.metadata.create_all)
        await conn.run_sync(BatchStickerSessionsBase.metadata.create_all)
        await conn.run_sync(AssignedDriverBase.metadata.create_all)

@app.on_event("startup")
async def startup_event():
    await init_db()

@app.get("/")
def read_root():
    return {"message": "GPMS Server is Running!"}

@app.get("/protected")
async def read_protected(current_user: UserInDB = Depends(get_current_user)):
    return {"message": f"Hello, {current_user.email}!"}

@app.get("/applicant")
async def read_applicant(current_user: UserInDB = Depends(get_current_applicant)):
    return {"message": f"Hello, Applicant {current_user.email}!"}

@app.get("/staff")
async def read_staff(current_user: UserInDB = Depends(get_current_staff)):
    return {"message": f"Hello, Staff {current_user.email}!"}

@app.get("/admin")
async def read_admin(current_user: UserInDB = Depends(get_current_admin)):
    return {"message": f"Hello, Admin {current_user.email}!"}

# Authentication routes
app.include_router(admin_routes.router, prefix="/api/v1/admin", tags=["admin"])
app.include_router(admin_staff_router, prefix="/api/v1/admin", tags=["admin"])  # Add this line
app.include_router(applicant_routes.router, prefix="/api/v1/applicant", tags=["applicant"])
app.include_router(staff_routes.router, prefix="/api/v1/staff", tags=["staff"])
app.include_router(staff_application_router, prefix="/api/v1", tags=["staff"])  # Add this line
app.include_router(common_routes.router, prefix="/api/v1", tags=["common"])

# Management routes 
# Dashboard route 
app.include_router(dashboard_routes.router, prefix="/api/v1/management", tags=["management"])  
app.include_router(management_routes.router, prefix="/api/v1", tags=["management"]) 
app.include_router(reports_routes.router, prefix="/api/v1/management", tags=["management"])
# Add the applicant logs router
app.include_router(applicant_logs_router, prefix="/api/v1", tags=["management"])

# Add this with other route includes
app.include_router(
    applicant_application_routes.router, 
    prefix="/api/v1", 
    tags=["applicant"]
)

# For development purposes only - remove in production
# Vehicle routes
app.include_router(vehicle_routes.router, prefix="/api/v1", tags=["vehicles"])