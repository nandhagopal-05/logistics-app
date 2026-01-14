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
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
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
        // Ignore 401s from login endpoint (invalid credentials)
        // Only redirect for other 401s (expired/invalid token)
        if (error.response?.status === 401 && !error.config.url?.includes('/auth/login')) {
            // Token expired or invalid
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    login: (username: string, password: string, token?: string) =>
        api.post('/auth/login', { username, password, token }),
    logout: () => api.post('/auth/logout'),
    getCurrentUser: () => api.get('/auth/me'),
    forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
    resetPassword: (token: string, newPassword: string) => api.post('/auth/reset-password', { token, newPassword }),
    changePassword: (data: any) => api.post('/auth/change-password', data),
    generate2FA: () => api.post('/auth/2fa/generate'),
    verify2FA: (token: string) => api.post('/auth/2fa/verify', { token }),
    disable2FA: () => api.post('/auth/2fa/disable'),
    getSessions: () => api.get('/auth/sessions'),
    revokeSession: (id: string) => api.delete(`/auth/sessions/${id}`),
};

// Shipments API
export const shipmentsAPI = {
    getAll: (params?: { search?: string; status?: string }) =>
        api.get('/shipments', { params }),
    getById: (id: string) => api.get(`/shipments/${id}`),
    create: (data: FormData) => api.post('/shipments', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    update: (id: string, data: any) => api.put(`/shipments/${id}`, data),
    delete: (id: string) => api.delete(`/shipments/${id}`),
    import: (data: FormData) => api.post('/shipments/import', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
};

// Fleet API
export const fleetAPI = {
    getAll: () => api.get('/fleet'),
    getById: (id: string) => api.get(`/fleet/${id}`),
    create: (data: any) => api.post('/fleet', data),
    update: (id: string, data: any) => api.put(`/fleet/${id}`, data),
    delete: (id: string) => api.delete(`/fleet/${id}`),
    import: (formData: FormData) => api.post('/fleet/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
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
    uploadPhoto: (id: string, data: FormData) => api.post(`/users/${id}/photo`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    delete: (id: string) => api.delete(`/users/${id}`),
};

// Logs API
export const logsAPI = {
    getAll: (params?: { search?: string; date?: string }) =>
        api.get('/logs', { params }),
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

// Consignees API
export const consigneesAPI = {
    getAll: () => api.get('/consignees'),
    create: (data: any) => api.post('/consignees', data),
    update: (id: string, data: any) => api.put(`/consignees/${id}`, data),
    delete: (id: string) => api.delete(`/consignees/${id}`),
    import: (formData: FormData) => api.post('/consignees/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// Customers API
export const customersAPI = {
    getAll: () => api.get('/customers'),
    create: (data: any) => api.post('/customers', data),
    update: (id: string, data: any) => api.put(`/customers/${id}`, data),
    delete: (id: string) => api.delete(`/customers/${id}`),
    import: (formData: FormData) => api.post('/customers/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// Exporters API
export const exportersAPI = {
    getAll: () => api.get('/exporters'),
    create: (data: any) => api.post('/exporters', data),
    update: (id: string, data: any) => api.put(`/exporters/${id}`, data),
    delete: (id: string) => api.delete(`/exporters/${id}`),
    import: (formData: FormData) => api.post('/exporters/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// Clearance API
export const clearanceAPI = {
    getAll: (params?: { search?: string; type?: string; transport_mode?: string; date?: string }) =>
        api.get('/clearance', { params }),
    create: (data: any) => api.post('/clearance', data),
    update: (id: number | string, data: any) => api.put(`/clearance/${id}`, data),
};

export default api;
