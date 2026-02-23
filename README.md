# resQ - Rapid Emergency Response System

**resQ** is a high-performance, real-time emergency response platform designed to bridge the gap between citizens in distress, volunteers, and dispatchers. Built with a focus on speed, reliability, and visual clarity, **resQ** ensures that every second counts when lives are at stake.

## 🚀 Key Features

### 📡 Real-Time Core
- **Zero-Latency SOS**: Powered by Socket.IO, SOS alerts are transmitted to dispatchers the second they are triggered.
- **Live Incident Mapping**: Incident reports appear instantly on the admin and volunteer maps.
- **Instant Messaging**: Real-time 1-on-1 chat between citizens and assigned volunteers.
- **System-Wide Broadcasts**: Admins can push critical emergency alerts to all connected users instantly.

### 👥 User Roles & Dashboards
- **Citizen Portal**:
  - One-tap **EMERGENCY SOS** trigger with automatic location pings.
  - Detailed **Incident Reporting** for non-emergency situations.
  - **Dynamic Session Persistence**: Refresh protection ensures you stay logged in.
  - **Profile Management**: Update contact details and address directly from the dashboard.
- **Volunteer Portal**:
  - **Nearby Mission Radar**: Real-time list of unassigned incidents within responding range.
  - **Status Control**: Toggle between Online/Offline to control task availability.
  - **Mission Management**: Accept assignments, navigate to locations, and update status (Responding -> Completed).
- **Admin Command Center**:
  - **Dispatcher Stats**: Real-time overview of active SOS requests, incidents, and volunteers.
  - **Smart Assignment**: Manual or automatic assignment of tasks to nearest available responders.
  - **User Management**: Complete control over all user accounts (Admins, Volunteers, Citizens).

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS, Zustand |
| **Backend** | FastAPI (Python), SQLAlchemy 2.0, PostgreSQL |
| **Real-Time** | Socket.IO (Python-SocketIO & Socket.io-Client) |
| **Auth** | JWT (JSON Web Tokens) with Refresh Token cycle |
| **Maps** | Mapbox GL JS |

## ⚙️ Installation & Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Python**: v3.9 or higher
- **PostgreSQL**: v13 or higher (Running locally)

### One-Click Startup (Windows)
We provide a comprehensive PowerShell script that checks for prerequisites and starts both servers automatically:
1. Open PowerShell as Administrator.
2. Run the startup script:
   ```powershell
   .\START-RESQ.ps1
   ```
*Note: This script will install Node modules automatically if they are missing.*

### Manual Setup

#### 1. Database Configuration
Create a PostgreSQL database named `resq_db`:
```sql
CREATE DATABASE resq_db;
```

#### 2. Backend Initialization
```bash
# Navigate to backend
cd backend

# Configure environment variables
# Edit .env with your credentials:
# DATABASE_URL=postgresql://user:pass@localhost:5432/resq_db

# Run with Uvicorn
uvicorn app.main:socket_app --reload --port 8000
```

#### 3. Frontend Initialization
```bash
# Navigate to frontend
cd frontend

# Install & Run
npm install
npm run dev
```

## 🔐 Default Credentials

| Role | Identifier | Password |
|---|---|---|
| **Admin** | `admin@resq.net` | `admin123` |
| **Volunteer** | Register on Landing Page | User-defined |
| **Citizen** | Register on Landing Page | User-defined |

## 📁 Project Structure
```text
resq-c-main/
├── backend/            # FastAPI + Socket.IO Server
│   ├── app/            # Source code
│   ├── .env            # Backend configuration
│   └── .venv/          # Python virtual environment
├── frontend/           # Next.js Application
│   ├── src/app/        # App Router Pages
│   ├── src/store/      # Zustand Auth & State
│   └── .env.local      # Frontend API/Mapbox keys
├── START-RESQ.ps1      # Windows Auto-startup script
└── requirements.txt    # Frozen Python dependencies
```

## 🧪 Development Workflow
- **Linting**: The project uses strict TypeScript typing to ensure code quality.
- **State**: `authStore` handles session persistence and `isInitialized` checks to prevent refresh-redirection bugs.
- **Sockets**: Centralized `socketService` handles singleton connections and room management.

---
*Built with ❤️ for Rapid Emergency Response.*
