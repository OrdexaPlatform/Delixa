import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { 
  Building2, 
  User, 
  Mail, 
  Phone, 
  Lock, 
  ArrowLeft, 
  ArrowRight, 
  ShieldCheck, 
  MapPin, 
  Sparkles,
  Truck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface RegisterCompanyPageProps {
  navigate: (path: string) => void;
}

export const RegisterCompanyPage: React.FC<RegisterCompanyPageProps> = ({ navigate }) => {
  const { session, registerCompany } = useAuth();
  const { t, isRTL } = useLanguage();
  const { showToast } = useToast();

  const [companyName, setCompanyName] = useState('');
  const [adminFullName, setAdminFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  // Helper to fill demo data for quick testing
  const handleFillDemoData = () => {
    const randomNum = Math.floor(Math.random() * 900 + 100);
    setCompanyName(`شركة النيل للشحن السريع ${randomNum}`);
    setAdminFullName('م. حسام الدين عبد الله');
    setEmail(`admin@nilelogistics${randomNum}.eg`);
    setPhone(`010${Math.floor(Math.random() * 89999999 + 10000000)}`);
    setAddress('شارع الثورة، مصر الجديدة، القاهرة');
    setPassword('password123');
    setConfirmPassword('password123');
    setError(null);
    showToast('info', isRTL ? 'تم ملء البيانات التجريبية بنجاح' : 'Demo data populated', isRTL ? 'اضغط على زر الإنشاء لإتمام التسجيل' : 'Click register to proceed');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Form Validations
    if (!companyName.trim()) {
      setError(isRTL ? 'يرجى إدخال اسم شركة الشحن' : 'Company name is required');
      return;
    }

    if (!adminFullName.trim()) {
      setError(isRTL ? 'يرجى إدخال اسم مدير الشركة' : 'Admin full name is required');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError(isRTL ? 'يرجى إدخال بريد إلكتروني صحيح' : 'Valid email is required');
      return;
    }

    if (!phone.trim()) {
      setError(isRTL ? 'يرجى إدخال رقم الهاتف' : 'Phone number is required');
      return;
    }

    if (!password) {
      setError(isRTL ? 'يرجى إدخال كلمة المرور' : 'Password is required');
      return;
    }

    if (password.length < 6) {
      setError(isRTL ? 'كلمة المرور يجب أن لا تقل عن 6 أحرف أو أرقام' : 'Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError(isRTL ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
      return;
    }

    setLoading(true);

    const result = await registerCompany({
      companyName: companyName.trim(),
      adminFullName: adminFullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password,
      address: address.trim() || 'جمهورية مصر العربية',
    });

    setLoading(false);

    if (result.success) {
      if (result.requiresEmailConfirmation) {
        showToast('success', isRTL ? 'تم إنشاء الحساب بنجاح!' : 'Account registered!', result.message);
        navigate('/login?registered=true');
      } else {
        showToast('success', isRTL ? 'تم إنشاء حساب الشركة بنجاح!' : 'Company registered successfully!', isRTL ? `مرحباً بك في لوحة تحكم ${companyName}` : 'Welcome to your new workspace');
        navigate('/dashboard');
      }
    } else {
      setError(result.error || (isRTL ? 'حدث خطأ أثناء إنشاء الحساب' : 'Failed to register company'));
      showToast('error', isRTL ? 'تعذر إنشاء الحساب' : 'Registration Error', result.error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 py-3 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div 
            onClick={() => navigate('/')} 
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Truck className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-lg text-slate-900">
              Delixa <span className="text-[10px] text-blue-600 uppercase font-mono px-1.5 py-0.5 bg-blue-50 border border-blue-200 rounded">EG</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="text-xs font-bold text-slate-600 hover:text-blue-600 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              {t.loginTitle}
            </button>
            <button
              onClick={() => navigate('/courier-login')}
              className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors hidden sm:inline-flex items-center gap-1"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>{t.courierLoginTitle}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto w-full">
        
        {/* Banner if user is currently logged in */}
        {session && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold">أنت مسجل حالياً بحساب:</span> {session.company.name} ({session.profile.full_name})
                <p className="text-[11px] text-amber-800 mt-0.5">
                  تسجيل شركة جديدة سينشئ مساحة عمل مستقلة ومعزولة كلياً وسيتم تحويلك إليها مباشرة.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold rounded-lg shrink-0 text-xs transition-colors"
            >
              العودة للوحة التحكم
            </button>
          </div>
        )}

        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold mb-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>نظام الشركات المعزولة (Multi-Tenant Workspace)</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {t.registerTitle}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            {t.registerSubtitle}
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-white py-8 px-6 shadow-sm rounded-3xl border border-slate-200 sm:px-10">
          
          {/* Quick Demo Fill Button */}
          <div className="mb-6 flex justify-end">
            <button
              type="button"
              id="fill-demo-company-btn"
              onClick={handleFillDemoData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-700 text-xs font-bold hover:from-blue-100 hover:to-indigo-100 transition-all shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>تعبئة بيانات تجريبية سريعة (1-Click Demo)</span>
            </button>
          </div>

          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Section 1: Company Info */}
            <div className="border-b border-slate-100 pb-4 space-y-4">
              <div className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                <span>1. بيانات شركة الشحن</span>
              </div>

              {/* 1. Company Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.companyNameLabel} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <input
                    id="reg-company-name"
                    type="text"
                    required
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder={t.companyNamePlaceholder}
                    className="block w-full ps-10 pe-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all text-slate-900 font-medium"
                  />
                </div>
              </div>

              {/* Email & Phone (Grid) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.emailLabel} (بريد الشركة الرسمي) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="reg-email"
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="admin@company.eg"
                      className="block w-full ps-10 pe-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all text-slate-900 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.phoneLabel} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      id="reg-phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder={t.phonePlaceholder}
                      className="block w-full ps-10 pe-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all text-slate-900 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.addressLabel}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <input
                    id="reg-address"
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder={t.addressPlaceholder}
                    className="block w-full ps-10 pe-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all text-slate-900 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Admin Profile & Credentials */}
            <div className="pt-2 space-y-4">
              <div className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span>2. بيانات حساب المدير (Admin)</span>
              </div>

              {/* Admin Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.adminFullNameLabel} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="reg-admin-name"
                    type="text"
                    required
                    value={adminFullName}
                    onChange={e => setAdminFullName(e.target.value)}
                    placeholder={t.adminFullNamePlaceholder}
                    className="block w-full ps-10 pe-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all text-slate-900 font-medium"
                  />
                </div>
              </div>

              {/* Passwords */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.passwordLabel} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="reg-password"
                      type="password"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="block w-full ps-10 pe-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all text-slate-900 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.confirmPasswordLabel} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="reg-confirm-password"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="block w-full ps-10 pe-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all text-slate-900 font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Role Notice */}
            <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 text-[11px] text-blue-800">
              <strong>ملاحظة هامة:</strong> التسجيل يمنحك صلاحية <strong>مدير شركة (Admin)</strong> كاملة، ويتيح لك إضافة المتاجر وتعيين المناديب وإنشاء الشحنات برقم شركة مستقل ومحمي.
            </div>

            {/* Submit */}
            <button
              id="submit-register-btn"
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>جاري إنشاء حساب الشركة وتجهيز مساحة العمل...</span>
                </div>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t.registerButton}</span>
                  <ArrowIcon className="w-4 h-4 ms-1" />
                </>
              )}
            </button>

          </form>

          {/* Footer links */}
          <div className="mt-6 text-center text-xs text-slate-500 border-t border-slate-100 pt-4 flex items-center justify-center gap-1">
            <span>{t.alreadyHaveAccount} </span>
            <button
              id="go-to-login-btn"
              onClick={() => navigate('/login')}
              className="font-bold text-blue-600 hover:text-blue-800 underline transition-colors"
            >
              {t.loginHere}
            </button>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-[11px] text-slate-400 border-t border-slate-200 bg-white">
        Delixa Logistics Engine — {t.brandTagline} © 2026
      </footer>

    </div>
  );
};

