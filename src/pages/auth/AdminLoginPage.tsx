import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { Mail, Lock, ArrowLeft, ArrowRight, Sparkles, RotateCcw, ShieldCheck, UserCheck } from 'lucide-react';
import { DelixaLogo } from '../../components/common/DelixaLogo';

interface AdminLoginPageProps {
  navigate: (path: string) => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ navigate }) => {
  const { loginAdmin, loginDemoUser, resetDemoData } = useAuth();
  const { t, isRTL } = useLanguage();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
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

  const handleInstantDemoAdmin = async () => {
    setError(null);
    setDemoLoading('admin');
    const res = await loginDemoUser('admin');
    setDemoLoading(null);
    if (res.success) {
      showToast('success', 'تم الدخول إلى الحساب التجريبي', 'شركة كايرو إكسبريس (حساب تجريبي)');
      navigate('/dashboard');
    } else {
      setError(res.error || 'فشل فتح الحساب التجريبي');
    }
  };

  const handleInstantDemoCourier = async (empId: string, name: string) => {
    setError(null);
    setDemoLoading(empId);
    const res = await loginDemoUser('courier', empId);
    setDemoLoading(null);
    if (res.success) {
      showToast('success', `مرحباً ${name}!`, `تم تسجيل دخول المندوب التجريبي (${empId})`);
      navigate('/courier/dashboard');
    } else {
      setError(res.error || 'فشل فتح حساب المندوب التجريبي');
    }
  };

  const handleResetDemo = () => {
    resetDemoData();
    showToast('info', 'تمت استعادة البيانات الافتراضية', 'تمت استعادة بيانات الحساب التجريبي بنجاح');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Official DELIXA Logo */}
        <div className="flex justify-center mb-4">
          <DelixaLogo size="lg" variant="full" badgeText="ENTERPRISE" showTagline={true} />
        </div>

        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          {t.loginTitle}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          {t.loginSubtitle}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-7 px-5 sm:px-8 shadow-md rounded-2xl border border-slate-200/90">
          
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Real Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.emailLabel}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="admin-login-email"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@company.eg"
                  className="block w-full ps-10 pe-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all text-slate-900 min-h-[44px]"
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
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                >
                  نسيت كلمة المرور؟
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="admin-login-password"
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full ps-10 pe-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all text-slate-900 min-h-[44px]"
                />
              </div>
            </div>

            <button
              id="admin-login-submit"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all cursor-pointer min-h-[46px]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{t.loginButton}</span>
                  <ArrowIcon className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access Section */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>دخول سريع فوري (حساب تجريبي)</span>
              </span>
              <button
                type="button"
                onClick={handleResetDemo}
                className="text-[11px] font-semibold text-slate-500 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
                title="إعادة تعيين البيانات التجريبية"
              >
                <RotateCcw className="w-3 h-3" />
                <span>استعادة البيانات</span>
              </button>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                id="demo-login-admin-btn"
                onClick={handleInstantDemoAdmin}
                disabled={demoLoading !== null}
                className="w-full text-start p-3 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 rounded-xl transition flex items-center justify-between cursor-pointer min-h-[44px]"
              >
                <div>
                  <p className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>شركة كايرو إكسبريس (المدير التجريبي)</span>
                  </p>
                  <p className="text-[10px] text-blue-700 mt-0.5">
                    لوحة تحكم الشركة وإدارة الشحنات والمناديب والتجار
                  </p>
                </div>
                <span className="text-[11px] font-bold text-blue-700 bg-white px-2 py-1 rounded-lg border border-blue-200">
                  {demoLoading === 'admin' ? 'جاري الدخول...' : 'دخول فوري ←'}
                </span>
              </button>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  id="demo-login-courier-1-btn"
                  onClick={() => handleInstantDemoCourier('CR-101', 'كريم عادل')}
                  disabled={demoLoading !== null}
                  className="p-2.5 text-start bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 rounded-xl transition cursor-pointer"
                >
                  <p className="text-[11px] font-bold text-emerald-900 flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-emerald-600" />
                    <span>مندوب 1 (كريم)</span>
                  </p>
                  <p className="text-[9px] text-emerald-700">كود: CR-101</p>
                </button>

                <button
                  type="button"
                  id="demo-login-courier-2-btn"
                  onClick={() => handleInstantDemoCourier('CR-102', 'محمود حسن')}
                  disabled={demoLoading !== null}
                  className="p-2.5 text-start bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 rounded-xl transition cursor-pointer"
                >
                  <p className="text-[11px] font-bold text-emerald-900 flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-emerald-600" />
                    <span>مندوب 2 (محمود)</span>
                  </p>
                  <p className="text-[9px] text-emerald-700">كود: CR-102</p>
                </button>
              </div>
            </div>
          </div>

          {/* Footer Portal Links */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <button
              onClick={() => navigate('/courier-login')}
              className="text-emerald-700 hover:text-emerald-800 font-bold hover:underline cursor-pointer"
            >
              بوابة تسجيل المناديب ←
            </button>
            <button
              onClick={() => navigate('/register-company')}
              className="text-blue-700 hover:text-blue-800 font-bold hover:underline cursor-pointer"
            >
              تسجيل شركة شحن جديدة
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
