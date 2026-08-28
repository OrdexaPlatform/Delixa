import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ToastProvider } from './contexts/ToastContext';
import { SuperAdminProvider, useSuperAdmin } from './contexts/SuperAdminContext';
import { usePlatformTracker } from './utils/platformTracker';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { AdminRouteGuard } from './components/auth/AdminRouteGuard';
import { CourierRouteGuard } from './components/auth/CourierRouteGuard';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { safeFetchJson } from './utils/apiClient';

// Super Admin Components & Pages
import { SuperAdminRouteGuard } from './components/superAdmin/SuperAdminRouteGuard';
import { SuperAdminLayout } from './components/superAdmin/SuperAdminLayout';
import { SuperAdminLoginPage } from './pages/superAdmin/SuperAdminLoginPage';
import { SuperAdminDashboardPage } from './pages/superAdmin/SuperAdminDashboardPage';
import { SuperAdminCompaniesPage } from './pages/superAdmin/SuperAdminCompaniesPage';
import { SuperAdminCompanyDetailPage } from './pages/superAdmin/SuperAdminCompanyDetailPage';
import { SuperAdminSubscriptionsPage } from './pages/superAdmin/SuperAdminSubscriptionsPage';
import { SuperAdminPaymentsPage } from './pages/superAdmin/SuperAdminPaymentsPage';
import { SuperAdminOnlinePage } from './pages/superAdmin/SuperAdminOnlinePage';
import { SuperAdminAnalyticsPage } from './pages/superAdmin/SuperAdminAnalyticsPage';
import { SuperAdminStaffPage } from './pages/superAdmin/SuperAdminStaffPage';
import { SuperAdminActivityPage } from './pages/superAdmin/SuperAdminActivityPage';
import { SuperAdminHealthPage } from './pages/superAdmin/SuperAdminHealthPage';
import { SuperAdminSettingsPage } from './pages/superAdmin/SuperAdminSettingsPage';
import { MaintenanceModeView } from './components/MaintenanceModeView';

// Regular Shipping Company & Courier Pages
import { LandingPage } from './pages/LandingPage';
import { RegisterCompanyPage } from './pages/auth/RegisterCompanyPage';
import { AdminLoginPage } from './pages/auth/AdminLoginPage';
import { CourierLoginPage } from './pages/auth/CourierLoginPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { CustomerShipmentPage } from './pages/public/CustomerShipmentPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { MerchantsPage } from './pages/admin/MerchantsPage';
import { CouriersPage } from './pages/admin/CouriersPage';
import { OrdersFoundationPage } from './pages/admin/OrdersFoundationPage';
import { ReturnsPage } from './pages/admin/ReturnsPage';
import { ReportsPage } from './pages/admin/ReportsPage';
import { ActivityLogPage } from './pages/admin/ActivityLogPage';
import { CollectionsPage } from './pages/admin/CollectionsPage';
import { SettingsPage } from './pages/admin/SettingsPage';
import { CourierDashboardPage } from './pages/courier/CourierDashboardPage';
import { CourierOrdersPage } from './pages/courier/CourierOrdersPage';
import { CourierOrderDetailPage } from './pages/courier/CourierOrderDetailPage';

