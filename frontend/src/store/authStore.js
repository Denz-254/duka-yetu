import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../api/client';

const getApiError = (error, fallback) => {
  const responseData = error.response?.data;
  const detail = responseData?.detail;
  const message = Array.isArray(detail)
    ? detail.map((item) => item.msg || item.message).filter(Boolean).join(', ')
    : detail || responseData?.message;

  if (message) return message;
  if (error.code === 'ECONNABORTED') return 'The server took too long to respond. Please try again.';
  if (!error.response) return 'Unable to reach the server. Check your connection and try again.';
  if (error.response.status >= 500) return 'The server encountered an error. Please try again shortly.';
  return fallback;
};

const isNetworkError = (error) => !error.response && (
  error.code === 'ERR_NETWORK' ||
  error.code === 'ECONNABORTED' ||
  error.message === 'Network Error'
);

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      business: null,
      token: null,
      isAuthenticated: false,
      loading: false,
      error: null,

      login: async (username, password) => {
        set({ loading: true, error: null });
        try {
          let response;
          let lastError;
          for (let attempt = 1; attempt <= 2; attempt += 1) {
            try {
              response = await api.post('/auth/login', { username, password });
              break;
            } catch (error) {
              lastError = error;
              if (!isNetworkError(error) || attempt === 2) throw error;
              console.warn('Login network request failed; retrying once', {
                attempt,
                code: error.code,
                baseURL: error.config?.baseURL,
                url: error.config?.url,
              });
              await wait(1500);
            }
          }
          if (!response) throw lastError;
          const { user, business, token, message } = response.data;
          set({
            user,
            business: business || null,
            token: token.access_token,
            isAuthenticated: true,
            loading: false,
          });
          localStorage.setItem('token', token.access_token);
          return { success: true, user, business, message };
        } catch (error) {
          const message = getApiError(error, 'Login failed');
          console.error('Login request failed', {
            code: error.code,
            status: error.response?.status,
            detail: error.response?.data?.detail,
            responseData: error.response?.data,
            baseURL: error.config?.baseURL,
            url: error.config?.url,
          });
          set({
            error: message,
            loading: false,
          });
          return { success: false, error: message };
        }
      },

      register: async (data) => {
        set({ loading: true, error: null });
        try {
          const response = await api.post('/auth/register', data);
          const { user, business, token, message } = response.data;
          set({
            user,
            business: business || null,
            token: token.access_token,
            isAuthenticated: true,
            loading: false,
          });
          localStorage.setItem('token', token.access_token);
          return { success: true, user, business, message };
        } catch (error) {
          set({
            error: error.response?.data?.detail || 'Registration failed',
            loading: false,
          });
          return { success: false, error: error.response?.data?.detail };
        }
      },

      logout: () => {
        set({ user: null, business: null, token: null, isAuthenticated: false });
        localStorage.removeItem('token');
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        business: state.business,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;