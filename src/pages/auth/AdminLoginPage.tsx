import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { Mail, Lock, Building2, ArrowLeft, ArrowRight, Truck, Sparkles } from 'lucide-react';

interface AdminLoginPageProps {
  navigate: (path: string) => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ navigate }) => {
  const { loginAdmin, switchDemoUser } = useAuth();
  const { t, isRTL } = useLanguage();
  const { showToast } = useToast();

  const [email, setEmail] = useState('admin@cairoexpress.eg');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    setLoading(true);
    const res = await loginAdmin(email, password);
    setLoading(false);

    if (res.success) {
      showToast('success', 'تم تسجيل الدخول بنجاح', 'أهلاً بك في لوحة تحكم شركة الشحن');
      navigate('/dashboard');
    } else {
      setError(res.error || 'بيانات الدخول غير صحيحة');
      showToast('error', 'فشل تسجيل الدخول', res.error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        
        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto mb-4 shadow-md shadow-blue-500/20">
          <Building2 className="w-6 h-6" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {t.loginTitle}
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-slate-500">
          {t.loginSubtitle}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm rounded-2xl border border-slate-200 sm:px-10">
          
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            
            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.emailLabel}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="admin-login-email"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@company.eg"
                  className="block w-full ps-10 pe-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all text-slate-900"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  {t.passwordLabel}
                </label>
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                >
                  {t.forgotPasswordLink}
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="admin-login-password"
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full ps-10 pe-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all text-slate-900"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              id="admin-login-submit"
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>جاري تسجيل الدخول...</span>
              ) : (
                <>
                  <span>{t.loginButton}</span>
                  <ArrowIcon className="w-4 h-4" />
                </>
              )}
            </button>

          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-6 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div className="font-bold text-slate-700 flex items-center gap-1 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>حسابات تجريبية سريعة:</span>
            </div>
            <div className="space-y-1.5 text-[11px] text-slate-600">
              <div 
                onClick={() => {
                  setEmail('admin@cairoexpress.eg');
                  setPassword('password123');
                }}
                className="p-1.5 rounded bg-white border border-slate-200 cursor-pointer hover:border-blue-500 transition-colors flex justify-between"
              >
                <span>شركة كايرو إكسبريس:</span>
                <span className="font-mono text-blue-700">admin@cairoexpress.eg</span>
              </div>
              <div 
                onClick={() => {
                  setEmail('admin@alexfastcargo.eg');
                  setPassword('password123');
                }}
                className="p-1.5 rounded bg-white border border-slate-200 cursor-pointer hover:border-blue-500 transition-colors flex justify-between"
              >
                <span>شركة الإسكندرية (لاختبار العزل):</span>
                <span className="font-mono text-indigo-700">admin@alexfastcargo.eg</span>
              </div>
            </div>
          </div>

          {/* Register Company Action */}
          <div className="mt-6 text-center text-xs text-slate-500 border-t border-slate-100 pt-4 flex flex-col gap-2">
            <div>
              <span>ليس لديك حساب شركة بعد؟ </span>
              <button
                id="login-to-register-btn"
                onClick={() => navigate('/register-company')}
                className="font-bold text-blue-600 hover:text-blue-800 underline transition-colors cursor-pointer"
              >
                {t.registerCompanyLink}
              </button>
            </div>

            <div className="pt-2">
              <button
                id="login-to-courier-btn"
                onClick={() => navigate('/courier-login')}
                className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 font-semibold bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors border border-emerald-200"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>تسجيل دخول المندوب (كود الموظف)</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
