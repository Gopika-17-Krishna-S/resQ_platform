from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Comment, User, Task, UserRole
from app.schemas import CommentCreate, CommentResponse
from app.auth import get_current_user

router = APIRouter(prefix="/comments", tags=["Comments"])


@router.post("/", response_model=CommentResponse)
def create_comment(
    comment_data: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a comment to a task"""
    
    # Verify task exists
    task = db.query(Task).filter(Task.id == comment_data.task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Verify user is authorized to comment on this task
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
            detail="Not authorized to comment on this task"
        )
    
    comment = Comment(
        task_id=comment_data.task_id,
        author_id=current_user.id,
        content=comment_data.content
    )
    
    db.add(comment)
    db.commit()
    db.refresh(comment)
    
    return CommentResponse.model_validate(comment)


@router.get("/task/{task_id}", response_model=List[CommentResponse])
def get_task_comments(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all comments for a task"""
    
    # Verify task exists
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Verify user is authorized to view comments
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
            detail="Not authorized to view comments for this task"
        )
    
    comments = db.query(Comment).filter(
        Comment.task_id == task_id
    ).order_by(Comment.created_at.asc()).all()
    
    return [CommentResponse.model_validate(comment) for comment in comments]


@router.delete("/{comment_id}")
def delete_comment(
    comment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a comment"""
    
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )
    
    # Only comment author or admin can delete
    if comment.author_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this comment"
        )
    
    db.delete(comment)
    db.commit()
    
    return {"message": "Comment deleted successfully"}
