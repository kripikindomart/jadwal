import axios from "axios";
import { useAuthStore } from "@/stores/auth";
import router from "@/router";

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor — attach JWT
api.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore();
    if (authStore.accessToken) {
      config.headers.Authorization = `Bearer ${authStore.accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor — handle 401 + auto refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const authStore = useAuthStore();

      if (authStore.refreshToken) {
        try {
          const { data } = await axios.post("/api/auth/refresh", {
            refreshToken: authStore.refreshToken,
          });

          authStore.setTokens(data.accessToken, data.refreshToken);
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;

          return api(originalRequest);
        } catch {
          authStore.logout();
          router.push("/login");
        }
      } else {
        authStore.logout();
        router.push("/login");
      }
    }

    return Promise.reject(error);
  },
);

export default api;
