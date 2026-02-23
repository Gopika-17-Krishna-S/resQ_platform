from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base


class UserRole(str, enum.Enum):
    """User role enumeration"""
    CITIZEN = "citizen"
    VOLUNTEER = "volunteer"
    ADMIN = "admin"


class TaskStatus(str, enum.Enum):
    """Task status enumeration"""
    PENDING = "pending"
    ASSIGNED = "assigned"
    ACCEPTED = "accepted"
    RESPONDING = "responding"
    ON_SITE = "on_site"
    COMPLETED = "completed"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class VolunteerStatus(str, enum.Enum):
    """Volunteer availability status"""
    ONLINE = "online"
    OFFLINE = "offline"
    BUSY = "busy"


class IncidentType(str, enum.Enum):
    """Type of incident"""
    SOS = "sos"
    FIRE = "fire"
    MEDICAL = "medical"
    ACCIDENT = "accident"
    NATURAL_DISASTER = "natural_disaster"
    CRIME = "crime"
    OTHER = "other"


class User(Base):
    """User model for all roles"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=True)
    phone = Column(String(20), unique=True, index=True, nullable=True)
    volunteer_id = Column(String(50), unique=True, index=True, nullable=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False, default=UserRole.CITIZEN)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Location data
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    address = Column(String(500), nullable=True)
    
    # Volunteer-specific fields
    volunteer_status = Column(SQLEnum(VolunteerStatus), nullable=True, default=VolunteerStatus.OFFLINE)
    
    # Relationships
    sos_requests = relationship("SOSRequest", back_populates="citizen", foreign_keys="SOSRequest.citizen_id")
    incident_reports = relationship("IncidentReport", back_populates="citizen", foreign_keys="IncidentReport.citizen_id")
    assigned_tasks = relationship("Task", back_populates="volunteer", foreign_keys="Task.volunteer_id")
    sent_messages = relationship("Message", back_populates="sender", foreign_keys="Message.sender_id")
    comments = relationship("Comment", back_populates="author")


class SOSRequest(Base):
    """SOS emergency request model"""
    __tablename__ = "sos_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    citizen_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String(500), nullable=True)
    status = Column(SQLEnum(TaskStatus), default=TaskStatus.PENDING)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    citizen = relationship("User", back_populates="sos_requests", foreign_keys=[citizen_id])
    tasks = relationship("Task", back_populates="sos_request")


class IncidentReport(Base):
    """Incident report model"""
    __tablename__ = "incident_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    citizen_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    incident_type = Column(SQLEnum(IncidentType), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String(500), nullable=True)
    image_url = Column(String(500), nullable=True)
    status = Column(SQLEnum(TaskStatus), default=TaskStatus.PENDING)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    citizen = relationship("User", back_populates="incident_reports", foreign_keys=[citizen_id])
    tasks = relationship("Task", back_populates="incident_report")


class Task(Base):
    """Task assignment model"""
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    volunteer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    sos_request_id = Column(Integer, ForeignKey("sos_requests.id"), nullable=True)
    incident_report_id = Column(Integer, ForeignKey("incident_reports.id"), nullable=True)
    status = Column(SQLEnum(TaskStatus), default=TaskStatus.ASSIGNED)
    assigned_at = Column(DateTime, default=datetime.utcnow)
    accepted_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    
    # Relationships
    volunteer = relationship("User", back_populates="assigned_tasks", foreign_keys=[volunteer_id])
    sos_request = relationship("SOSRequest", back_populates="tasks")
    incident_report = relationship("IncidentReport", back_populates="tasks")
    comments = relationship("Comment", back_populates="task")


class Message(Base):
    """Chat message model"""
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    recipient_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Null for broadcasts
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
    content = Column(Text, nullable=False)
    is_broadcast = Column(Boolean, default=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    sender = relationship("User", back_populates="sent_messages", foreign_keys=[sender_id])


class Comment(Base):
    """Comment/Note on tasks"""
    __tablename__ = "comments"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    task = relationship("Task", back_populates="comments")
    author = relationship("User", back_populates="comments")


class Broadcast(Base):
    """Broadcast message model"""
    __tablename__ = "broadcasts"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
