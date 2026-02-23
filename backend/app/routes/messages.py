from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List
from app.database import get_db
from app.models import Message, User, Task, UserRole
from app.schemas import MessageCreate, MessageResponse
from app.auth import get_current_user, get_current_admin

router = APIRouter(prefix="/messages", tags=["Messages"])


@router.post("/", response_model=MessageResponse)
def send_message(
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a message"""
    
    # Verify recipient exists if not a broadcast
    if message_data.recipient_id and not message_data.is_broadcast:
        recipient = db.query(User).filter(User.id == message_data.recipient_id).first()
        if not recipient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Recipient not found"
            )
    
    # Verify task exists if specified
    if message_data.task_id:
        task = db.query(Task).filter(Task.id == message_data.task_id).first()
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        # Verify user is part of the task
        is_authorized = False
        if current_user.role == UserRole.ADMIN:
            is_authorized = True
        elif task.volunteer_id == current_user.id:
            is_authorized = True
        elif task.sos_request and task.sos_request.citizen_id == current_user.id:
            is_authorized = True
        elif task.incident_report and task.incident_report.citizen_id == current_user.id:
            is_authorized = True
        
        if not is_authorized:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to send messages for this task"
            )
    
    # Only admins can send broadcasts
    if message_data.is_broadcast and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can send broadcasts"
        )
    
    message = Message(
        sender_id=current_user.id,
        recipient_id=message_data.recipient_id,
        task_id=message_data.task_id,
        content=message_data.content,
        is_broadcast=message_data.is_broadcast
    )
    
    db.add(message)
    db.commit()
    db.refresh(message)
    
    return MessageResponse.model_validate(message)


@router.get("/", response_model=List[MessageResponse])
def get_messages(
    task_id: int = None,
    contact_id: int = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get messages for current user"""
    
    query = db.query(Message)
    
    if task_id:
        # Get messages for a specific task
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        # Determine if user is authorized to see task messages
        is_authorized = False
        if current_user.role == UserRole.ADMIN:
            is_authorized = True
        elif task.volunteer_id == current_user.id:
            is_authorized = True
        elif task.sos_request and task.sos_request.citizen_id == current_user.id:
            is_authorized = True
        elif task.incident_report and task.incident_report.citizen_id == current_user.id:
            is_authorized = True
            
        if not is_authorized:
             # Additional check: maybe they are just chatting about this task? 
             # For now, strict task authorization
             raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view messages for this task"
            )

        query = query.filter(Message.task_id == task_id)
        
    elif contact_id:
        # Get conversation between current_user and contact_id (1-on-1 chat)
        query = query.filter(
            or_(
                and_(Message.sender_id == current_user.id, Message.recipient_id == contact_id),
                and_(Message.sender_id == contact_id, Message.recipient_id == current_user.id)
            )
        )
    else:
        # Get all messages for current user (sent or received)
        query = query.filter(
            or_(
                Message.sender_id == current_user.id,
                Message.recipient_id == current_user.id,
                Message.is_broadcast == True
            )
        )
    
    messages = query.order_by(Message.created_at.asc()).all()
    return [MessageResponse.model_validate(msg) for msg in messages]


@router.get("/broadcasts", response_model=List[MessageResponse])
def get_broadcasts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all broadcast messages"""
    
    broadcasts = db.query(Message).filter(
        Message.is_broadcast == True
    ).order_by(Message.created_at.desc()).all()
    
    return [MessageResponse.model_validate(msg) for msg in broadcasts]


@router.put("/{message_id}/read")
def mark_message_read(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark message as read"""
    
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    if message.recipient_id != current_user.id and not message.is_broadcast:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to mark this message as read"
        )
    
    message.is_read = True
    db.commit()
    
    return {"message": "Message marked as read"}


@router.get("/unread/count")
def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get count of unread messages"""
    
    count = db.query(Message).filter(
        Message.recipient_id == current_user.id,
        Message.is_read == False
    ).count()
    
    return {"unread_count": count}
