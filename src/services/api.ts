import axios from 'axios';

const API_BASE_URL = import.meta.env.MODE === 'production' ? '/api' : 'http://localhost:5001/api';

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    login: (username: string, password: string) =>
        api.post('/auth/login', { username, password }),
    logout: () => api.post('/auth/logout'),
    getCurrentUser: () => api.get('/auth/me'),
    forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
    resetPassword: (token: string, newPassword: string) => api.post('/auth/reset-password', { token, newPassword }),
};

// Shipments API
export const shipmentsAPI = {
    getAll: (params?: { search?: string; status?: string }) =>
        api.get('/shipments', { params }),
    getById: (id: string) => api.get(`/shipments/${id}`),
    create: (data: any) => {
        const config = data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
        return api.post('/shipments', data, config);
    },
    update: (id: string, data: any) => api.put(`/shipments/${id}`, data),
    delete: (id: string) => api.delete(`/shipments/${id}`),
};

// Fleet API
export const fleetAPI = {
    getAll: () => api.get('/fleet'),
    getById: (id: string) => api.get(`/fleet/${id}`),
    update: (id: string, data: any) => api.put(`/fleet/${id}`, data),
    getStats: () => api.get('/fleet/stats/summary'),
};

// Analytics API
export const analyticsAPI = {
    getDashboard: () => api.get('/analytics/dashboard'),
    getRevenue: () => api.get('/analytics/revenue'),
    getPerformance: () => api.get('/analytics/performance'),
    getVolume: () => api.get('/analytics/volume'),
};

// Users API
export const usersAPI = {
    getAll: () => api.get('/users'),
    create: (data: any) => api.post('/users', data),
    update: (id: string, data: any) => api.put(`/users/${id}`, data),
    delete: (id: string) => api.delete(`/users/${id}`),
};

// Logs API
export const logsAPI = {
    getAll: () => api.get('/logs'),
};

// Delivery Notes API
export const deliveryNotesAPI = {
    getAll: () => api.get('/delivery-notes'),
    update: (id: string, data: any) => api.put(`/delivery-notes/${id}`, data),
};

// Invoices API
export const invoicesAPI = {
    getAll: () => api.get('/invoices'),
    getById: (id: string) => api.get(`/invoices/${id}`),
};

export default api;
