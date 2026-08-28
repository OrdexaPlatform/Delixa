import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PlatformAdmin, SuperAdminSession, SuperAdminPermission } from '../types';
import { safeFetchJson } from '../utils/apiClient';

interface SuperAdminContextType {
  session: SuperAdminSession | null;
  admin: PlatformAdmin | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshAdmin: () => Promise<void>;
  hasPermission: (permission: SuperAdminPermission) => boolean;
}

const SuperAdminContext = createContext<SuperAdminContextType | undefined>(undefined);

const STORAGE_KEY = 'delixa_super_admin_session_v1';

export const SuperAdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<SuperAdminSession | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const token = session?.token || null;
  const admin = session?.admin || null;

  const refreshAdmin = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const { ok, status, data } = await safeFetchJson<any>('/api/super-admin/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (ok && data?.success && data?.admin) {
        const updatedSession: SuperAdminSession = {
          token,
          admin: data.admin,
          expires_at: session?.expires_at || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        };
        setSession(updatedSession);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSession));
      } else if (status === 401 || status === 403) {
        // Session invalid
        setSession(null);
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.warn('Failed to verify super admin session:', e);
    } finally {
      setIsLoading(false);
    }
  }, [token, session?.expires_at]);

  useEffect(() => {
    refreshAdmin();
  }, [refreshAdmin]);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const { ok, data, error } = await safeFetchJson<any>('/api/super-admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (ok && data?.success && data?.session) {
        setSession(data.session);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.session));
        setIsLoading(false);
        return { success: true };
      } else {
        setIsLoading(false);
        return { success: false, error: data?.error || error || 'فشل تسجيل الدخول' };
      }
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'حدث خطأ في الاتصال بالخادم' };
    }
  };

  const logout = async () => {
    if (token) {
      try {
        await safeFetchJson('/api/super-admin/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // silence
      }
    }
    setSession(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const hasPermission = (permission: SuperAdminPermission): boolean => {
    if (!admin) return false;
    if (admin.role === 'super_admin' || (admin.permissions && admin.permissions.includes('*'))) {
      return true;
    }
    return admin.permissions ? admin.permissions.includes(permission) : false;
  };

  return (
    <SuperAdminContext.Provider
      value={{
        session,
        admin,
        token,
        isLoading,
        login,
        logout,
        refreshAdmin,
        hasPermission,
      }}
    >
      {children}
    </SuperAdminContext.Provider>
  );
};

export const useSuperAdmin = () => {
  const context = useContext(SuperAdminContext);
  if (!context) {
    throw new Error('useSuperAdmin must be used within a SuperAdminProvider');
  }
  return context;
};
