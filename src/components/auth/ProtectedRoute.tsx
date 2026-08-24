import React from 'react';
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-600">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    // Redirect to public login
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
          <h2 className="text-xl font-bold text-slate-900 mb-2">تسجيل الدخول مطلوب</h2>
          <p className="text-sm text-slate-500 mb-6">
            يجب تسجيل الدخول بحساب الشركة أو المندوب للوصول لهذه الصفحة.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate('/login')}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-colors shadow-sm"
            >
              تسجيل دخول الإدارة
            </button>
            <button
              onClick={() => navigate('/courier-login')}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm rounded-xl transition-colors"
            >
              تسجيل دخول المندوب
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Check role authorization
  if (targetRole && session.profile.role !== targetRole) {
    const target = session.profile.role === 'admin' ? '/dashboard' : '/courier/dashboard';
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-lg">
            !
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">غير مصرح بالوصول</h2>
          <p className="text-sm text-slate-500 mb-6">
            حسابك الحالي ({session.profile.role === 'admin' ? 'مدير شركة' : 'مندوب شحن'}) ليس لديه صلاحية لعرض هذه الصفحة.
          </p>
          <button
            onClick={() => navigate(target)}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-colors shadow-sm"
          >
            الذهاب للوحة التحكم الخاصة بك
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
