# RESQ Backend

Emergency Response System - FastAPI Backend with Real-time Features

## Features

- **FastAPI**: High-performance async REST API
- **Socket.IO**: Real-time bidirectional communication
- **PostgreSQL**: Robust relational database
- **SQLAlchemy 2.0**: Modern ORM
- **JWT Authentication**: Secure token-based auth
- **Role-based Access Control**: Citizen, Volunteer, Admin roles

## Prerequisites

- Python 3.9+
- PostgreSQL database

## Setup

### 1. Install PostgreSQL

Download and install PostgreSQL from https://www.postgresql.org/download/

Create a database:
```sql
CREATE DATABASE resq_db;
```

### 2. Install Dependencies

From the `backend` directory:

```bash
# Activate virtual environment
..\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure Environment

Copy `.env.example` to `.env` and update the database connection:

```
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/resq_db
```

### 4. Run the Server

```bash
# From backend directory with venv activated
uvicorn app.main:socket_app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- REST API: http://localhost:8000
- WebSocket: ws://localhost:8000/socket.io
- API Docs: http://localhost:8000/docs
- Alternative Docs: http://localhost:8000/redoc

## Default Admin Credentials

- **Email**: admin@resq.net
- **Password**: admin123

**⚠️ Change these in production!**

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Users
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update profile
- `PUT /api/users/me/location` - Update location
- `PUT /api/users/me/volunteer-status` - Update volunteer status
- `GET /api/users/volunteers/online` - Get online volunteers
- `GET /api/users/` - Get all users (Admin)
- `DELETE /api/users/{id}` - Delete user (Admin)

### SOS Requests
- `POST /api/sos/` - Create SOS (Citizen)
- `GET /api/sos/` - Get SOS requests
- `GET /api/sos/{id}` - Get SOS by ID
- `PUT /api/sos/{id}/status` - Update SOS status (Admin)
- `DELETE /api/sos/{id}` - Delete SOS (Admin)

### Incident Reports
- `POST /api/incidents/` - Create incident (Citizen)
- `GET /api/incidents/` - Get incidents
- `GET /api/incidents/{id}` - Get incident by ID
- `PUT /api/incidents/{id}` - Update incident (Admin)
- `DELETE /api/incidents/{id}` - Delete incident (Admin)

### Tasks
- `POST /api/tasks/` - Assign task (Admin)
- `GET /api/tasks/` - Get tasks
- `GET /api/tasks/nearby` - Get nearby tasks (Volunteer)
- `GET /api/tasks/{id}` - Get task by ID
- `PUT /api/tasks/{id}` - Update task
- `DELETE /api/tasks/{id}` - Delete task (Admin)

### Messages
- `POST /api/messages/` - Send message
- `GET /api/messages/` - Get messages
- `GET /api/messages/broadcasts` - Get broadcasts
- `PUT /api/messages/{id}/read` - Mark as read
- `GET /api/messages/unread/count` - Unread count

### Comments
- `POST /api/comments/` - Add comment
- `GET /api/comments/task/{task_id}` - Get task comments
- `DELETE /api/comments/{id}` - Delete comment

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

## Socket.IO Events

### Client → Server
- `authenticate` - Authenticate user session
- `join_room` - Join a room
- `leave_room` - Leave a room
- `send_message` - Send message

### Server → Client
- `connection_established` - Connection confirmed
- `authenticated` - Authentication confirmed
- `sos_created` - New SOS created
- `incident_created` - New incident created
- `task_assigned` - Task assigned to volunteer
- `task_updated` - Task status updated
- `broadcast_message` - Admin broadcast
- `user_location_updated` - User location changed
- `volunteer_status_changed` - Volunteer status changed
- `new_message` - New chat message

## Development

### Database Migrations

The app automatically creates tables on startup. To reset the database:

```sql
DROP DATABASE resq_db;
CREATE DATABASE resq_db;
```

Then restart the server.

### Testing

Test the API at http://localhost:8000/docs (Swagger UI)

## Project Structure

```
backend/
├── app/
│   ├── routes/          # API endpoints
│   ├── config.py        # Configuration
│   ├── database.py      # Database setup
│   ├── models.py        # SQLAlchemy models
│   ├── schemas.py       # Pydantic schemas
│   ├── auth.py          # Authentication
│   ├── socketio_server.py  # Socket.IO server
│   └── main.py          # FastAPI app
├── requirements.txt     # Dependencies
├── .env                 # Environment variables
└── README.md           # This file
```

## License

MIT
