import axios from "axios";

const getApiUrl = () => {
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ) {
    if (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.includes("vercel.app")) {
      return process.env.NEXT_PUBLIC_API_URL;
    }
    return "http://localhost:5000/api";
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return "https://gm-fabrics-server.vercel.app/api";
};

const api = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
});

// Dynamic Base URL & Token Interceptor
api.interceptors.request.use((config) => {
  config.baseURL = getApiUrl();
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("gmfabrics_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Unauthenticated 401 Interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("gmfabrics_token");
        localStorage.removeItem("gmfabrics_user");
        if (!window.location.pathname.includes("/login")) {
          window.location.href = "/login";
        }
      }
    }
    const message =
      error.response?.data?.message || error.message || "An unexpected error occurred.";
    return Promise.reject(new Error(message));
  }
);

export default api;
