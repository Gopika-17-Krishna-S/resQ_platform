from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import SOSRequest, User, TaskStatus
from app.schemas import SOSRequestCreate, SOSRequestResponse
from app.auth import get_current_user, get_current_citizen, get_current_admin

router = APIRouter(prefix="/sos", tags=["SOS Requests"])


from app.socketio_server import emit_sos_created

@router.post("/", response_model=SOSRequestResponse)
async def create_sos_request(
    sos_data: SOSRequestCreate,
    current_user: User = Depends(get_current_citizen),
    db: Session = Depends(get_db)
):
    """Create new SOS request (Citizen only)"""
    
    sos = SOSRequest(
        citizen_id=current_user.id,
        latitude=sos_data.latitude,
        longitude=sos_data.longitude,
        address=sos_data.address,
        status=TaskStatus.PENDING
    )
    
    db.add(sos)
    db.commit()
    db.refresh(sos)
    
    # Emit socket event
    sos_response = SOSRequestResponse.model_validate(sos)
    await emit_sos_created(sos_response.model_dump(mode='json'))
    
    return sos_response


@router.get("/", response_model=List[SOSRequestResponse])
def get_all_sos_requests(
    status_filter: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all SOS requests"""
    
    query = db.query(SOSRequest)
    
    # Citizens can only see their own SOS requests
    if current_user.role.value == "citizen":
        query = query.filter(SOSRequest.citizen_id == current_user.id)
    
    if status_filter:
        try:
            task_status = TaskStatus(status_filter)
            query = query.filter(SOSRequest.status == task_status)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid status"
            )
    
    sos_requests = query.order_by(SOSRequest.created_at.desc()).all()
    return [SOSRequestResponse.model_validate(sos) for sos in sos_requests]


@router.get("/{sos_id}", response_model=SOSRequestResponse)
def get_sos_request(
    sos_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get SOS request by ID"""
    
    sos = db.query(SOSRequest).filter(SOSRequest.id == sos_id).first()
    if not sos:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SOS request not found"
        )
    
    # Citizens can only view their own SOS
    if current_user.role.value == "citizen" and sos.citizen_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this SOS request"
        )
    
    return SOSRequestResponse.model_validate(sos)


@router.put("/{sos_id}")
def update_sos_request(
    sos_id: int,
    sos_data: dict,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Full update of SOS request (Admin only)"""
    
    sos = db.query(SOSRequest).filter(SOSRequest.id == sos_id).first()
    if not sos:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SOS request not found"
        )
    
    # Update fields if provided
    if "latitude" in sos_data:
        sos.latitude = sos_data["latitude"]
    if "longitude" in sos_data:
        sos.longitude = sos_data["longitude"]
    if "address" in sos_data:
        sos.address = sos_data["address"]
    if "status" in sos_data:
        try:
            sos.status = TaskStatus(sos_data["status"])
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid status"
            )
    
    db.commit()
    db.refresh(sos)
    
    return SOSRequestResponse.model_validate(sos)


@router.put("/{sos_id}/status")
def update_sos_status(
    sos_id: int,
    status_data: dict,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update SOS status (Admin only)"""
    
    sos = db.query(SOSRequest).filter(SOSRequest.id == sos_id).first()
    if not sos:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SOS request not found"
        )
    
    new_status = status_data.get("status")
    try:
        sos.status = TaskStatus(new_status)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status"
        )
    
    db.commit()
    db.refresh(sos)
    
    return {"message": "Status updated successfully", "status": sos.status.value}


@router.delete("/{sos_id}")
def delete_sos_request(
    sos_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete SOS request (Admin only)"""
    
    sos = db.query(SOSRequest).filter(SOSRequest.id == sos_id).first()
    if not sos:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SOS request not found"
        )
    
    db.delete(sos)
    db.commit()
    
    return {"message": "SOS request deleted successfully"}
