import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,
});

let onUnauthorized = null;

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && onUnauthorized && !isAuthFreeRequest(error.config?.url)) {
      onUnauthorized();
    }
    return Promise.reject(error);
  }
);

function isAuthFreeRequest(url) {
  return url === "/auth/login";
}

export function apiError(error) {
  return error?.response?.data?.detail ?? "Something went wrong. Please try again.";
}

export { api };
