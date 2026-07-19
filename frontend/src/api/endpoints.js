import api from './client';

export const auth = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  register: (data) => api.post('/auth/register', data),
};

export const products = {
  getAll: (params) => api.get('/products/', { params }),
  getOne: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products/', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  lowStock: () => api.get('/products/alerts/low-stock'),
};

export const sales = {
  create: (data) => api.post('/sales/', data),
  getAll: (params) => api.get('/sales/', { params }),
  getOne: (id) => api.get(`/sales/${id}`),
  getReceipt: (id) => api.get(`/sales/${id}/receipt`),
};

export const dashboard = {
  ownerOverview: () => api.get('/dashboard/owner/overview'),
  weeklySales: () => api.get('/dashboard/owner/weekly-sales'),
  lowStock: () => api.get('/dashboard/owner/low-stock'),
  cashierOverview: () => api.get('/dashboard/cashier/overview'),
};

export const users = {
  create: (data) => api.post('/users/', data),
  getAll: (params) => api.get('/users/', { params }),
  getOne: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  resetPassword: (id, data) => api.post(`/users/${id}/reset-password`, data),
  toggle: (id) => api.post(`/users/${id}/toggle`),
};

export const upload = {
  image: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/single', formData, {
      // Let the browser set the multipart boundary.
      headers: { 'Content-Type': undefined },
      timeout: 30000,
    });
  },
};

const crud = (path) => ({
  getAll: () => api.get(`/${path}/`),
  create: (data) => api.post(`/${path}/`, data),
  update: (id, data) => api.put(`/${path}/${id}`, data),
  delete: (id) => api.delete(`/${path}/${id}`),
});

export const categories = crud('categories');
export const suppliers = crud('suppliers');
export const customers = crud('customers');
export const branches = crud('branches');

export const business = {
  getProfile: () => api.get('/business/profile'),
  updateProfile: (data) => api.put('/business/profile', data),
  getSettings: (section) => api.get(`/business/settings/${section}`),
  updateSettings: (section, values) => api.put('/business/settings', { section, values }),
};

export const subscription = {
  get: () => api.get('/subscription/'),
  checkout: (plan, billingCycle) => api.post('/subscription/checkout', {
    plan: plan.toUpperCase(),
    billing_cycle: billingCycle,
  }),
  portal: () => api.post('/subscription/portal'),
};