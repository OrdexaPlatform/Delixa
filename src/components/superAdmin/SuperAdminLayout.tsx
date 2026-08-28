import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Building2,
  Layers,
  CreditCard,
  Radio,
  BarChart3,
  Users2,
  FileText,
  Activity,
  Settings,
  LogOut,
  Search,
  Menu,
  X,
  AlertTriangle,
  Shield,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { useSuperAdmin } from '../../contexts/SuperAdminContext';
import { DelixaLogo } from '../common/DelixaLogo';
import { GlobalSearchModal } from './GlobalSearchModal';
import { safeFetchJson } from '../../utils/apiClient';

interface SuperAdminLayoutProps {
  children: React.ReactNode;
  activePath: string;
  onNavigate: (path: string) => void;
}

export const SuperAdminLayout: React.FC<SuperAdminLayoutProps> = ({
  children,
  activePath,
  onNavigate,
}) => {
  const { admin, logout, token } = useSuperAdmin();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [onlineCount, setOnlineCount] = useState<number>(0);
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Poll online presence and platform settings
  useEffect(() => {
    let isMounted = true;
    const fetchStatus = async () => {
      if (!token) return;
      try {
        const [presRes, setRes] = await Promise.all([
          safeFetchJson<any>('/api/super-admin/presence', { headers: { Authorization: `Bearer ${token}` } }),
          safeFetchJson<any>('/api/platform/public-settings'),
        ]);

        if (presRes.ok && presRes.data?.success && isMounted) {
          setOnlineCount(presRes.data.onlineCount || 0);
        }

        if (setRes.ok && setRes.data?.success && setRes.data?.settings && isMounted) {
          setMaintenanceMode(Boolean(setRes.data.settings.maintenance_mode));
        }
      } catch {
        // silent
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 25000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [token]);

  // Keyboard shortcut Ctrl+K / Cmd+K for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navItems = [
    {
      id: 'nav-dashboard',
      label: 'نظرة عامة',
      path: '/super-admin/dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'nav-companies',
      label: 'شركات الشحن',
      path: '/super-admin/companies',
      icon: Building2,
    },
    {
      id: 'nav-subscriptions',
      label: 'الباقات والاشتراكات',
      path: '/super-admin/subscriptions',
      icon: Layers,
    },
    {
      id: 'nav-payments',
      label: 'المدفوعات والإيرادات',
      path: '/super-admin/payments',
      icon: CreditCard,
    },
    {
      id: 'nav-online',
      label: 'الشركات النشطة الآن',
      path: '/super-admin/online',
      icon: Radio,
      badge: onlineCount > 0 ? `${onlineCount} نشطة` : undefined,
      badgeColor: 'bg-emerald-500 text-white',
    },
    {
      id: 'nav-analytics',
      label: 'تحليلات المنصة',
      path: '/super-admin/analytics',
      icon: BarChart3,
    },
    {
      id: 'nav-staff',
      label: 'فريق العمل والصلاحيات',
      path: '/super-admin/staff',
      icon: Users2,
    },
    {
      id: 'nav-activity',
      label: 'سجل العمليات والتدقيق',
      path: '/super-admin/activity',
      icon: FileText,
    },
    {
      id: 'nav-health',
      label: 'صحة النظام والخدمات',
      path: '/super-admin/health',
      icon: Activity,
    },
    {
      id: 'nav-settings',
      label: 'إعدادات المنصة',
      path: '/super-admin/settings',
      icon: Settings,
    },
  ];

  const getRoleLabel = (role: string = '') => {
    switch (role) {
      case 'super_admin':
        return 'المالك الرئيسي (Super Admin)';
      case 'finance':
        return 'الإدارة المالية (Finance)';
      case 'support':
        return 'الدعم الفني (Support)';
      case 'operations':
        return 'العمليات والتشغيل';
      default:
        return 'موظف منصة';
    }
  };

  return (
    <div id="super-admin-root" className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col antialiased selection:bg-blue-600 selection:text-white" dir="rtl">
      {/* Maintenance Mode Alert Banner */}
      {maintenanceMode && (
        <div id="super-admin-maintenance-banner" className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md z-50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>وضع الصيانة مفعّل حالياً للمنصة بالكامل. المستخدمون العاديون لا يمكنهم تصفح النظام.</span>
          </div>
          <button
            onClick={() => onNavigate('/super-admin/settings')}
            className="underline hover:opacity-80 text-xs font-semibold"
          >
            تعديل من الإعدادات
          </button>
        </div>
      )}

      {/* Main Topbar */}
      <header id="super-admin-header" className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button
            id="super-admin-mobile-toggle"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center cursor-pointer" onClick={() => onNavigate('/super-admin/dashboard')}>
            <DelixaLogo size="sm" theme="dark" variant="full" badgeText="SUPER ADMIN" />
          </div>
        </div>

        {/* Header Action Items */}
        <div className="flex items-center gap-3">
          {/* Global Search Trigger */}
          <button
            id="super-admin-search-trigger"
            onClick={() => setSearchOpen(true)}
            className="hidden sm:flex items-center gap-3 bg-slate-800/80 hover:bg-slate-800 text-slate-300 px-3.5 py-1.5 rounded-xl border border-slate-700/60 text-xs transition"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">بحث عام في المنصة...</span>
            <kbd className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700 text-slate-400">
              Ctrl+K
            </kbd>
          </button>

          <button
            id="super-admin-search-trigger-mobile"
            onClick={() => setSearchOpen(true)}
            className="sm:hidden p-2 bg-slate-800 text-slate-300 rounded-lg border border-slate-700"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Live Online Pulse Indicator */}
          <button
            id="super-admin-live-pulse-btn"
            onClick={() => onNavigate('/super-admin/online')}
            className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-800/50 text-emerald-400 px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-emerald-950/70 transition"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>{onlineCount} متصل</span>
          </button>

          {/* Platform Portal Quick link */}
          <a
            id="super-admin-preview-website-link"
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            title="فتح الواجهة العامة للمنصة في تبويب جديد"
            className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-800/60 transition"
          >
            <span>عرض المنصة</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              id="super-admin-profile-btn"
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-800 text-right transition"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm">
                <Shield className="w-4 h-4 text-blue-400" />
              </div>
              <div className="hidden lg:block text-right">
                <div className="text-xs font-bold text-white leading-tight">{admin?.full_name || 'مدير المنصة'}</div>
                <div className="text-[10px] text-slate-400 leading-tight">{admin?.username}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {profileDropdownOpen && (
              <div
                id="super-admin-profile-menu"
                className="absolute left-0 mt-2 w-56 bg-slate-900 rounded-xl shadow-2xl border border-slate-800 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
              >
                <div className="p-2 border-b border-slate-800 mb-1">
                  <div className="text-xs font-bold text-white">{admin?.full_name}</div>
                  <div className="text-[11px] text-blue-400 font-medium">{getRoleLabel(admin?.role)}</div>
                </div>
                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    onNavigate('/super-admin/settings');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-slate-800 text-right transition"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                  <span>إعدادات الحساب والمنصة</span>
                </button>
                <button
                  onClick={async () => {
                    setProfileDropdownOpen(false);
                    await logout();
                    onNavigate('/super-admin/login');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-rose-400 hover:bg-rose-950/40 text-right transition mt-1"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span>تسجيل الخروج</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <aside
          id="super-admin-sidebar"
          className={`fixed lg:static inset-y-0 right-0 z-40 w-64 bg-slate-900/95 lg:bg-slate-900 border-l border-slate-800 flex flex-col transition-transform duration-200 ease-in-out ${
            mobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
          }`}
        >
          <div className="p-4 flex-1 overflow-y-auto space-y-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">
              القائمة الرئيسية
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePath === item.path || activePath.startsWith(item.path + '/');
              return (
                <button
                  key={item.id}
                  id={item.id}
                  onClick={() => {
                    onNavigate(item.path);
                    setMobileOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition text-right ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${item.badgeColor || 'bg-slate-800 text-slate-300'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/40">
            <button
              id="super-admin-logout-sidebar-btn"
              onClick={async () => {
                await logout();
                onNavigate('/super-admin/login');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/30 transition text-right"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج من المنصة</span>
            </button>
          </div>
        </aside>

        {/* Backdrop for mobile */}
        {mobileOpen && (
          <div
            id="super-admin-mobile-backdrop"
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-slate-950/80 z-30 lg:hidden"
          />
        )}

        {/* Content Area */}
        <main id="super-admin-main-content" className="flex-1 overflow-y-auto bg-slate-950 p-4 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={onNavigate}
      />
    </div>
  );
};
