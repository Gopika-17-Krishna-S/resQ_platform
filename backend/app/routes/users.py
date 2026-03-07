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
    
    if user_update.volunteer_status is not None and current_user.role == UserRole.VOLUNTEER:
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
    
    if current_user.role != UserRole.VOLUNTEER:
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
    if user.role == UserRole.ADMIN and user.id != current_user.id:
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
    if user_update.volunteer_status is not None and user.role == UserRole.VOLUNTEER:
        user.volunteer_status = user_update.volunteer_status
    
    db.commit()
    db.refresh(user)
    
    return UserResponse.model_validate(user)


@router.delete("/{user_id}")
def delete_user(
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
    
    if user.role == UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete admin users"
        )
    
    db.delete(user)
    db.commit()
    
    return {"message": "User deleted successfully"}
