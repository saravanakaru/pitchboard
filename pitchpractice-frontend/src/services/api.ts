import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
import { type AuthResponse, type Session } from "../types";
export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
          refreshToken,
        });

        const { accessToken } = response.data;
        localStorage.setItem("accessToken", accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Redirect to login if refresh fails
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>("/auth/login", { email, password }),

  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationName: string;
    organizationType?: string;
    organizationDescription?: string;
  }) => api.post<AuthResponse>("/auth/register", data),

  refresh: (refreshToken: string) =>
    api.post<{ accessToken: string }>("/auth/refresh", { refreshToken }),
};

export const sessionAPI = {
  start: (scenario: string) =>
    api.post<{ sessionId: string }>("/sessions/start", { scenario }),

  complete: (sessionId: string) =>
    api.post<Session>(`/sessions/${sessionId}/complete`),

  get: (sessionId: string) => api.get<Session>(`/sessions/${sessionId}`),
  getSessions: (params?: {
    timeRange?: "7days" | "30days" | "90days" | "all";
    userId?: string;
  }) => api.get("/sessions/analytics", { params }),
  getUserSessions: (params?: { userId?: string }) =>
    api.get("/sessions/user", { params }),
  getSession: (id: string) => api.get(`/sessions/${id}`),
};

export const dashboardAPI = {
  getStats: (params?: { startDate?: string; endDate?: string }) =>
    api.get("/dashboard/stats", { params }),

  getSessions: (params?: {
    userId?: string;
    scenario?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => api.get("/dashboard/sessions", { params }),

  exportSessions: (params?: { startDate?: string; endDate?: string }) =>
    api.get("/dashboard/export", {
      params,
      responseType: "blob",
    }),

  getAnalytics: (timeframe?: string) =>
    api.get("/dashboard/analytics", { params: { timeframe } }),
};

export const userApi = {
  getUsers: (params?: { page?: number; limit?: number }) =>
    api.get("/auth/users", { params }),
  createUser: (userData: any) => api.post("/auth/register/user", userData),
  updateUser: (id: string, userData: any) =>
    api.put(`/auth/users/${id}`, userData),
  deleteUser: (id: string) => api.delete(`/auth/users/${id}`),
};
