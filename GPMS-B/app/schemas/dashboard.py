from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class ApplicationStatusCounts(BaseModel):
    total_approved: int
    total_rejected: int
    total_pending: int

class StickerTypeCounts(BaseModel):
    total_employee: int
    total_dropoff: int
    total_student: int
    total_concessionaire: int

class ChargesSummary(BaseModel):
    approved: float
    pending: float
    overall_total: float

class VehicleCount(BaseModel):
    vehicle_type: str
    count: int

class PendingVehicle(BaseModel):
    plate_number: str
    vehicle_type: str
    brand: str
    time: str

class VehicleTypeSummary(BaseModel):
    by_type: Dict[str, int]
    by_role: Dict[str, int]
    total_vehicles: int

class VehicleCountMatrix(BaseModel):
    headers: List[str]
    data: List[Dict[str, Any]]
    summary: VehicleTypeSummary

class DashboardResponse(BaseModel):
    application_status: ApplicationStatusCounts
    sticker_types: StickerTypeCounts
    charges_summary: ChargesSummary
    vehicle_counts: VehicleCountMatrix  
    pending_vehicles: List[PendingVehicle]