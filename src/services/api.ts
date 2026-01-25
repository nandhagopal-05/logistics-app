import axios from 'axios';

export const API_BASE_URL = import.meta.env.MODE === 'production' ? '/api' : `http://${window.location.hostname}:5001/api`;
export const FILE_BASE_URL = API_BASE_URL.replace('/api', '');

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
    uploadDocument: (id: string, data: FormData) => api.post(`/shipments/${id}/documents`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    deleteDocument: (shipmentId: string, docId: string) => api.delete(`/shipments/${shipmentId}/documents/${docId}`),
    viewDocument: (shipmentId: string, docId: string) => api.get(`/shipments/${shipmentId}/documents/${docId}/view`, { responseType: 'blob' }),
    downloadDocument: (shipmentId: string, docId: string) => api.get(`/shipments/${shipmentId}/documents/${docId}/download`, { responseType: 'blob' }),
    import: (data: FormData) => api.post('/shipments/import', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    addContainer: (id: string, data: any) => api.post(`/shipments/${id}/containers`, data),
    updateContainer: (id: string, containerId: string, data: any) => api.put(`/shipments/${id}/containers/${containerId}`, data),
    deleteContainer: (id: string, containerId: string) => api.delete(`/shipments/${id}/containers/${containerId}`),
    addBL: (id: string, data: any) => api.post(`/shipments/${id}/bls`, data),
    updateBL: (id: string, blId: string, data: any) => api.put(`/shipments/${id}/bls/${blId}`, data),
    deleteBL: (id: string, blId: string) => api.delete(`/shipments/${id}/bls/${blId}`),
};

// Fleet API
export const fleetAPI = {
    getAll: () => api.get('/fleet'),
    getById: (id: string) => api.get(`/fleet/${id}`),
    create: (data: any) => api.post('/fleet', data),
    update: (id: string, data: any) => api.put(`/fleet/${id}`, data),
    delete: (id: string) => api.delete(`/fleet/${id}`),
    deleteAll: () => api.delete('/fleet/delete-all'),
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
    removePhoto: (id: string) => api.delete(`/users/${id}/photo`),
    delete: (id: string) => api.delete(`/users/${id}`),
};

// Logs API
export const logsAPI = {
    getAll: (params?: { search?: string; date?: string }) =>
        api.get('/logs', { params }),
};

// Delivery Notes API
export const deliveryNotesAPI = {
    getAll: (params?: { search?: string; status?: string }) =>
        api.get('/delivery-notes', { params }),
    getById: (id: string) => api.get(`/delivery-notes/${id}`),
    create: (data: any) => api.post('/delivery-notes', data),
    update: (id: string, data: any) => api.put(`/delivery-notes/${id}`, data),
    updateStatus: (id: string, status: string) => api.put(`/delivery-notes/${id}/status`, { status }),
    delete: (id: string) => api.delete(`/delivery-notes/${id}`),
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
    deleteAll: () => api.delete('/consignees/delete-all'),
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
    deleteAll: () => api.delete('/customers/delete-all'),
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
    deleteAll: () => api.delete('/exporters/delete-all'),
    import: (formData: FormData) => api.post('/exporters/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// Delivery Agents API
export const deliveryAgentsAPI = {
    getAll: () => api.get('/delivery-agents'),
    create: (data: any) => api.post('/delivery-agents', data),
    update: (id: string, data: any) => api.put(`/delivery-agents/${id}`, data),
    delete: (id: string) => api.delete(`/delivery-agents/${id}`),
    deleteAll: () => api.delete('/delivery-agents/delete-all'),
    import: (formData: FormData) => api.post('/delivery-agents/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// Vendors API
export const vendorsAPI = {
    getAll: () => api.get('/vendors'),
    create: (data: any) => api.post('/vendors', data),
    update: (id: string, data: any) => api.put(`/vendors/${id}`, data),
    delete: (id: string) => api.delete(`/vendors/${id}`),
    deleteAll: () => api.delete('/vendors/delete-all'),
    import: (formData: FormData) => api.post('/vendors/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// Clearance API
export const clearanceAPI = {
    getAll: (params?: { search?: string; type?: string; transport_mode?: string; date?: string }) =>
        api.get('/clearance', { params }),
    create: (data: any) => api.post('/clearance', data),
    update: (id: number | string, data: any) => api.put(`/clearance/${id}`, data),
    delete: (id: number | string) => api.delete(`/clearance/${id}`),
};

// Payments API
export const paymentsAPI = {
    getAll: (jobId: string) => api.get(`/payments/job/${jobId}`),
    getListing: (params?: { search?: string; page?: number; limit?: number; status?: string }) => api.get('/payments', { params }),
    create: (data: any) => api.post('/payments', data),
    updateStatus: (id: number | string, status: string) => api.put(`/payments/${id}/status`, { status }),
    delete: (id: number | string) => api.delete(`/payments/${id}`),
    sendBatch: (paymentIds: string[]) => api.post('/payments/send-batch', { paymentIds }),
};

// Payment Items Settings API
export const paymentItemsAPI = {
    getAll: () => api.get('/payment-items'),
    create: (data: any) => api.post('/payment-items', data),
    update: (id: number | string, data: any) => api.put(`/payment-items/${id}`, data),
    delete: (id: number | string) => api.delete(`/payment-items/${id}`),
    deleteAll: () => api.delete('/payment-items/delete-all'),
    import: (formData: FormData) => api.post('/payment-items/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// Containers API
export const containersAPI = {
    getAll: (params?: { search?: string; page?: number; limit?: number }) => api.get('/containers', { params }),
};

export default api;
