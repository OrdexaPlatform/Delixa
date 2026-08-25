import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { Truck, BadgeCheck, Lock, ArrowLeft, ArrowRight, Info, Building2, Sparkles } from 'lucide-react';

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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        
        <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto mb-4 shadow-md shadow-emerald-500/20">
          <Truck className="w-6 h-6" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {t.courierLoginTitle}
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-slate-500">
          {t.courierLoginSubtitle}
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

          <form onSubmit={handleCourierLogin} className="space-y-4">
            
            {/* Employee ID */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.employeeIdLabel}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
                  <BadgeCheck className="w-4 h-4" />
                </div>
                <input
                  id="courier-login-id"
                  type="text"
                  required
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="username"
                  inputMode="text"
                  value={employeeId}
                  onChange={e => setEmployeeId(e.target.value)}
                  placeholder={t.employeeIdPlaceholder}
                  className="block w-full ps-10 pe-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm uppercase tracking-wider font-mono font-bold focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-all text-slate-900"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.passwordLabel}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="courier-login-password"
                  type="password"
                  required
                  maxLength={20}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="current-password"
                  inputMode="text"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="block w-full ps-10 pe-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-all text-slate-900"
                />
              </div>
            </div>

            {/* Notice */}
            <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-100 text-[11px] text-emerald-800 flex items-start gap-2">
              <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{t.courierNotice}</span>
            </div>

            {/* Submit */}
            <button
              id="courier-login-submit"
              type="submit"
              disabled={loading || Boolean(demoLoading)}
              className="w-full mt-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span>جاري تسجيل الدخول...</span>
              ) : (
                <>
                  <span>{t.courierLoginButton}</span>
                  <ArrowIcon className="w-4 h-4" />
                </>
              )}
            </button>

          </form>

          {/* Quick Demo Test Buttons for Couriers */}
          <div className="mt-6 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div className="font-bold text-slate-800 mb-2 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>حسابات مناديب جاهزة للتجربة (دخول فوري):</span>
            </div>
            <div className="space-y-2 text-[11px]">
              
              {/* Courier 1 */}
              <div 
                onClick={() => handleInstantDemoCourier('CR-101', 'كريم عادل')}
                className="p-2.5 rounded-xl bg-white border border-slate-200 cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/40 transition-all flex items-center justify-between group"
              >
                <div>
                  <span className="font-bold text-slate-800 group-hover:text-emerald-700 block">كريم عادل (المعادي ودار السلام)</span>
                  <span className="text-[10px] text-slate-500">كود: <strong className="font-mono text-emerald-700">CR-101</strong></span>
                </div>
                <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-bold">
                  {demoLoading === 'CR-101' ? 'جاري...' : 'دخول فوري'}
                </span>
              </div>

              {/* Courier 2 */}
              <div 
                onClick={() => handleInstantDemoCourier('CR-102', 'محمود حسن')}
                className="p-2.5 rounded-xl bg-white border border-slate-200 cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/40 transition-all flex items-center justify-between group"
              >
                <div>
                  <span className="font-bold text-slate-800 group-hover:text-emerald-700 block">محمود حسن (مدينة نصر والتجمع)</span>
                  <span className="text-[10px] text-slate-500">كود: <strong className="font-mono text-emerald-700">CR-102</strong></span>
                </div>
                <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-bold">
                  {demoLoading === 'CR-102' ? 'جاري...' : 'دخول فوري'}
                </span>
              </div>

              {/* Courier 3 */}
              <div 
                onClick={() => handleInstantDemoCourier('CR-103', 'أحمد سامي')}
                className="p-2.5 rounded-xl bg-white border border-slate-200 cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/40 transition-all flex items-center justify-between group"
              >
                <div>
                  <span className="font-bold text-slate-800 group-hover:text-emerald-700 block">أحمد سامي (الجيزة والدقي)</span>
                  <span className="text-[10px] text-slate-500">كود: <strong className="font-mono text-emerald-700">CR-103</strong></span>
                </div>
                <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-bold">
                  {demoLoading === 'CR-103' ? 'جاري...' : 'دخول فوري'}
                </span>
              </div>

            </div>
          </div>

          {/* Navigation to Admin Portal */}
          <div className="mt-6 text-center text-xs text-slate-500 border-t border-slate-100 pt-4">
            <button
              id="courier-to-admin-login-btn"
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-1.5 text-blue-700 hover:text-blue-800 font-semibold cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>تسجيل دخول إدارة شركة الشحن (Admin Portal)</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
