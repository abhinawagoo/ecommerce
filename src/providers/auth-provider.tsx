"use client";

import { createContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { AuthSession } from "@/services/auth.service";
import * as authService from "@/services/auth.service";

interface AuthContextValue {
  session: AuthSession;
  isLoading: boolean;
  sendOtp: (phone: string) => Promise<{ success: boolean; message: string }>;
  verifyOtp: (phone: string, otp: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession>({
    user: null,
    isAuthenticated: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const s = await authService.getSession();
      setSession(s);
    } catch {
      setSession({ user: null, isAuthenticated: false });
    }
  }, []);

  useEffect(() => {
    refreshSession().finally(() => setIsLoading(false));

    const subscription = authService.onAuthStateChange((s) => {
      setSession(s);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshSession]);

  const handleSendOtp = useCallback(async (phone: string) => {
    return authService.sendOtp(phone);
  }, []);

  const handleVerifyOtp = useCallback(async (phone: string, otp: string) => {
    const result = await authService.verifyOtp(phone, otp);
    if (result.success) {
      await refreshSession();
    }
    return result;
  }, [refreshSession]);

  const handleLogout = useCallback(async () => {
    await authService.logout();
    setSession({ user: null, isAuthenticated: false });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        isLoading,
        sendOtp: handleSendOtp,
        verifyOtp: handleVerifyOtp,
        logout: handleLogout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
