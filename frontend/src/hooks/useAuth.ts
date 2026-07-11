"use client";

import { useState, useEffect, useCallback } from "react";
import { auth, setTokens, clearTokens } from "@/lib/api";
import type { User } from "@/lib/types";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setLoading(false);
      return;
    }
    auth
      .me()
      .then((u) => setUser(u))
      .catch(() => {
        clearTokens();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await auth.login(username, password);
    setTokens(res.access_token, res.refresh_token);
    setUser(res.user);
    return res;
  }, []);

  const logout = useCallback(async () => {
    try {
      await auth.logout();
    } catch {
    } finally {
      clearTokens();
      setUser(null);
    }
  }, []);

  return { user, loading, login, logout, isAuthenticated: !!user };
}
