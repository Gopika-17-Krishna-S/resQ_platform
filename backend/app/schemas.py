from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from app.models import UserRole, TaskStatus, VolunteerStatus, IncidentType


# ========== User Schemas ==========
class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    volunteer_id: Optional[str] = None
    full_name: str
    role: UserRole


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    identifier: str  # Can be email, phone, or volunteer_id
    password: str
    role: Optional[UserRole] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    volunteer_status: Optional[VolunteerStatus] = None


class UserResponse(UserBase):
    id: int
    is_active: bool
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    volunteer_status: Optional[VolunteerStatus] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserLocationUpdate(BaseModel):
    latitude: float
    longitude: float
    address: Optional[str] = None


# ========== Auth Schemas ==========
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    user_id: Optional[int] = None
    role: Optional[UserRole] = None


# ========== SOS Request Schemas ==========
class SOSRequestCreate(BaseModel):
    latitude: float
    longitude: float
    address: Optional[str] = None


class SOSRequestResponse(BaseModel):
    id: int
    citizen_id: int
    latitude: float
    longitude: float
    address: Optional[str] = None
    status: TaskStatus
    created_at: datetime
    citizen: UserResponse
    tasks: List['TaskResponse'] = []
    
    class Config:
        from_attributes = True


# ========== Incident Report Schemas ==========
class IncidentReportCreate(BaseModel):
    incident_type: IncidentType
    title: str
    description: str
    latitude: float
    longitude: float
    address: Optional[str] = None
    image_url: Optional[str] = None


class IncidentReportUpdate(BaseModel):
    status: Optional[TaskStatus] = None
    incident_type: Optional[IncidentType] = None
    title: Optional[str] = None
    description: Optional[str] = None


class IncidentReportResponse(BaseModel):
    id: int
    citizen_id: int
    incident_type: IncidentType
    title: str
    description: str
    latitude: float
    longitude: float
    address: Optional[str] = None
    image_url: Optional[str] = None
    status: TaskStatus
    created_at: datetime
    citizen: UserResponse
    tasks: List['TaskResponse'] = []
    
    class Config:
        from_attributes = True


# ========== Task Schemas ==========
class TaskCreate(BaseModel):
    volunteer_id: int
    sos_request_id: Optional[int] = None
    incident_report_id: Optional[int] = None
    notes: Optional[str] = None


class TaskUpdate(BaseModel):
    status: Optional[TaskStatus] = None
    notes: Optional[str] = None


# ========== Simple data classes for Task display ==========
class TaskSOSData(BaseModel):
    """Simplified SOS data for task display"""
    id: int
    address: Optional[str] = None
    latitude: float
    longitude: float
    status: TaskStatus
    created_at: datetime
    citizen: UserResponse
    
    class Config:
        from_attributes = True


class TaskIncidentData(BaseModel):
    """Simplified Incident data for task display"""
    id: int
    title: str
    description: str
    incident_type: IncidentType
    address: Optional[str] = None
    latitude: float
    longitude: float
    status: TaskStatus
    created_at: datetime
    citizen: UserResponse
    
    class Config:
        from_attributes = True


class TaskResponse(BaseModel):
    id: int
    volunteer_id: Optional[int] = None
    sos_request_id: Optional[int] = None
    incident_report_id: Optional[int] = None
    status: TaskStatus
    assigned_at: datetime
    accepted_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None
    volunteer: Optional[UserResponse] = None
    sos_request: Optional[TaskSOSData] = None
    incident_report: Optional[TaskIncidentData] = None
    
    class Config:
        from_attributes = True


# ========== Message Schemas ==========
class MessageCreate(BaseModel):
    recipient_id: Optional[int] = None
    task_id: Optional[int] = None
    content: str
    is_broadcast: bool = False


class MessageResponse(BaseModel):
    id: int
    sender_id: int
    recipient_id: Optional[int] = None
    task_id: Optional[int] = None
    content: str
    is_broadcast: bool
    is_read: bool
    created_at: datetime
    sender: UserResponse
    
    class Config:
        from_attributes = True


# ========== Comment Schemas ==========
class CommentCreate(BaseModel):
    task_id: int
    content: str


class CommentResponse(BaseModel):
    id: int
    task_id: int
    author_id: int
    content: str
    created_at: datetime
    author: UserResponse
    
    class Config:
        from_attributes = True


# ========== Broadcast Schemas ==========
class BroadcastCreate(BaseModel):
    title: str
    content: str


class BroadcastResponse(BaseModel):
    id: int
    title: str
    content: str
    created_by: int
    created_at: datetime
    is_active: bool
    
    class Config:
        from_attributes = True


# ========== Dashboard Stats ==========
class DashboardStats(BaseModel):
    total_sos: int
    total_incidents: int
    pending_tasks: int
    active_volunteers: int
    total_users: int
    resolved_tasks: int


# Resolve forward references for Pydantic models
SOSRequestResponse.model_rebuild()
IncidentReportResponse.model_rebuild()
TaskResponse.model_rebuild()
