import React, { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole?: UserRole;
  requiredRole?: UserRole;
  navigate: (path: string) => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRole,
  requiredRole,
  navigate,
}) => {
  const { session, loading } = useAuth();
  const targetRole = requiredRole || allowedRole;

  useEffect(() => {
    if (!loading) {
      if (!session) {
        if (targetRole === 'courier') {
          navigate('/login/courier');
        } else {
          navigate('/login/admin');
        }
      } else if (targetRole && session.profile.role !== targetRole) {
        if (session.profile.role === 'admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/courier/dashboard');
        }
      }
    }
  }, [session, loading, targetRole, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-600">جاري التحقق من بيانات الدخول...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-600">جاري التحويل...</p>
        </div>
      </div>
    );
  }

  if (targetRole && session.profile.role !== targetRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-600">جاري توجيهك للوحة التحكم المناسبة...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
