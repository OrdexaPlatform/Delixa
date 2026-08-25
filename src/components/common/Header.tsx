import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { 
  Building2, 
  Globe, 
  LogOut, 
  ShieldCheck, 
  Truck, 
  ChevronDown, 
  Menu,
  Sparkles,
  ArrowRightLeft,
  RotateCcw
} from 'lucide-react';
import { NotificationCenter } from './NotificationCenter';

interface HeaderProps {
  onToggleMobileMenu?: () => void;
  currentPath: string;
  navigate: (path: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu, currentPath, navigate }) => {
  const { session, logout, loginDemoUser, resetDemoData, sessionMode } = useAuth();
  const { language, setLanguage, t, isRTL } = useLanguage();
  const { showToast } = useToast();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showDemoSwitcher, setShowDemoSwitcher] = useState(false);

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  const isDemo = session?.mode === 'demo' || sessionMode === 'demo';

  const handleSwitchDemo = async (role: 'admin' | 'courier', empId?: string, label?: string) => {
    setShowDemoSwitcher(false);
    const res = await loginDemoUser(role, empId);
    if (res.success) {
      showToast('success', 'تم التبديل بنجاح', label || 'الحساب التجريبي');
      if (role === 'admin') {
        navigate('/dashboard');
      } else {
        navigate('/courier/dashboard');
      }
    }
  };

  const handleResetDemo = () => {
    setShowDemoSwitcher(false);
    resetDemoData();
    showToast('info', 'تمت استعادة البيانات الافتراضية', 'تمت استعادة بيانات الحساب التجريبي إلى حالتها الأصلية');
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

            {/* Active Company & Session Mode Badge */}
            {session && (
              <div className="hidden md:flex items-center gap-2 ms-4 px-3 py-1.5 bg-slate-100/80 rounded-lg border border-slate-200/80 text-xs">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-semibold text-slate-700 max-w-[180px] truncate">
                  {session.company.name}
                </span>
                {isDemo ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded">
                    <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                    <span>حساب تجريبي (Demo)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 rounded">
                    Supabase Live
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right: Quick actions, Language toggle, Multi-Tenant switcher, Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Quick Demo Switcher Dropdown */}
            <div className="relative">
              <button
                id="demo-switcher-btn"
                onClick={() => setShowDemoSwitcher(!showDemoSwitcher)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
                title="التبديل بين الحسابات التجريبية"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">الحسابات التجريبية (Demo)</span>
              </button>

              {showDemoSwitcher && (
                <div 
                  id="demo-switcher-dropdown"
                  className="absolute end-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 text-xs"
                >
                  <div className="px-3 py-1.5 border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] flex items-center justify-between">
                    <span>حسابات العرض والتجربة السريعة</span>
                    <Sparkles className="w-3 h-3 text-amber-500" />
                  </div>

                  {/* 1. Demo Company Admin */}
                  <button
                    id="demo-switch-company-admin"
                    onClick={() => handleSwitchDemo('admin', undefined, 'شركة كايرو إكسبريس (المدير التجريبي)')}
                    className="w-full text-start px-3 py-2 text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex flex-col transition-colors cursor-pointer"
                  >
                    <span className="font-bold">🏢 شركة كايرو إكسبريس (المدير التجريبي)</span>
                    <span className="text-[11px] text-slate-500">لوحة تحكم الشركة وإدارة الشحنات والتجار</span>
                  </button>

                  {/* 2. Demo Courier 1 */}
                  <button
                    id="demo-switch-courier-1"
                    onClick={() => handleSwitchDemo('courier', 'CR-101', 'كريم عادل (مندوب المعادي)')}
                    className="w-full text-start px-3 py-2 text-emerald-800 hover:bg-emerald-50 flex flex-col transition-colors border-t border-slate-100 cursor-pointer"
                  >
                    <span className="font-bold">🚚 مندوب 1: كريم عادل (CR-101)</span>
                    <span className="text-[11px] text-emerald-600">منطقة المعادي ودار السلام</span>
                  </button>

                  {/* 3. Demo Courier 2 */}
                  <button
                    id="demo-switch-courier-2"
                    onClick={() => handleSwitchDemo('courier', 'CR-102', 'محمود حسن (مندوب نصر والتجمع)')}
                    className="w-full text-start px-3 py-2 text-emerald-800 hover:bg-emerald-50 flex flex-col transition-colors border-t border-slate-100 cursor-pointer"
                  >
                    <span className="font-bold">🚚 مندوب 2: محمود حسن (CR-102)</span>
                    <span className="text-[11px] text-emerald-600">منطقة مدينة نصر والتجمع الخامس</span>
                  </button>

                  {/* 4. Demo Courier 3 */}
                  <button
                    id="demo-switch-courier-3"
                    onClick={() => handleSwitchDemo('courier', 'CR-103', 'أحمد سامي (مندوب الجيزة)')}
                    className="w-full text-start px-3 py-2 text-emerald-800 hover:bg-emerald-50 flex flex-col transition-colors border-t border-slate-100 cursor-pointer"
                  >
                    <span className="font-bold">🚚 مندوب 3: أحمد سامي (CR-103)</span>
                    <span className="text-[11px] text-emerald-600">منطقة الجيزة والدقي والمهندسين</span>
                  </button>

                  {/* Reset Demo Database */}
                  <button
                    id="demo-reset-btn"
                    onClick={handleResetDemo}
                    className="w-full text-start px-3 py-2 text-amber-800 bg-amber-50/60 hover:bg-amber-100 flex items-center justify-between transition-colors border-t border-slate-200 cursor-pointer"
                  >
                    <span className="font-bold flex items-center gap-1">
                      <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                      <span>إعادة تعيين البيانات التجريبية</span>
                    </span>
                    <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-mono">Reset</span>
                  </button>

                  {/* Register New Real Company */}
                  <button
                    id="demo-create-new-company"
                    onClick={() => {
                      setShowDemoSwitcher(false);
                      navigate('/register-company');
                    }}
                    className="w-full text-start px-3 py-2 text-blue-700 bg-blue-50/50 hover:bg-blue-100/70 flex flex-col transition-colors border-t border-slate-200 cursor-pointer"
                  >
                    <span className="font-bold flex items-center gap-1">
                      <span>+ تسجيل شركة شحن حقيقية (Supabase)</span>
                    </span>
                    <span className="text-[11px] text-blue-600">إنشاء حساب شركة شحن حقيقي مع عزل RLS كامل</span>
                  </button>
                </div>
              )}
            </div>

            {/* Language Switcher */}
            <button
              id="language-toggle-btn"
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors border border-slate-200 cursor-pointer"
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
                  className="flex items-center gap-2 p-1.5 pe-3 text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all cursor-pointer"
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
                          className="w-full text-start px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors cursor-pointer"
                        >
                          {t.navSettings}
                        </button>
                        <button
                          id="nav-register-new-company-btn"
                          onClick={() => {
                            setShowUserMenu(false);
                            navigate('/register-company');
                          }}
                          className="w-full text-start px-4 py-2 text-xs text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
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
                      className="w-full text-start px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors border-t border-slate-100 cursor-pointer"
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
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 hidden sm:inline-flex cursor-pointer"
                >
                  {t.courierLoginTitle}
                </button>
                <button
                  id="header-login-btn"
                  onClick={() => navigate('/login')}
                  className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 cursor-pointer"
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
