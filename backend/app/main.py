from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio
from app.config import settings
from app.database import engine, Base
from app.routes import auth, users, sos, incidents, tasks, messages, comments, dashboard
from app.socketio_server import sio
from app.models import User, UserRole
from app.auth import get_password_hash
from sqlalchemy.orm import Session

# Create database tables
Base.metadata.create_all(bind=engine)

# Create FastAPI app
app = FastAPI(
    title="resQ API",
    description="Emergency Response System API",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(sos.router, prefix="/api")
app.include_router(incidents.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(messages.router, prefix="/api")
app.include_router(comments.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")


@app.on_event("startup")
async def startup_event():
    """Initialize app on startup"""
    print("Starting resQ API...")
    
    # Create default admin user if not exists
    from app.database import SessionLocal
    db = SessionLocal()
    
    try:
        admin = db.query(User).filter(User.email == settings.ADMIN_EMAIL).first()
        if not admin:
            admin_user = User(
                email=settings.ADMIN_EMAIL,
                full_name="System Admin",
                role=UserRole.ADMIN,
                hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            print(f"Default admin user created: {settings.ADMIN_EMAIL}")
        else:
            print(f"Admin user already exists: {settings.ADMIN_EMAIL}")
    finally:
        db.close()
    
    print("resQ API started successfully!")


@app.get("/")
def root():
    """Root endpoint"""
    return {
        "message": "resQ Emergency Response System API",
        "version": "1.0.0",
        "status": "active"
    }


@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


# Create Socket.IO ASGI app
socket_app = socketio.ASGIApp(
    sio,
    other_asgi_app=app,
    socketio_path='/socket.io'
)
