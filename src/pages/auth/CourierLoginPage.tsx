import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { BadgeCheck, Lock, ArrowLeft, ArrowRight, UserCheck, Sparkles, Building2 } from 'lucide-react';
import { DelixaLogo } from '../../components/common/DelixaLogo';

interface CourierLoginPageProps {
  navigate: (path: string) => void;
}

export const CourierLoginPage: React.FC<CourierLoginPageProps> = ({ navigate }) => {
  const { loginCourier, loginDemoUser } = useAuth();
  const { t, isRTL } = useLanguage();
  const { showToast } = useToast();

  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  const handleCourierLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!employeeId.trim() || !password) {
      setError('يرجى إدخال كود الموظف وكلمة المرور');
      return;
    }

    setLoading(true);
    const res = await loginCourier(employeeId, password);
    setLoading(false);

    if (res.success) {
      showToast('success', 'مرحباً بك يا بطل!', 'تم تسجيل دخول المندوب بنجاح');
      navigate('/courier/dashboard');
    } else {
      setError(res.error || 'كود الموظف أو كلمة المرور غير صحيحة');
      showToast('error', 'فشل تسجيل الدخول', res.error);
    }
  };

  const handleInstantDemoCourier = async (empId: string, name: string) => {
    setError(null);
    setDemoLoading(empId);
    const res = await loginDemoUser('courier', empId);
    setDemoLoading(null);
    if (res.success) {
      showToast('success', `مرحباً ${name}!`, `تم فتح حساب المندوب التجريبي (${empId})`);
      navigate('/courier/dashboard');
    } else {
      setError(res.error || 'فشل فتح حساب المندوب التجريبي');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Official DELIXA Logo */}
        <div className="flex justify-center mb-4">
          <DelixaLogo size="lg" variant="full" badgeText="COURIER PORTAL" showTagline={true} />
        </div>

        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          {t.courierLoginTitle}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          {t.courierLoginSubtitle}
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

          <form onSubmit={handleCourierLogin} className="space-y-4">
            {/* Employee ID */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.employeeIdLabel}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                  <BadgeCheck className="w-4 h-4" />
                </div>
                <input
                  id="courier-login-id"
                  type="text"
                  required
                  autoCapitalize="characters"
                  value={employeeId}
                  onChange={e => setEmployeeId(e.target.value.toUpperCase())}
                  placeholder="CR-101"
                  className="block w-full ps-10 pe-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-all text-slate-900 min-h-[44px]"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.passwordLabel}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="courier-login-password"
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full ps-10 pe-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-all text-slate-900 min-h-[44px]"
                />
              </div>
            </div>

            <button
              id="courier-login-submit"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] shadow-md shadow-emerald-500/20 disabled:opacity-50 transition-all cursor-pointer min-h-[46px]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>تسجيل دخول المندوب</span>
                  <ArrowIcon className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access For Couriers */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>حسابات المناديب التجريبية (دخول فوري)</span>
              </span>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                id="demo-courier-1-btn"
                onClick={() => handleInstantDemoCourier('CR-101', 'كريم عادل')}
                disabled={demoLoading !== null}
                className="w-full text-start p-3 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 rounded-xl transition flex items-center justify-between cursor-pointer min-h-[44px]"
              >
                <div>
                  <p className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>مندوب 1: كريم عادل (CR-101)</span>
                  </p>
                  <p className="text-[10px] text-emerald-700 mt-0.5">
                    خط سير المعادي ودار السلام (شحنات جاهزة للتسليم)
                  </p>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
                  {demoLoading === 'CR-101' ? 'جاري الدخول...' : 'دخول ←'}
                </span>
              </button>

              <button
                type="button"
                id="demo-courier-2-btn"
                onClick={() => handleInstantDemoCourier('CR-102', 'محمود حسن')}
                disabled={demoLoading !== null}
                className="w-full text-start p-3 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 rounded-xl transition flex items-center justify-between cursor-pointer min-h-[44px]"
              >
                <div>
                  <p className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>مندوب 2: محمود حسن (CR-102)</span>
                  </p>
                  <p className="text-[10px] text-emerald-700 mt-0.5">
                    خط سير مدينة نصر والتجمع الخامس
                  </p>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
                  {demoLoading === 'CR-102' ? 'جاري الدخول...' : 'دخول ←'}
                </span>
              </button>
            </div>
          </div>

          {/* Footer Back Link */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <button
              onClick={() => navigate('/login')}
              className="text-blue-700 hover:text-blue-800 font-bold hover:underline cursor-pointer flex items-center gap-1"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>دخول مديري شركات الشحن</span>
            </button>
            <button
              onClick={() => navigate('/')}
              className="text-slate-600 hover:text-slate-900 font-medium hover:underline cursor-pointer"
            >
              الرئيسية
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
