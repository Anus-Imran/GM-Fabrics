"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api, { TOKEN_KEY, USER_KEY } from "../services/apiService.js";

const AuthContext = createContext();

const readStorage = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const writeStorage = (key, value) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // ignore (private mode / blocked storage)
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    writeStorage(TOKEN_KEY, null);
    writeStorage(USER_KEY, null);
    window.location.href = "/login";
  }, []);

  useEffect(() => {
    const savedToken = readStorage(TOKEN_KEY);
    const savedUser = readStorage(USER_KEY);

    if (savedToken && savedUser) {
      setToken(savedToken);
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        writeStorage(USER_KEY, null);
      }
      // Refresh role / name from the server (role changes take effect immediately).
      api
        .get("/auth/me")
        .then((res) => {
          if (res.data) {
            setUser(res.data);
            writeStorage(USER_KEY, JSON.stringify(res.data));
          }
        })
        .catch((err) => {
          if (err.status === 401) logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [logout]);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    if (res.success && res.data) {
      const { user: userData, token: userToken } = res.data;
      setUser(userData);
      setToken(userToken);
      writeStorage(TOKEN_KEY, userToken);
      writeStorage(USER_KEY, JSON.stringify(userData));
      return userData;
    }
    throw new Error(res.message || "Login failed");
  };

  // Used after a password change: the server issues a new token.
  const replaceToken = (newToken) => {
    setToken(newToken);
    writeStorage(TOKEN_KEY, newToken);
  };

  const isAdmin = user?.role === "ADMIN";

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, replaceToken, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
