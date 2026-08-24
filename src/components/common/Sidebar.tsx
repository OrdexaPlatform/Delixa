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
  Truck,
  History,
  Coins,
  Banknote
} from 'lucide-react';

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
    <div className="flex flex-col h-full bg-slate-900 text-slate-300 w-64 border-e border-slate-800">
      
      {/* Mobile Header Inside Sidebar */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
            <Truck className="w-4 h-4" />
          </div>
          <span className="font-bold text-white text-lg">Delixa</span>
        </div>
        <button
          onClick={onCloseMobile}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tenant info card */}
      <div className="p-4 m-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{isAdmin ? t.roleAdmin : t.roleCourier}</span>
        </div>
        <p className="font-bold text-white text-sm mt-1 truncate">
          {session.company.name}
        </p>
        <p className="text-xs text-slate-400 truncate mt-0.5">
          {session.profile.full_name}
        </p>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentPath === item.path;

          return (
            <button
              key={item.id}
              id={item.id}
              onClick={() => handleNav(item.path)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-bold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                <span>{item.label}</span>
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

      {/* Footer isolation indicator */}
      <div className="p-4 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1">
        <div className="flex items-center justify-between text-slate-400 font-mono">
          <span>Tenant ID:</span>
          <span className="text-slate-300 font-bold">
            {session.company.id.substring(0, 8)}...
          </span>
        </div>
        <p className="text-[10px] text-slate-400 leading-tight">
          {t.multiTenantDesc}
        </p>
      </div>

    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="hidden lg:block sticky top-16 h-[calc(100vh-4rem)] shrink-0">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            id="mobile-sidebar-backdrop"
            onClick={onCloseMobile}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
          />
          <div className="relative z-10 flex-1 max-w-xs w-full">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
