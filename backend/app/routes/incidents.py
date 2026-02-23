from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import IncidentReport, User, TaskStatus
from app.schemas import IncidentReportCreate, IncidentReportResponse, IncidentReportUpdate
from app.auth import get_current_user, get_current_citizen, get_current_admin
from app.socketio_server import emit_incident_created

router = APIRouter(prefix="/incidents", tags=["Incident Reports"])


@router.post("/", response_model=IncidentReportResponse)
async def create_incident_report(
    incident_data: IncidentReportCreate,
    current_user: User = Depends(get_current_citizen),
    db: Session = Depends(get_db)
):
    """Create new incident report (Citizen only)"""
    
    incident = IncidentReport(
        citizen_id=current_user.id,
        incident_type=incident_data.incident_type,
        title=incident_data.title,
        description=incident_data.description,
        latitude=incident_data.latitude,
        longitude=incident_data.longitude,
        address=incident_data.address,
        image_url=incident_data.image_url,
        status=TaskStatus.PENDING
    )
    
    db.add(incident)
    db.commit()
    db.refresh(incident)
    
    # Emit socket event
    incident_response = IncidentReportResponse.model_validate(incident)
    await emit_incident_created(incident_response.model_dump(mode='json'))
    
    return incident_response


@router.get("/", response_model=List[IncidentReportResponse])
def get_all_incidents(
    status_filter: str = None,
    incident_type: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all incident reports"""
    
    query = db.query(IncidentReport)
    
    # Citizens can only see their own incidents
    if current_user.role.value == "citizen":
        query = query.filter(IncidentReport.citizen_id == current_user.id)
    
    if status_filter:
        try:
            task_status = TaskStatus(status_filter)
            query = query.filter(IncidentReport.status == task_status)
        except ValueError:
            pass
    
    if incident_type:
        query = query.filter(IncidentReport.incident_type == incident_type)
    
    incidents = query.order_by(IncidentReport.created_at.desc()).all()
    return [IncidentReportResponse.model_validate(inc) for inc in incidents]


@router.get("/{incident_id}", response_model=IncidentReportResponse)
def get_incident(
    incident_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get incident report by ID"""
    
    incident = db.query(IncidentReport).filter(IncidentReport.id == incident_id).first()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident report not found"
        )
    
    # Citizens can only view their own incidents
    if current_user.role.value == "citizen" and incident.citizen_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this incident"
        )
    
    return IncidentReportResponse.model_validate(incident)


@router.put("/{incident_id}", response_model=IncidentReportResponse)
def update_incident(
    incident_id: int,
    update_data: IncidentReportUpdate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update incident report (Admin only)"""
    
    incident = db.query(IncidentReport).filter(IncidentReport.id == incident_id).first()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident report not found"
        )
    
    if update_data.status:
        incident.status = update_data.status
    if update_data.incident_type:
        incident.incident_type = update_data.incident_type
    if update_data.title:
        incident.title = update_data.title
    if update_data.description:
        incident.description = update_data.description
    
    db.commit()
    db.refresh(incident)
    
    return IncidentReportResponse.model_validate(incident)


@router.delete("/{incident_id}")
def delete_incident(
    incident_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete incident report (Admin only)"""
    
    incident = db.query(IncidentReport).filter(IncidentReport.id == incident_id).first()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident report not found"
        )
    
    db.delete(incident)
    db.commit()
    
    return {"message": "Incident report deleted successfully"}
