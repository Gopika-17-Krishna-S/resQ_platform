import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8000';

class SocketService {
    private socket: Socket | null = null;
    private listeners: Map<string, Set<Function>> = new Map();

    connect(userId?: number) {
        if (this.socket?.connected) {
            return this.socket;
        }

        this.socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        this.socket.on('connect', () => {
            console.log('Socket connected:', this.socket?.id);

            // Authenticate if userId provided
            if (userId) {
                this.socket?.emit('authenticate', { user_id: userId });
            }
        });

        this.socket.on('disconnect', () => {
            console.log('Socket disconnected');
        });

        this.socket.on('connection_established', (data) => {
            console.log('Connection established:', data);
        });

        return this.socket;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.listeners.clear();
        }
    }

    on(event: string, callback: Function) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);

        this.socket?.on(event, (data) => {
            callback(data);
        });
    }

    off(event: string, callback?: Function) {
        if (callback) {
            this.listeners.get(event)?.delete(callback);
            this.socket?.off(event, callback as any);
        } else {
            this.listeners.delete(event);
            this.socket?.off(event);
        }
    }

    emit(event: string, data: any) {
        this.socket?.emit(event, data);
    }

    joinRoom(room: string) {
        this.socket?.emit('join_room', { room });
    }

    leaveRoom(room: string) {
        this.socket?.emit('leave_room', { room });
    }

    isConnected() {
        return this.socket?.connected || false;
    }
}

export const socketService = new SocketService();
