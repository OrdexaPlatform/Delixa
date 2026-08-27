import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  LayoutDashboard,
  Store,
  Users,
  Package,
  RotateCcw,
  BarChart3,
  Settings,
  ShieldCheck,
  PackageCheck,
  X,
  History,
  Banknote
} from 'lucide-react';
import { DelixaLogo } from './DelixaLogo';

interface SidebarProps {
  currentPath: string;
  navigate: (path: string) => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  id: string;
  path: string;
  label: string;
  icon: React.ElementType;
  badge?: string | number;
  comingSoon?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  navigate,
  mobileOpen = false,
  onCloseMobile,
}) => {
  const { session } = useAuth();
  const { t } = useLanguage();

  if (!session) return null;

  const isAdmin = session.profile.role === 'admin';

  const adminNavItems: NavItem[] = [
    {
      id: 'nav-dashboard',
      path: '/dashboard',
      label: t.navDashboard,
      icon: LayoutDashboard,
    },
    {
      id: 'nav-orders',
      path: '/orders',
      label: t.navOrders,
      icon: Package,
    },
    {
      id: 'nav-collections',
      path: '/collections',
      label: t.navCollections || 'تحصيلات المناديب',
      icon: Banknote,
    },
    {
      id: 'nav-merchants',
      path: '/merchants',
      label: t.navMerchants,
      icon: Store,
    },
    {
      id: 'nav-couriers',
      path: '/couriers',
      label: t.navCouriers,
      icon: Users,
    },
    {
      id: 'nav-returns',
      path: '/returns',
      label: t.navReturns,
      icon: RotateCcw,
    },
    {
      id: 'nav-reports',
      path: '/reports',
      label: t.navReports,
      icon: BarChart3,
    },
    {
      id: 'nav-activity',
      path: '/activity',
      label: t.navActivity || 'سجل النشاطات',
      icon: History,
    },
    {
      id: 'nav-settings',
      path: '/settings',
      label: t.navSettings,
      icon: Settings,
    },
  ];

  const courierNavItems: NavItem[] = [
    {
      id: 'nav-courier-dashboard',
      path: '/courier/dashboard',
      label: t.navDashboard,
      icon: LayoutDashboard,
    },
    {
      id: 'nav-courier-orders',
      path: '/courier/orders',
      label: t.todayDeliveries,
      icon: PackageCheck,
    },
    {
      id: 'nav-courier-returns',
      path: '/courier/returns',
      label: t.navReturns || 'المرتجعات المسندة',
      icon: RotateCcw,
    },
  ];

  const navItems = isAdmin ? adminNavItems : courierNavItems;

  const handleNav = (path: string) => {
    navigate(path);
    if (onCloseMobile) onCloseMobile();
  };

  const content = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200 w-64 border-e border-slate-800/90 shadow-xl select-none">
      
      {/* Mobile Drawer Header with Logo & Close Button */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-slate-800/80 bg-slate-950/40">
        <DelixaLogo size="sm" theme="dark" variant="full" badgeText="EG" />
        <button
          onClick={onCloseMobile}
          className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
          aria-label="إغلاق القائمة"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tenant Context Badge */}
      <div className="p-3.5 m-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-xs">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-blue-400 uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isAdmin ? t.roleAdmin : t.roleCourier}</span>
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 font-mono">
            {session.company.id.substring(0, 6)}
          </span>
        </div>
        <p className="font-extrabold text-white text-sm mt-1.5 truncate">
          {session.company.name}
        </p>
        <p className="text-xs text-slate-400 truncate mt-0.5">
          {session.profile.full_name}
        </p>
      </div>

      {/* Main Navigation Items */}
      <nav className="flex-1 px-3 py-1.5 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 py-1">
          {isAdmin ? 'إدارة العمليات واللوجستيات' : 'قائمة المندوب'}
        </div>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentPath === item.path || (item.path !== '/dashboard' && item.path !== '/courier/dashboard' && currentPath.startsWith(item.path));

          return (
            <button
              key={item.id}
              id={item.id}
              onClick={() => handleNav(item.path)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all min-h-[44px] cursor-pointer group text-start ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 font-bold'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform ${
                    isActive ? 'text-white scale-105' : 'text-slate-400 group-hover:text-blue-300'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {item.comingSoon && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  {t.comingSoon}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/30 text-[11px] text-slate-400 space-y-1">
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
          <span>حالة النظام:</span>
          <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            متصل ومؤمن
          </span>
        </div>
        <p className="text-[10px] text-slate-400 leading-tight">
          DELIXA SaaS Multi-Tenant Platform
        </p>
      </div>

    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sticky Sidebar */}
      <aside className="hidden lg:block sticky top-20 h-[calc(100vh-6rem)] shrink-0 rounded-2xl overflow-hidden shadow-sm">
        {content}
      </aside>

      {/* Mobile Backdrop & Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex" dir="rtl">
          <div
            id="mobile-sidebar-backdrop"
            onClick={onCloseMobile}
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs transition-opacity animate-in fade-in"
          />
          <div className="relative z-10 flex-1 max-w-[280px] w-full animate-in slide-in-from-right duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
