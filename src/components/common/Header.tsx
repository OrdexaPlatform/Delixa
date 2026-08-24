import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  Building2, 
  Globe, 
  LogOut, 
  ShieldCheck, 
  Truck, 
  ChevronDown, 
  Menu,
  Sparkles,
  ArrowRightLeft
} from 'lucide-react';
import { NotificationCenter } from './NotificationCenter';

interface HeaderProps {
  onToggleMobileMenu?: () => void;
  currentPath: string;
  navigate: (path: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu, currentPath, navigate }) => {
  const { session, logout, switchDemoUser } = useAuth();
  const { language, setLanguage, t, isRTL } = useLanguage();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showDemoSwitcher, setShowDemoSwitcher] = useState(false);

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Left: Mobile Menu Trigger & Brand / Company context */}
          <div className="flex items-center gap-3">
            {session && onToggleMobileMenu && (
              <button
                id="mobile-menu-toggle"
                onClick={onToggleMobileMenu}
                className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Toggle menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            {/* Brand Logo */}
            <div 
              id="brand-logo"
              onClick={() => navigate(session ? (session.profile.role === 'admin' ? '/dashboard' : '/courier/dashboard') : '/')}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <Truck className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-xl tracking-tight text-slate-900 flex items-center gap-1.5">
                  Delixa
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/60">
                    EG
                  </span>
                </span>
                <span className="text-[10px] text-slate-500 hidden sm:inline -mt-0.5">
                  {t.brandTagline}
                </span>
              </div>
            </div>

            {/* Active Company Badge (Multi-tenant verification) */}
            {session && (
              <div className="hidden md:flex items-center gap-2 ms-4 px-3 py-1.5 bg-slate-100/80 rounded-lg border border-slate-200/80 text-xs">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-semibold text-slate-700 max-w-[200px] truncate">
                  {session.company.name}
                </span>
                <span className="inline-flex items-center px-1.5 py-0.2 text-[10px] font-medium bg-emerald-100 text-emerald-800 rounded">
                  RLS Isolated
                </span>
              </div>
            )}
          </div>

          {/* Right: Quick actions, Language toggle, Multi-Tenant switcher, Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Quick Demo Switcher (Helps examiner test both companies and courier views instantly) */}
            <div className="relative">
              <button
                id="demo-switcher-btn"
                onClick={() => setShowDemoSwitcher(!showDemoSwitcher)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
                title="Quick workspace and tenant switch"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">تبديل الحساب التجريبي / Switch</span>
              </button>

              {showDemoSwitcher && (
                <div 
                  id="demo-switcher-dropdown"
                  className="absolute end-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 text-xs"
                >
                  <div className="px-3 py-1.5 border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                    اختبار العزل والحسابات / Multi-Tenant Test
                  </div>
                  <button
                    id="demo-switch-company-a"
                    onClick={() => {
                      switchDemoUser('adminCompanyA');
                      setShowDemoSwitcher(false);
                      navigate('/dashboard');
                    }}
                    className="w-full text-start px-3 py-2 text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex flex-col transition-colors"
                  >
                    <span className="font-bold">1. كايرو إكسبريس (Admin)</span>
                    <span className="text-[11px] text-slate-500">شركة A - القاهرة (شحنات وتجار ومناديب A)</span>
                  </button>
                  <button
                    id="demo-switch-company-b"
                    onClick={() => {
                      switchDemoUser('adminCompanyB');
                      setShowDemoSwitcher(false);
                      navigate('/dashboard');
                    }}
                    className="w-full text-start px-3 py-2 text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex flex-col transition-colors border-t border-slate-100"
                  >
                    <span className="font-bold text-indigo-900">2. الإسكندرية للشحن (Admin)</span>
                    <span className="text-[11px] text-slate-500">شركة B - الإسكندرية (معزولة كلياً عن A)</span>
                  </button>
                  <button
                    id="demo-switch-courier"
                    onClick={() => {
                      switchDemoUser('courierA');
                      setShowDemoSwitcher(false);
                      navigate('/courier/dashboard');
                    }}
                    className="w-full text-start px-3 py-2 text-emerald-800 hover:bg-emerald-50 flex flex-col transition-colors border-t border-slate-100"
                  >
                    <span className="font-bold">3. مندوب التوصيل (كريم - CR-101)</span>
                    <span className="text-[11px] text-emerald-600">لوحة تحكم المندوب ومسار الشحنات اليومية</span>
                  </button>
                  <button
                    id="demo-create-new-company"
                    onClick={() => {
                      setShowDemoSwitcher(false);
                      navigate('/register-company');
                    }}
                    className="w-full text-start px-3 py-2 text-blue-700 bg-blue-50/50 hover:bg-blue-100/70 flex flex-col transition-colors border-t border-slate-200"
                  >
                    <span className="font-bold flex items-center gap-1">
                      <span>+ تسجيل شركة شحن جديدة</span>
                    </span>
                    <span className="text-[11px] text-blue-600">إنشاء مساحة عمل وشركة شحن جديدة من الصفر</span>
                  </button>
                </div>
              )}
            </div>

            {/* Language Switcher */}
            <button
              id="language-toggle-btn"
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors border border-slate-200"
              aria-label="Toggle language"
            >
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <span>{language === 'ar' ? 'English' : 'العربية'}</span>
            </button>

            {/* Notification Center */}
            {session && <NotificationCenter navigate={navigate} />}

            {/* Auth status & user dropdown */}
            {session ? (
              <div className="relative">
                <button
                  id="user-menu-btn"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1.5 pe-3 text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all"
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                    {session.profile.full_name.charAt(0)}
                  </div>
                  <div className="hidden sm:flex flex-col text-start">
                    <span className="text-xs font-bold text-slate-900 leading-none">
                      {session.profile.full_name.split(' ')[0]}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5">
                      {session.profile.role === 'admin' ? t.roleAdmin : `${t.roleCourier} (${session.courier?.employee_id})`}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {showUserMenu && (
                  <div
                    id="user-dropdown-menu"
                    className="absolute end-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95"
                  >
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900">{session.profile.full_name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{session.user.email}</p>
                      <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-blue-700">
                        <ShieldCheck className="w-3 h-3 text-blue-600" />
                        <span>{session.company.name}</span>
                      </div>
                    </div>

                    {session.profile.role === 'admin' && (
                      <>
                        <button
                          id="nav-settings-dropdown-btn"
                          onClick={() => {
                            setShowUserMenu(false);
                            navigate('/settings');
                          }}
                          className="w-full text-start px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                        >
                          {t.navSettings}
                        </button>
                        <button
                          id="nav-register-new-company-btn"
                          onClick={() => {
                            setShowUserMenu(false);
                            navigate('/register-company');
                          }}
                          className="w-full text-start px-4 py-2 text-xs text-blue-700 hover:bg-blue-50 transition-colors"
                        >
                          + {t.registerCompanyLink}
                        </button>
                      </>
                    )}

                    <button
                      id="logout-btn"
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                        navigate('/login');
                      }}
                      className="w-full text-start px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors border-t border-slate-100"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{t.logout}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  id="header-courier-login-btn"
                  onClick={() => navigate('/courier-login')}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 hidden sm:inline-flex"
                >
                  {t.courierLoginTitle}
                </button>
                <button
                  id="header-login-btn"
                  onClick={() => navigate('/login')}
                  className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                >
                  {t.loginButton}
                </button>
                <button
                  id="header-register-btn"
                  onClick={() => navigate('/register-company')}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  {t.registerCompanyLink}
                </button>
              </div>
            )}

          </div>

        </div>
      </div>
    </header>
  );
};
