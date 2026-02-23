import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Create axios instance
export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Clear tokens and redirect to login
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    login: (identifier: string, password: string, role?: string) =>
        api.post('/auth/login', { identifier, password, role }),

    register: (data: any) =>
        api.post('/auth/register', data),
};

// User API
export const userAPI = {
    getMe: () => api.get('/users/me'),
    updateMe: (data: any) => api.put('/users/me', data),
    updateLocation: (latitude: number, longitude: number, address?: string) =>
        api.put('/users/me/location', { latitude, longitude, address }),
    updateVolunteerStatus: (status: string) =>
        api.put('/users/me/volunteer-status', { status }),
    getAll: (role?: string) => api.get(`/users/${role ? `?role=${role}` : ''}`),
    getOnlineVolunteers: () => api.get('/users/volunteers/online'),
    updateUser: (id: number, data: any) => api.put(`/users/${id}`, data),
    deleteUser: (id: number) => api.delete(`/users/${id}`),
};

// SOS API
export const sosAPI = {
    create: (data: any) => api.post('/sos/', data),
    getAll: (status?: string) => api.get(`/sos/${status ? `?status_filter=${status}` : ''}`),
    getById: (id: number) => api.get(`/sos/${id}`),
    update: (id: number, data: any) => api.put(`/sos/${id}`, data),
    updateStatus: (id: number, status: string) => api.put(`/sos/${id}/status`, { status }),
    delete: (id: number) => api.delete(`/sos/${id}`),
};

// Incident API
export const incidentAPI = {
    create: (data: any) => api.post('/incidents/', data),
    getAll: (status?: string, type?: string) =>
        api.get(`/incidents/?${status ? `status_filter=${status}` : ''}${type ? `&incident_type=${type}` : ''}`),
    getById: (id: number) => api.get(`/incidents/${id}`),
    update: (id: number, data: any) => api.put(`/incidents/${id}`, data),
    delete: (id: number) => api.delete(`/incidents/${id}`),
};

// Task API
export const taskAPI = {
    create: (data: any) => api.post('/tasks/', data),
    getAll: (status?: string) => api.get(`/tasks/${status ? `?status_filter=${status}` : ''}`),
    getNearby: () => api.get('/tasks/nearby'),
    getById: (id: number) => api.get(`/tasks/${id}`),
    update: (id: number, data: any) => api.put(`/tasks/${id}`, data),
    delete: (id: number) => api.delete(`/tasks/${id}`),
};

// Message API
export const messageAPI = {
    send: (data: any) => api.post('/messages/', data),
    getAll: (taskId?: number, contactId?: number) => {
        let qs = '';
        if (taskId) qs = `?task_id=${taskId}`;
        else if (contactId) qs = `?contact_id=${contactId}`;
        return api.get(`/messages/${qs}`);
    },
    getBroadcasts: () => api.get('/messages/broadcasts'),
    markRead: (id: number) => api.put(`/messages/${id}/read`),
    getUnreadCount: () => api.get('/messages/unread/count'),
};

// Comment API
export const commentAPI = {
    create: (data: any) => api.post('/comments/', data),
    getTaskComments: (taskId: number) => api.get(`/comments/task/${taskId}`),
    delete: (id: number) => api.delete(`/comments/${id}`),
};

// Dashboard API
export const dashboardAPI = {
    getStats: () => api.get('/dashboard/stats'),
};
