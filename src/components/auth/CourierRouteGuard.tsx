import React, { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface CourierRouteGuardProps {
  children: React.ReactNode;
  navigate: (path: string) => void;
}

export const CourierRouteGuard: React.FC<CourierRouteGuardProps> = ({ children, navigate }) => {
  const { courierSession, session, loading } = useAuth();
  const activeCourier = courierSession || (session?.profile.role === 'courier' ? session : null);

  useEffect(() => {
    if (!loading && !activeCourier) {
      navigate('/login/courier');
    }
  }, [activeCourier, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-600">جاري التحقق من حساب المندوب...</p>
        </div>
      </div>
    );
  }

  if (!activeCourier) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-600">يرجى تسجيل الدخول كمندوب توصيل...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
