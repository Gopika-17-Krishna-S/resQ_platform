from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.database import get_db
from app.models import Task, User, SOSRequest, IncidentReport, TaskStatus, UserRole, VolunteerStatus
from app.schemas import TaskCreate, TaskResponse, TaskUpdate
from app.auth import get_current_user, get_current_admin, get_current_volunteer
from app.socketio_server import emit_task_assigned, emit_task_updated
import math

router = APIRouter(prefix="/tasks", tags=["Tasks"])


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two coordinates in km using Haversine formula"""
    R = 6371  # Earth's radius in km
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c


@router.post("/", response_model=TaskResponse)
async def create_task(
    task_data: TaskCreate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Create and assign task to volunteer (Admin only)"""
    
    # Verify volunteer exists
    volunteer = db.query(User).filter(
        User.id == task_data.volunteer_id,
        User.role == UserRole.VOLUNTEER
    ).first()
    
    if not volunteer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Volunteer not found"
        )
    
    # Verify either SOS or incident exists
    if not task_data.sos_request_id and not task_data.incident_report_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must specify either sos_request_id or incident_report_id"
        )
    
    if task_data.sos_request_id:
        sos = db.query(SOSRequest).filter(SOSRequest.id == task_data.sos_request_id).first()
        if not sos:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="SOS request not found"
            )
        sos.status = TaskStatus.ASSIGNED
    
    if task_data.incident_report_id:
        incident = db.query(IncidentReport).filter(
            IncidentReport.id == task_data.incident_report_id
        ).first()
        if not incident:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Incident report not found"
            )
        incident.status = TaskStatus.ASSIGNED
    
    # Create task
    task = Task(
        volunteer_id=task_data.volunteer_id,
        sos_request_id=task_data.sos_request_id,
        incident_report_id=task_data.incident_report_id,
        status=TaskStatus.ASSIGNED,
        notes=task_data.notes
    )
    
    db.add(task)
    db.commit()
    db.refresh(task)
    
    # Emit socket event
    task_response = TaskResponse.model_validate(task)
    await emit_task_assigned(task_response.model_dump(mode='json'), task.volunteer_id)
    
    return task_response


@router.get("/", response_model=List[TaskResponse])
def get_tasks(
    status_filter: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get tasks based on user role"""
    
    query = db.query(Task)
    
    # Volunteers only see their own tasks
    if current_user.role == UserRole.VOLUNTEER:
        query = query.filter(Task.volunteer_id == current_user.id)
    
    # Citizens see tasks related to their SOS/incidents
    if current_user.role == UserRole.CITIZEN:
        sos_ids = [s.id for s in current_user.sos_requests]
        incident_ids = [i.id for i in current_user.incident_reports]
        
        query = query.filter(
            (Task.sos_request_id.in_(sos_ids)) | (Task.incident_report_id.in_(incident_ids))
        )
    
    if status_filter:
        try:
            task_status = TaskStatus(status_filter)
            query = query.filter(Task.status == task_status)
        except ValueError:
            pass
    
    tasks = query.order_by(Task.assigned_at.desc()).all()
    return [TaskResponse.model_validate(task) for task in tasks]


@router.get("/nearby", response_model=List[TaskResponse])
def get_nearby_tasks(
    current_user: User = Depends(get_current_volunteer),
    db: Session = Depends(get_db)
):
    """Get nearby unassigned tasks for volunteers"""
    
    if not current_user.latitude or not current_user.longitude:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Update your location first"
        )
    
    # Get pending SOS and incidents
    pending_sos = db.query(SOSRequest).filter(
        SOSRequest.status == TaskStatus.PENDING
    ).all()
    
    pending_incidents = db.query(IncidentReport).filter(
        IncidentReport.status == TaskStatus.PENDING
    ).all()
    
    # Calculate distances and create dummy tasks for display
    nearby_tasks = []
    
    for sos in pending_sos:
        distance = calculate_distance(
            current_user.latitude, current_user.longitude,
            sos.latitude, sos.longitude
        )
        if distance <= 50:  # Within 50km
            task_data = {
                "id": 0,
                "volunteer_id": None,
                "sos_request_id": sos.id,
                "incident_report_id": None,
                "status": TaskStatus.PENDING,
                "assigned_at": sos.created_at,
                "accepted_at": None,
                "completed_at": None,
                "notes": f"Distance: {distance:.2f} km",
                "volunteer": None,
                "sos_request": sos,
                "incident_report": None
            }
            nearby_tasks.append(task_data)
    
    for incident in pending_incidents:
        distance = calculate_distance(
            current_user.latitude, current_user.longitude,
            incident.latitude, incident.longitude
        )
        if distance <= 50:  # Within 50km
            task_data = {
                "id": 0,
                "volunteer_id": None,
                "sos_request_id": None,
                "incident_report_id": incident.id,
                "status": TaskStatus.PENDING,
                "assigned_at": incident.created_at,
                "accepted_at": None,
                "completed_at": None,
                "notes": f"Distance: {distance:.2f} km",
                "volunteer": None,
                "sos_request": None,
                "incident_report": incident
            }
            nearby_tasks.append(task_data)
    
    return nearby_tasks


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get task by ID"""
    
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Check permissions
    if current_user.role == UserRole.VOLUNTEER and task.volunteer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this task"
        )
    
    if current_user.role == UserRole.CITIZEN:
        # Check if task is related to user's SOS or incident
        is_authorized = False
        if task.sos_request and task.sos_request.citizen_id == current_user.id:
            is_authorized = True
        if task.incident_report and task.incident_report.citizen_id == current_user.id:
            is_authorized = True
        
        if not is_authorized:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this task"
            )
    
    return TaskResponse.model_validate(task)


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    update_data: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update task status and notes"""
    
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Volunteers can only update their own tasks
    if current_user.role == UserRole.VOLUNTEER and task.volunteer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this task"
        )
    
    # Citizens cannot update tasks
    if current_user.role == UserRole.CITIZEN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Citizens cannot update tasks"
        )
    
    if update_data.status:
        task.status = update_data.status
        
        # Update timestamps
        if update_data.status == TaskStatus.ACCEPTED:
            task.accepted_at = datetime.utcnow()
        elif update_data.status == TaskStatus.COMPLETED:
            task.completed_at = datetime.utcnow()
        
        # Update related SOS/incident status
        if task.sos_request:
            task.sos_request.status = update_data.status
        if task.incident_report:
            task.incident_report.status = update_data.status
    
    if update_data.notes:
        task.notes = update_data.notes
    
    db.commit()
    db.refresh(task)
    
    # Emit socket event
    task_response = TaskResponse.model_validate(task)
    user_ids = [task.volunteer_id]
    if task.sos_request:
        user_ids.append(task.sos_request.citizen_id)
    if task.incident_report:
        user_ids.append(task.incident_report.citizen_id)
        
    await emit_task_updated(task_response.model_dump(mode='json'), user_ids)
    
    return task_response


@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete task (Admin only)"""
    
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    db.delete(task)
    db.commit()
    
    return {"message": "Task deleted successfully"}
