import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { Mail, Lock, Building2, ArrowLeft, ArrowRight, Truck, Sparkles, RotateCcw, ShieldCheck, UserCheck } from 'lucide-react';

interface AdminLoginPageProps {
  navigate: (path: string) => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ navigate }) => {
  const { loginAdmin, loginDemoUser, resetDemoData, isConfigured } = useAuth();
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
      showToast('success', 'تم الدخول إلى الحساب التجريبي', 'شركة كايرو إكسبريس (حساب تجريبي محلي)');
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
    showToast('info', 'تمت استعادة البيانات الافتراضية', 'تمت استعادة شحنات ومناديب الحساب التجريبي بنجاح');
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

          {/* Real Supabase Login Form */}
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
              disabled={loading || Boolean(demoLoading)}
              className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span>جاري تسجيل الدخول...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>تسجيل الدخول (حساب حقيقي)</span>
                  <ArrowIcon className="w-4 h-4" />
                </>
              )}
            </button>

          </form>

          {/* Quick 1-Click Demo Section */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>حسابات تجريبية سريعة (بدون تسجيل):</span>
              </div>
              <button
                type="button"
                onClick={handleResetDemo}
                className="text-[10px] text-slate-500 hover:text-slate-700 flex items-center gap-1 font-medium bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded transition-colors"
                title="إعادة تعيين البيانات التجريبية للحالة الافتراضية"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>إعادة ضبط الديمو</span>
              </button>
            </div>

            <div className="space-y-2">
              {/* Demo Admin */}
              <button
                type="button"
                id="demo-admin-btn"
                disabled={loading || Boolean(demoLoading)}
                onClick={handleInstantDemoAdmin}
                className="w-full p-2.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 hover:border-blue-400 text-left rtl:text-right flex items-center justify-between group transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 group-hover:text-blue-700">
                      شركة كايرو إكسبريس (المدير التجريبي)
                    </div>
                    <div className="text-[10px] text-slate-500">
                      أحمد محمود • لوحة تحكم الإدارة الكاملة
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-blue-700 bg-white border border-blue-200 px-2 py-0.5 rounded-md shadow-xs">
                  {demoLoading === 'admin' ? 'جاري الدخول...' : 'دخول فوري'}
                </span>
              </button>

              {/* 3 Demo Couriers */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 pt-1">
                <button
                  type="button"
                  disabled={loading || Boolean(demoLoading)}
                  onClick={() => handleInstantDemoCourier('CR-101', 'كريم عادل')}
                  className="p-2 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-right flex flex-col justify-between transition-all cursor-pointer"
                >
                  <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                    <Truck className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span className="truncate">كريم عادل</span>
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono">CR-101 • المعادي</div>
                </button>

                <button
                  type="button"
                  disabled={loading || Boolean(demoLoading)}
                  onClick={() => handleInstantDemoCourier('CR-102', 'محمود حسن')}
                  className="p-2 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-right flex flex-col justify-between transition-all cursor-pointer"
                >
                  <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                    <Truck className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span className="truncate">محمود حسن</span>
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono">CR-102 • نصر</div>
                </button>

                <button
                  type="button"
                  disabled={loading || Boolean(demoLoading)}
                  onClick={() => handleInstantDemoCourier('CR-103', 'أحمد سامي')}
                  className="p-2 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-right flex flex-col justify-between transition-all cursor-pointer"
                >
                  <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                    <Truck className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span className="truncate">أحمد سامي</span>
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono">CR-103 • الجيزة</div>
                </button>
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
                className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 font-semibold bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors border border-emerald-200 cursor-pointer"
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
