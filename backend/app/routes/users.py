from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import User, UserRole, VolunteerStatus
from app.schemas import UserResponse, UserUpdate, UserLocationUpdate
from app.auth import get_current_user, get_current_admin

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Get current user profile"""
    return UserResponse.model_validate(current_user)


@router.put("/me", response_model=UserResponse)
def update_current_user(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user profile"""
    
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name
    
    if user_update.phone is not None:
        current_user.phone = user_update.phone
    
    if user_update.latitude is not None:
        current_user.latitude = user_update.latitude
    
    if user_update.longitude is not None:
        current_user.longitude = user_update.longitude
    
    if user_update.address is not None:
        current_user.address = user_update.address
    
    user_role = str(current_user.role.value if hasattr(current_user.role, 'value') else current_user.role).lower()
    if user_update.volunteer_status is not None and user_role == "volunteer":
        current_user.volunteer_status = user_update.volunteer_status
    
    db.commit()
    db.refresh(current_user)
    
    return UserResponse.model_validate(current_user)


@router.put("/me/location", response_model=UserResponse)
def update_user_location(
    location: UserLocationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user location"""
    
    current_user.latitude = location.latitude
    current_user.longitude = location.longitude
    if location.address:
        current_user.address = location.address
    
    db.commit()
    db.refresh(current_user)
    
    return UserResponse.model_validate(current_user)


@router.put("/me/volunteer-status", response_model=UserResponse)
async def update_volunteer_status(
    status_update: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update volunteer online/offline status"""
    
    user_role = str(current_user.role.value if hasattr(current_user.role, 'value') else current_user.role).lower()
    if user_role != "volunteer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only volunteers can update status"
        )
    
    new_status = status_update.get("status")
    if new_status not in [s.value for s in VolunteerStatus]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status"
        )
    
    current_user.volunteer_status = VolunteerStatus(new_status)
    db.commit()
    db.refresh(current_user)
    
    # Emit socket event
    from app.socketio_server import emit_volunteer_status_change
    await emit_volunteer_status_change({
        "id": current_user.id,
        "full_name": current_user.full_name,
        "volunteer_status": current_user.volunteer_status.value
    })
    
    return UserResponse.model_validate(current_user)


@router.get("/", response_model=List[UserResponse])
def get_all_users(
    role: str = None,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all users (Admin only)"""
    
    query = db.query(User)
    
    if role:
        try:
            user_role = UserRole(role)
            query = query.filter(User.role == user_role)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid role"
            )
    
    users = query.all()
    return [UserResponse.model_validate(user) for user in users]


@router.get("/volunteers/online", response_model=List[UserResponse])
def get_online_volunteers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all online volunteers"""
    
    volunteers = db.query(User).filter(
        User.role == UserRole.VOLUNTEER,
        User.volunteer_status == VolunteerStatus.ONLINE
    ).all()
    
    return [UserResponse.model_validate(v) for v in volunteers]


@router.get("/{user_id}", response_model=UserResponse)
def get_user_by_id(
    user_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get user by ID (Admin only)"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse.model_validate(user)


@router.put("/{user_id}", response_model=UserResponse)
def admin_update_user(
    user_id: int,
    user_update: UserUpdate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update any user (Admin only)"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent admins from modifying other admins
    target_role = str(user.role.value if hasattr(user.role, 'value') else user.role).lower()
    if target_role == "admin" and user.id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot modify other admin users"
        )
    
    # Update fields if provided
    if user_update.full_name is not None:
        user.full_name = user_update.full_name
    if user_update.phone is not None:
        user.phone = user_update.phone
    if user_update.latitude is not None:
        user.latitude = user_update.latitude
    if user_update.longitude is not None:
        user.longitude = user_update.longitude
    if user_update.address is not None:
        user.address = user_update.address
    target_role = str(user.role.value if hasattr(user.role, 'value') else user.role).lower()
    if user_update.volunteer_status is not None and target_role == "volunteer":
        user.volunteer_status = user_update.volunteer_status
    
    db.commit()
    db.refresh(user)
    
    return UserResponse.model_validate(user)


@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete user (Admin only)"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent deletion of other admins
    user_role = str(user.role.value if hasattr(user.role, 'value') else user.role).lower()
    if user_role == "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete admin users"
        )
    
    # Thorough manual cleanup of all related dependencies to avoid FK errors
    from app.models import SOSRequest, IncidentReport, Task, Comment, Message
    
    # 1. Clean up SOS requests and their tasks
    sos_ids = [s.id for s in db.query(SOSRequest).filter(SOSRequest.citizen_id == user_id).all()]
    if sos_ids:
        task_ids = [t.id for t in db.query(Task).filter(Task.sos_request_id.in_(sos_ids)).all()]
        if task_ids:
            db.query(Comment).filter(Comment.task_id.in_(task_ids)).delete(synchronize_session=False)
            db.query(Message).filter(Message.task_id.in_(task_ids)).delete(synchronize_session=False)
            db.query(Task).filter(Task.id.in_(task_ids)).delete(synchronize_session=False)
        db.query(SOSRequest).filter(SOSRequest.id.in_(sos_ids)).delete(synchronize_session=False)
        
    # 2. Clean up Incident Reports and their tasks
    incident_ids = [i.id for i in db.query(IncidentReport).filter(IncidentReport.citizen_id == user_id).all()]
    if incident_ids:
        task_ids = [t.id for t in db.query(Task).filter(Task.incident_report_id.in_(incident_ids)).all()]
        if task_ids:
            db.query(Comment).filter(Comment.task_id.in_(task_ids)).delete(synchronize_session=False)
            db.query(Message).filter(Message.task_id.in_(task_ids)).delete(synchronize_session=False)
            db.query(Task).filter(Task.id.in_(task_ids)).delete(synchronize_session=False)
        db.query(IncidentReport).filter(IncidentReport.id.in_(incident_ids)).delete(synchronize_session=False)
        
    # 3. Clean up Tasks assigned to this user (if volunteer)
    task_ids = [t.id for t in db.query(Task).filter(Task.volunteer_id == user_id).all()]
    if task_ids:
        db.query(Comment).filter(Comment.task_id.in_(task_ids)).delete(synchronize_session=False)
        db.query(Message).filter(Message.task_id.in_(task_ids)).delete(synchronize_session=False)
        db.query(Task).filter(Task.id.in_(task_ids)).delete(synchronize_session=False)
        
    # 4. Clean up any other direct links
    db.query(Message).filter((Message.sender_id == user_id) | (Message.recipient_id == user_id)).delete(synchronize_session=False)
    db.query(Comment).filter(Comment.author_id == user_id).delete(synchronize_session=False)
    
    db.delete(user)
    db.commit()
    
    return {"message": "User deleted successfully"}
