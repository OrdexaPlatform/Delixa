import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import {
  Truck,
  Building2,
  Users,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Lock,
  Database
} from 'lucide-react';
import { DelixaLogo } from '../components/common/DelixaLogo';

interface LandingPageProps {
  navigate: (path: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ navigate }) => {
  const { t, isRTL, language, setLanguage } = useLanguage();
  const { switchDemoUser } = useAuth();
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Top Navbar */}
      <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div 
            onClick={() => navigate('/')} 
            className="cursor-pointer group"
          >
            <DelixaLogo theme="dark" size="sm" variant="full" badgeText="EG" />
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 cursor-pointer min-h-[38px]"
            >
              {language === 'ar' ? 'English' : 'العربية'}
            </button>
            <button
              onClick={() => navigate('/courier-login')}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/50 transition-colors cursor-pointer min-h-[38px]"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>{t.courierLoginTitle}</span>
            </button>
            <button
              onClick={() => navigate('/login')}
              className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer min-h-[38px]"
            >
              {t.loginTitle}
            </button>
            <button
              onClick={() => navigate('/register-company')}
              className="text-xs font-bold px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 transition-colors cursor-pointer min-h-[38px]"
            >
              {t.registerCompanyLink}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-white pt-12 pb-24 lg:pt-16 lg:pb-32">
        <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:24px_24px] opacity-10" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            
            {/* Tagline Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-400 text-xs font-bold mb-6 backdrop-blur-sm">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>منصة سحابية متقدمة لعمليات الشحن والتوصيل والميل الأخير</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
              إدارة احترافية متكاملة لأسطول الشحن والتجار
            </h1>

            <p className="mt-6 text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto">
              منصة <strong className="text-blue-400 font-bold">DELIXA</strong> تمنح كل شركة شحن مساحة عمل سحابية معزولة تماماً (Multi-Tenant) لإدارة المتاجر المتعاقدة، مناديب التوصيل، الشحنات النقدية (COD)، وتعيين المناطق بدقة وأمان فائق.
            </p>

            {/* Main CTAs */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                id="hero-register-btn"
                onClick={() => navigate('/register-company')}
                className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 group cursor-pointer min-h-[48px]"
              >
                <span>{t.registerCompanyLink}</span>
                <ArrowIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                id="hero-login-btn"
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto px-8 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[48px]"
              >
                <Building2 className="w-4 h-4 text-blue-400" />
                <span>{t.loginTitle}</span>
              </button>

              <button
                id="hero-courier-login-btn"
                onClick={() => navigate('/courier-login')}
                className="w-full sm:w-auto px-6 py-3.5 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-700/50 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[48px]"
              >
                <Truck className="w-4 h-4 text-emerald-400" />
                <span>{t.courierLoginTitle}</span>
              </button>
            </div>

            {/* Quick Test Demo Bar */}
            <div className="mt-10 p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 max-w-xl mx-auto text-xs text-slate-300">
              <div className="font-bold text-white mb-2 text-center flex items-center justify-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>جرّب المنصة بحسابات تجريبية مجهزة فوراً</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
                <button
                  id="landing-quick-admin-a"
                  onClick={() => {
                    switchDemoUser('adminCompanyA');
                    navigate('/dashboard');
                  }}
                  className="p-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-blue-300 text-center font-semibold transition-colors cursor-pointer min-h-[44px]"
                >
                  شركة كايرو إكسبريس
                </button>
                <button
                  id="landing-quick-admin-b"
                  onClick={() => {
                    switchDemoUser('adminCompanyB');
                    navigate('/dashboard');
                  }}
                  className="p-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-300 text-center font-semibold transition-colors cursor-pointer min-h-[44px]"
                >
                  شركة الإسكندرية (عزل)
                </button>
                <button
                  id="landing-quick-courier"
                  onClick={() => {
                    switchDemoUser('courierA');
                    navigate('/courier/dashboard');
                  }}
                  className="p-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 text-emerald-300 text-center font-semibold transition-colors cursor-pointer min-h-[44px]"
                >
                  مندوب توصيل (CR-101)
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Value Pillars Section */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
            أركان البنية التحتية لمنصة DELIXA
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600">
            صُممت المنصة وفق أحدث معايير الأمان والسرعة والتحصيلات النقدية
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pillar 1 */}
          <div className="bg-white p-7 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">
              عزل تام للمستأجرين (True Multi-Tenancy)
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              كل شركة شحن تمتلك مساحة عمل مؤمنة بقواعد صارمة تمنع أي تداخل في الشحنات أو البيانات المالية.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="bg-white p-7 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-5">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">
              إدارة دقيقة للمناديب والمناطق
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              تعيين الشحنات، تحديث الحالات الحية، تحصيل المبالغ النقدية، وإغلاق اليوميات بنقرة واحدة.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="bg-white p-7 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">
              تسويات مالية فورية للمتاجر
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              حسابات شفافة: إجمالي التحصيلات − مصاريف الشحن − المرتجعات = صافي مستحقات التاجر.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <DelixaLogo size="xs" variant="full" badgeText="EG" />
          <p>© 2026 DELIXA. منصة إدارة الشحن والتوصيل للميل الأخير.</p>
        </div>
      </footer>

    </div>
  );
};
