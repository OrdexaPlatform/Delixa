import React, { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface AdminRouteGuardProps {
  children: React.ReactNode;
  navigate: (path: string) => void;
}

export const AdminRouteGuard: React.FC<AdminRouteGuardProps> = ({ children, navigate }) => {
  const { adminSession, session, loading } = useAuth();
  const activeAdmin = adminSession || (session?.profile.role === 'admin' ? session : null);

  useEffect(() => {
    if (!loading && !activeAdmin) {
      navigate('/login/admin');
    }
  }, [activeAdmin, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-600">جاري التحقق من صلاحيات الإدارة...</p>
        </div>
      </div>
    );
  }

  if (!activeAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-600">يرجى تسجيل الدخول كمدير شركة...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
