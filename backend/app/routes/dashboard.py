from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, SOSRequest, IncidentReport, Task, TaskStatus, UserRole, VolunteerStatus
from app.schemas import DashboardStats
from app.auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get dashboard statistics"""
    
    stats = {}
    
    if current_user.role == UserRole.ADMIN:
        # Admin sees all stats
        stats["total_sos"] = db.query(SOSRequest).count()
        stats["total_incidents"] = db.query(IncidentReport).count()
        stats["pending_tasks"] = db.query(Task).filter(
            Task.status.in_([TaskStatus.PENDING, TaskStatus.ASSIGNED])
        ).count()
        stats["active_volunteers"] = db.query(User).filter(
            User.role == UserRole.VOLUNTEER,
            User.volunteer_status == VolunteerStatus.ONLINE
        ).count()
        stats["total_users"] = db.query(User).filter(User.role == UserRole.CITIZEN).count()
        stats["resolved_tasks"] = db.query(Task).filter(
            Task.status == TaskStatus.COMPLETED
        ).count()
    
    elif current_user.role == UserRole.VOLUNTEER:
        # Volunteer sees their stats
        stats["total_sos"] = db.query(SOSRequest).filter(
            SOSRequest.status != TaskStatus.COMPLETED
        ).count()
        stats["total_incidents"] = db.query(IncidentReport).filter(
            IncidentReport.status != TaskStatus.COMPLETED
        ).count()
        stats["pending_tasks"] = db.query(Task).filter(
            Task.volunteer_id == current_user.id,
            Task.status.in_([TaskStatus.ASSIGNED, TaskStatus.ACCEPTED, TaskStatus.RESPONDING])
        ).count()
        stats["active_volunteers"] = 0
        stats["total_users"] = 0
        stats["resolved_tasks"] = db.query(Task).filter(
            Task.volunteer_id == current_user.id,
            Task.status == TaskStatus.COMPLETED
        ).count()
    
    else:  # Citizen
        # Citizen sees their stats
        stats["total_sos"] = db.query(SOSRequest).filter(
            SOSRequest.citizen_id == current_user.id
        ).count()
        stats["total_incidents"] = db.query(IncidentReport).filter(
            IncidentReport.citizen_id == current_user.id
        ).count()
        stats["pending_tasks"] = 0
        stats["active_volunteers"] = 0
        stats["total_users"] = 0
        stats["resolved_tasks"] = 0
    
    return DashboardStats(**stats)
