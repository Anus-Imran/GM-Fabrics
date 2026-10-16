import axios from "axios";

const PROD_API_URL = "https://gm-fabrics-server.vercel.app/api";

export const getApiUrl = () => {
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ) {
    if (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.includes("vercel.app")) {
      return process.env.NEXT_PUBLIC_API_URL;
    }
    return "http://localhost:5000/api";
  }
  return process.env.NEXT_PUBLIC_API_URL || PROD_API_URL;
};

export const TOKEN_KEY = "gmfabrics_token";
export const USER_KEY = "gmfabrics_user";

const safeStorage = {
  get: (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  remove: (k) => {
    try {
      localStorage.removeItem(k);
    } catch {
      // ignore
    }
  },
};

export const getToken = () => (typeof window !== "undefined" ? safeStorage.get(TOKEN_KEY) : null);

const api = axios.create({
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

// Dynamic Base URL & Token Interceptor
api.interceptors.request.use((config) => {
  config.baseURL = getApiUrl();
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Unauthenticated 401 Interceptor + readable error messages
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response && error.response.status === 401 && typeof window !== "undefined") {
      safeStorage.remove(TOKEN_KEY);
      safeStorage.remove(USER_KEY);
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }

    let message = error.response?.data?.message;
    if (!message) {
      if (error.code === "ECONNABORTED") message = "The server took too long to respond. Please try again.";
      else if (!error.response) message = "Cannot reach the server. Check your internet connection.";
      else message = error.message || "An unexpected error occurred.";
    }
    const err = new Error(message);
    err.status = error.response?.status;
    err.errors = error.response?.data?.errors || null;
    return Promise.reject(err);
  }
);

/** Downloads a file from an authenticated endpoint (e.g. Excel export). */
export const downloadFile = async (path, fallbackName) => {
  const token = getToken();
  const res = await fetch(`${getApiUrl()}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.message || "Download failed");
  }
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = /filename="?([^"]+)"?/.exec(disposition);
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = match ? match[1] : fallbackName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
};

export default api;
