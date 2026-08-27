import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { useSuperAdmin } from '../../contexts/SuperAdminContext';
import { DelixaLogo } from '../../components/common/DelixaLogo';

interface SuperAdminLoginPageProps {
  onNavigate: (path: string) => void;
}

export const SuperAdminLoginPage: React.FC<SuperAdminLoginPageProps> = ({ onNavigate }) => {
  const { login } = useSuperAdmin();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await login(username.trim(), password);
      if (res.success) {
        onNavigate('/super-admin/dashboard');
      } else {
        setError(res.error || 'اسم المستخدم أو كلمة المرور غير صحيحة');
      }
    } catch {
      setError('حدث خطأ أثناء الاتصال بالخادم');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="super-admin-login-screen" className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden" dir="rtl">
      {/* Background Decorative Gradients */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <DelixaLogo theme="dark" size="lg" variant="full" badgeText="SUPER ADMIN" showTagline={true} />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">لوحة الإدارة والتحكم المركزية</h1>
          <p className="text-xs text-slate-400 mt-1.5 font-medium">تسجيل دخول مالك المنصة وإدارة الاشتراكات والشركات</p>
        </div>

        {error && (
          <div id="super-admin-login-error" className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-semibold flex items-center gap-2">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">اسم المستخدم</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                <User className="w-4 h-4" />
              </div>
              <input
                id="super-admin-username-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                autoComplete="username"
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-2.5 pr-10 pl-4 text-sm text-white placeholder-slate-500 outline-hidden transition min-h-[44px]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">كلمة المرور</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="super-admin-password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                autoComplete="current-password"
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-2.5 pr-10 pl-10 text-sm text-white placeholder-slate-500 outline-hidden transition min-h-[44px]"
                required
              />
              <button
                type="button"
                id="super-admin-toggle-password-btn"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 hover:text-slate-300 transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            id="super-admin-login-submit-btn"
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50 min-h-[46px] cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري تسجيل الدخول...</span>
              </>
            ) : (
              <>
                <span>دخول لوحة التحكم المركزية</span>
                <ArrowRight className="w-4 h-4 rotate-180" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <button
            id="super-admin-back-to-home-btn"
            onClick={() => onNavigate('/')}
            className="text-xs text-slate-400 hover:text-white transition font-medium"
          >
            ← العودة للموقع الرئيسي
          </button>
        </div>
      </div>
    </div>
  );
};
