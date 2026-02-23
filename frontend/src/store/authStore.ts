import { create } from 'zustand';

export interface User {
    id: number;
    email?: string;
    phone?: string;
    volunteer_id?: string;
    full_name: string;
    role: 'citizen' | 'volunteer' | 'admin';
    latitude?: number;
    longitude?: number;
    address?: string;
    volunteer_status?: 'online' | 'offline' | 'busy';
    is_active: boolean;
    created_at: string;
}

interface AuthState {
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    isInitialized: boolean;

    setAuth: (user: User, accessToken: string, refreshToken: string) => void;
    updateUser: (user: User) => void;
    logout: () => void;
    initFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isInitialized: false,

    setAuth: (user, accessToken, refreshToken) => {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);

        set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isInitialized: true,
        });
    },

    updateUser: (user) => {
        localStorage.setItem('user', JSON.stringify(user));
        set({ user });
    },

    logout: () => {
        localStorage.removeItem('user');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');

        set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isInitialized: true,
        });
    },

    initFromStorage: () => {
        if (typeof window === 'undefined') return;

        const user = localStorage.getItem('user');
        const accessToken = localStorage.getItem('access_token');
        const refreshToken = localStorage.getItem('refresh_token');

        if (user && accessToken && refreshToken) {
            try {
                set({
                    user: JSON.parse(user),
                    accessToken,
                    refreshToken,
                    isAuthenticated: true,
                    isInitialized: true,
                });
            } catch (e) {
                console.error("Failed to parse user from storage", e);
                set({ isInitialized: true });
            }
        } else {
            set({ isInitialized: true });
        }
    },
}));
