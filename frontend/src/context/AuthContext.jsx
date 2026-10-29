import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { setUnauthorizedHandler } from "@/config/api";
import { loginApi, logoutApi, meApi } from "@/features/auth/services/authApi";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | authenticated | unauthenticated
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const { data } = await meApi();
        if (!cancelled) {
          setAdmin(data);
          setStatus("authenticated");
        }
      } catch {
        if (!cancelled) setStatus("unauthenticated");
      }
    }

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAdmin(null);
      setStatus("unauthenticated");
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (credentials) => {
    const { data } = await loginApi(credentials);
    setAdmin(data);
    setStatus("authenticated");
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } finally {
      setAdmin(null);
      setStatus("unauthenticated");
      queryClient.clear();
    }
  }, [queryClient]);

  const value = useMemo(
    () => ({
      admin,
      status,
      isAuthenticated: status === "authenticated",
      isLoading: status === "loading",
      login,
      logout,
    }),
    [admin, status, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
