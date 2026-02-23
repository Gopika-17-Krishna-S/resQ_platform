import socketio
from typing import Dict, Set

# Create Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=True
)

# Store connected users: {user_id: set of sid}
connected_users: Dict[int, Set[str]] = {}

# Store user sessions: {sid: user_id}
user_sessions: Dict[str, int] = {}


@sio.event
async def connect(sid, environ):
    """Handle client connection"""
    print(f"Client connected: {sid}")
    await sio.emit('connection_established', {'sid': sid}, room=sid)


@sio.event
async def disconnect(sid):
    """Handle client disconnection"""
    print(f"Client disconnected: {sid}")
    
    # Remove from sessions
    if sid in user_sessions:
        user_id = user_sessions[sid]
        del user_sessions[sid]
        
        # Remove from connected users
        if user_id in connected_users:
            connected_users[user_id].discard(sid)
            if not connected_users[user_id]:
                del connected_users[user_id]


@sio.event
async def authenticate(sid, data):
    """Authenticate user session"""
    user_id = data.get('user_id')
    if user_id:
        user_sessions[sid] = user_id
        
        if user_id not in connected_users:
            connected_users[user_id] = set()
        connected_users[user_id].add(sid)
        
        await sio.emit('authenticated', {'user_id': user_id}, room=sid)
        print(f"User {user_id} authenticated with session {sid}")


@sio.event
async def join_room(sid, data):
    """Join a specific room (e.g., task room, admin room)"""
    room = data.get('room')
    if room:
        sio.enter_room(sid, room)
        await sio.emit('joined_room', {'room': room}, room=sid)
        print(f"Session {sid} joined room: {room}")


@sio.event
async def leave_room(sid, data):
    """Leave a specific room"""
    room = data.get('room')
    if room:
        sio.leave_room(sid, room)
        await sio.emit('left_room', {'room': room}, room=sid)


@sio.event
async def send_message(sid, data):
    """Send a message to a specific user or room"""
    recipient_id = data.get('recipient_id')
    room = data.get('room')
    message = data.get('message')
    
    if recipient_id and recipient_id in connected_users:
        # Send to specific user
        for user_sid in connected_users[recipient_id]:
            await sio.emit('new_message', message, room=user_sid)
    elif room:
        # Send to room
        await sio.emit('new_message', message, room=room)


async def emit_sos_created(sos_data: dict):
    """Emit SOS created event to all connected users"""
    await sio.emit('sos_created', sos_data)
    print(f"Emitted SOS created: {sos_data}")


async def emit_incident_created(incident_data: dict):
    """Emit incident created event to all connected users"""
    await sio.emit('incident_created', incident_data)
    print(f"Emitted incident created: {incident_data}")


async def emit_task_assigned(task_data: dict, volunteer_id: int):
    """Emit task assigned event to volunteer and admins"""
    # Notify volunteer
    if volunteer_id in connected_users:
        for sid in connected_users[volunteer_id]:
            await sio.emit('task_assigned', task_data, room=sid)
    
    # Notify admins
    await sio.emit('task_assigned', task_data, room='admin')
    print(f"Emitted task assigned to volunteer {volunteer_id} and admins")


async def emit_task_updated(task_data: dict, user_ids: list):
    """Emit task update to relevant users and admins"""
    for user_id in user_ids:
        if user_id and user_id in connected_users:
            for sid in connected_users[user_id]:
                await sio.emit('task_updated', task_data, room=sid)
    
    # Notify admins
    await sio.emit('task_updated', task_data, room='admin')
    print(f"Emitted task updated to users: {user_ids} and admins")


async def emit_broadcast(broadcast_data: dict):
    """Emit broadcast to all connected users"""
    await sio.emit('broadcast_message', broadcast_data)
    print(f"Emitted broadcast: {broadcast_data}")


async def emit_user_location_update(user_data: dict):
    """Emit user location update to admin room"""
    await sio.emit('user_location_updated', user_data, room='admin')
    print(f"Emitted location update for user: {user_data}")


async def emit_volunteer_status_change(volunteer_data: dict):
    """Emit volunteer status change"""
    await sio.emit('volunteer_status_changed', volunteer_data)
    print(f"Emitted volunteer status change: {volunteer_data}")
