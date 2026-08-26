import React, { useEffect } from 'react';
import { useSuperAdmin } from '../../contexts/SuperAdminContext';
import { Loader2 } from 'lucide-react';

interface SuperAdminRouteGuardProps {
  children: React.ReactNode;
  onNavigate: (path: string) => void;
}

export const SuperAdminRouteGuard: React.FC<SuperAdminRouteGuardProps> = ({ children, onNavigate }) => {
  const { session, isLoading } = useSuperAdmin();

  useEffect(() => {
    if (!isLoading && !session) {
      onNavigate('/super-admin/login');
    }
  }, [session, isLoading, onNavigate]);

  if (isLoading) {
    return (
      <div id="super-admin-loading-screen" className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-200" dir="rtl">
        <div className="flex flex-col items-center gap-4 p-8 bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-sm font-semibold text-slate-300">جاري التحقق من صلاحيات Super Admin...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return <>{children}</>;
};
