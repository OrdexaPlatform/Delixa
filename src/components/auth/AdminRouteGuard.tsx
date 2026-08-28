import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AlertTriangle, Phone, Mail, LogOut, ShieldAlert } from 'lucide-react';
import { safeFetchJson } from '../../utils/apiClient';

interface AdminRouteGuardProps {
  children: React.ReactNode;
  navigate: (path: string) => void;
}

export const AdminRouteGuard: React.FC<AdminRouteGuardProps> = ({ children, navigate }) => {
  const { adminSession, session, loading, logoutAdmin } = useAuth();
  const activeAdmin = adminSession || (session?.profile.role === 'admin' ? session : null);
  const [isSuspended, setIsSuspended] = useState<boolean>(() => {
    const status = activeAdmin?.company?.status;
    return status === 'suspended' || status === 'disabled';
  });

  // Verify real-time status from backend if session exists
  useEffect(() => {
    if (activeAdmin?.session?.access_token) {
      safeFetchJson<any>('/api/company/verify-status', {
        headers: {
          Authorization: `Bearer ${activeAdmin.session.access_token}`,
        },
      })
        .then(({ ok, data }) => {
          if (ok && data?.success && data?.isSuspended !== undefined) {
            setIsSuspended(Boolean(data.isSuspended));
          }
        })
        .catch(() => {});
    }
  }, [activeAdmin]);

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

  // Company is Suspended by Super Admin
  if (isSuspended || activeAdmin.company?.status === 'suspended' || activeAdmin.company?.status === 'disabled') {
    return (
      <div id="company-suspended-lockout" className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center shadow-2xl space-y-5">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-2">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-xl font-black text-white">حساب الشركة موقوف</h1>
            <p className="text-sm font-semibold text-amber-400 mt-2">
              حساب شركتك موقوف حاليًا. يرجى التواصل مع إدارة DELIXA.
            </p>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              تم تعليق استخدام المنصة للشركة مؤقتاً بواسطة إدارة المنصة المركزية. جميع بياناتك وشحناتك وسجلاتك محفوظة بأمان.
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 space-y-2.5 text-xs text-slate-300">
            <div className="font-bold text-white text-right">لإعادة التفعيل، يرجى التواصل مع الدعم:</div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">البريد الإلكتروني:</span>
              <a href="mailto:support@delixa.app" className="text-blue-400 hover:underline font-mono">support@delixa.app</a>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">الهاتف / واتساب:</span>
              <span className="text-slate-200 font-mono" dir="ltr">+20 100 000 0000</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={async () => {
                await logoutAdmin();
                navigate('/login/admin');
              }}
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

