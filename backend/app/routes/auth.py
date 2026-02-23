from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, UserRole
from app.schemas import UserCreate, UserLogin, Token, UserResponse
from app.auth import authenticate_user, create_access_token, create_refresh_token, get_password_hash

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=Token)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    
    # Check if user already exists
    if user_data.email:
        existing = db.query(User).filter(User.email == user_data.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    
    if user_data.phone:
        existing = db.query(User).filter(User.phone == user_data.phone).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phone already registered"
            )
    
    if user_data.volunteer_id:
        existing = db.query(User).filter(User.volunteer_id == user_data.volunteer_id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Volunteer ID already registered"
            )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        email=user_data.email,
        phone=user_data.phone,
        volunteer_id=user_data.volunteer_id,
        full_name=user_data.full_name,
        role=user_data.role,
        hashed_password=hashed_password
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create tokens
    access_token = create_access_token(data={"sub": str(db_user.id), "role": db_user.role.value})
    refresh_token = create_refresh_token(data={"sub": str(db_user.id), "role": db_user.role.value})
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(db_user)
    )


@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Login user"""
    
    user = authenticate_user(db, credentials.identifier, credentials.password, credentials.role)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect credentials"
        )
    
    # Create tokens
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
    refresh_token = create_refresh_token(data={"sub": str(user.id), "role": user.role.value})
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user)
    )