const AppRouter: React.FC = () => {
  const { adminSession, courierSession, loading } = useAuth();
  const { session: superAdminSession } = useSuperAdmin();
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [platformSettings, setPlatformSettings] = useState<{
    maintenance_mode?: boolean;
    maintenance_message?: string;
    support_email?: string;
    support_phone?: string;
  }>({});

  const navigate = (path: string) => {
    setMobileMenuOpen(false);
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Determine current active company & user role for analytics/presence heartbeat
  const currentCompanyId = adminSession?.company?.id || courierSession?.company?.id || null;
  const currentCompanyName = adminSession?.company?.name || courierSession?.company?.name || null;
  const currentRole = adminSession ? 'admin' : courierSession ? 'courier' : 'visitor';

  // Initialize Platform Analytics & Presence Heartbeat Tracker
  usePlatformTracker({
    companyId: currentCompanyId,
    companyName: currentCompanyName,
    userRole: currentRole,
    currentPath,
  });

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Fetch Public Platform Settings (for maintenance mode check)
  useEffect(() => {
    safeFetchJson<any>('/api/platform/public-settings')
      .then(({ ok, data }) => {
        if (ok && data?.success && data?.settings) {
          setPlatformSettings(data.settings);
        }
      })
      .catch(() => {});
  }, [currentPath]);

  // Isolated redirect for regular company/courier login screens
  useEffect(() => {
    if (!loading) {
      const isAdminLogin = currentPath === '/login' || currentPath === '/login/admin' || currentPath === '/admin-login';
      const isCourierLogin = currentPath === '/login/courier' || currentPath === '/courier-login';

      if (isAdminLogin && adminSession && adminSession.profile.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (isCourierLogin && courierSession && courierSession.profile.role === 'courier') {
        navigate('/courier/dashboard');
      }
    }
  }, [adminSession, courierSession, loading, currentPath]);

  // -------------------------------------------------------------
  // SUPER ADMIN ROUTES (Completely Isolated Platform Management)
  // -------------------------------------------------------------
  if (currentPath.startsWith('/super-admin')) {
    if (currentPath === '/super-admin' || currentPath === '/super-admin/login') {
      if (superAdminSession) {
        return (
          <SuperAdminLayout activePath="/super-admin/dashboard" onNavigate={navigate}>
            <SuperAdminDashboardPage onNavigate={navigate} />
          </SuperAdminLayout>
        );
      }
      return <SuperAdminLoginPage onNavigate={navigate} />;
    }

    return (
      <SuperAdminRouteGuard onNavigate={navigate}>
        <SuperAdminLayout activePath={currentPath} onNavigate={navigate}>
          {currentPath === '/super-admin/dashboard' && <SuperAdminDashboardPage onNavigate={navigate} />}
          {currentPath === '/super-admin/companies' && <SuperAdminCompaniesPage onNavigate={navigate} />}
          {currentPath.startsWith('/super-admin/companies/') && (
            <SuperAdminCompanyDetailPage
              companyId={currentPath.replace('/super-admin/companies/', '').split('?')[0]}
              onNavigate={navigate}
            />
          )}
          {currentPath === '/super-admin/subscriptions' && <SuperAdminSubscriptionsPage onNavigate={navigate} />}
          {currentPath === '/super-admin/payments' && <SuperAdminPaymentsPage onNavigate={navigate} />}
          {currentPath === '/super-admin/online' && <SuperAdminOnlinePage onNavigate={navigate} />}
          {currentPath === '/super-admin/analytics' && <SuperAdminAnalyticsPage onNavigate={navigate} />}
          {currentPath === '/super-admin/staff' && <SuperAdminStaffPage onNavigate={navigate} />}
          {currentPath === '/super-admin/activity' && <SuperAdminActivityPage onNavigate={navigate} />}
          {currentPath === '/super-admin/health' && <SuperAdminHealthPage onNavigate={navigate} />}
          {currentPath === '/super-admin/settings' && <SuperAdminSettingsPage onNavigate={navigate} />}
        </SuperAdminLayout>
      </SuperAdminRouteGuard>
    );
  }

  // -------------------------------------------------------------
  // MAINTENANCE MODE CHECK (For regular visitors/companies)
  // -------------------------------------------------------------
  if (platformSettings.maintenance_mode && !superAdminSession) {
    return (
      <MaintenanceModeView
        message={platformSettings.maintenance_message}
        supportEmail={platformSettings.support_email}
        supportPhone={platformSettings.support_phone}
        onGoToSuperAdmin={() => navigate('/super-admin/login')}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-slate-500">جاري تحميل نظام Delixa...</span>
        </div>
      </div>
    );
  }

  // 1. Public Customer Tracking & Confirmation Pages (/c/:token, /s/:token, /track/:token, /confirm/:token)
  if (
    currentPath.startsWith('/c/') ||
    currentPath.startsWith('/s/') ||
    currentPath.startsWith('/confirm/') ||
    currentPath.startsWith('/track/')
  ) {
    const token = currentPath.replace(/^\/(c|s|confirm|track)\//, '').split('?')[0];
    return <CustomerShipmentPage token={token} navigate={navigate} />;
  }
  if (
    currentPath === '/c' ||
    currentPath === '/s' ||
    currentPath === '/confirm' ||
    currentPath === '/track'
  ) {
    return <CustomerShipmentPage token="" navigate={navigate} />;
  }

  // 2. Landing & Registration Pages
  if (currentPath === '/' || currentPath === '') {
    return <LandingPage navigate={navigate} />;
  }
  if (currentPath === '/register' || currentPath === '/register-company') {
    return <RegisterCompanyPage navigate={navigate} />;
  }
  if (currentPath === '/forgot-password') {
    return <ForgotPasswordPage navigate={navigate} />;
  }

  // 3. Dedicated Login Pages
  if (currentPath === '/login' || currentPath === '/login/admin' || currentPath === '/admin-login') {
    return <AdminLoginPage navigate={navigate} />;
  }
  if (currentPath === '/login/courier' || currentPath === '/courier-login') {
    return <CourierLoginPage navigate={navigate} />;
  }

  // 4. Authenticated Application Layout with Header & Sidebar
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      <Header 
        navigate={navigate} 
        currentPath={currentPath} 
        onToggleMobileMenu={() => setMobileMenuOpen(prev => !prev)} 
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 gap-6">
        {/* Desktop & Mobile Responsive Sidebar */}
        <Sidebar 
          currentPath={currentPath} 
          navigate={navigate} 
          mobileOpen={mobileMenuOpen} 
          onCloseMobile={() => setMobileMenuOpen(false)} 
        />

        {/* Dynamic Main Workspace Content */}
        <main className="flex-1 min-w-0 pb-16 md:pb-6">
          {/* Admin Routes with Strict AdminRouteGuard */}
          {(currentPath === '/dashboard' || currentPath === '/admin/dashboard') && (
            <AdminRouteGuard navigate={navigate}>
              <AdminDashboardPage navigate={navigate} />
            </AdminRouteGuard>
          )}

          {currentPath === '/merchants' && (
            <AdminRouteGuard navigate={navigate}>
              <MerchantsPage />
            </AdminRouteGuard>
          )}

          {currentPath === '/couriers' && (
            <AdminRouteGuard navigate={navigate}>
              <CouriersPage />
            </AdminRouteGuard>
          )}

          {currentPath === '/orders' && (
            <AdminRouteGuard navigate={navigate}>
              <OrdersFoundationPage />
            </AdminRouteGuard>
          )}

          {(currentPath === '/collections' || currentPath === '/admin/collections') && (
            <AdminRouteGuard navigate={navigate}>
              <CollectionsPage navigate={navigate} />
            </AdminRouteGuard>
          )}

          {currentPath === '/returns' && (
            <AdminRouteGuard navigate={navigate}>
              <ReturnsPage />
            </AdminRouteGuard>
          )}

          {currentPath === '/reports' && (
            <AdminRouteGuard navigate={navigate}>
              <ReportsPage />
            </AdminRouteGuard>
          )}

          {currentPath === '/activity' && (
            <AdminRouteGuard navigate={navigate}>
              <ActivityLogPage navigate={navigate} />
            </AdminRouteGuard>
          )}

          {currentPath === '/settings' && (
            <AdminRouteGuard navigate={navigate}>
              <SettingsPage />
            </AdminRouteGuard>
          )}

          {/* Courier Routes with Strict CourierRouteGuard */}
          {currentPath === '/courier/dashboard' && (
            <CourierRouteGuard navigate={navigate}>
              <CourierDashboardPage navigate={navigate} />
            </CourierRouteGuard>
          )}

          {currentPath === '/courier/orders' && (
            <CourierRouteGuard navigate={navigate}>
              <CourierOrdersPage navigate={navigate} />
            </CourierRouteGuard>
          )}

          {currentPath === '/courier/returns' && (
            <CourierRouteGuard navigate={navigate}>
              <ReturnsPage />
            </CourierRouteGuard>
          )}

          {currentPath.startsWith('/courier/orders/') && (
            <CourierRouteGuard navigate={navigate}>
              <CourierOrderDetailPage
                orderId={currentPath.replace('/courier/orders/', '').split('?')[0]}
                navigate={navigate}
              />
            </CourierRouteGuard>
          )}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <ToastProvider>
          <AuthProvider>
            <SuperAdminProvider>
              <AppRouter />
            </SuperAdminProvider>
          </AuthProvider>
        </ToastProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}
