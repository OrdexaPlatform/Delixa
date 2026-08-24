import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { ToastProvider } from './contexts/ToastContext';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Pages
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
  const { session, loading } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // When session loads, intelligently route authenticated users if on login/courier-login
  useEffect(() => {
    if (!loading && session) {
      if (currentPath === '/login' || currentPath === '/courier-login') {
        if (session.profile.role === 'admin') {
          navigate('/dashboard');
        } else if (session.profile.role === 'courier') {
          navigate('/courier/dashboard');
        }
      }
    }
  }, [session, loading]);

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

  // Public Layouts
  if (currentPath.startsWith('/s/') || currentPath.startsWith('/track/')) {
    const token = currentPath.replace(/^\/(s|track)\//, '').split('?')[0];
    return <CustomerShipmentPage token={token} navigate={navigate} />;
  }
  if (currentPath === '/s' || currentPath === '/track') {
    return <CustomerShipmentPage token="" navigate={navigate} />;
  }
  if (currentPath === '/' || currentPath === '') {
    return <LandingPage navigate={navigate} />;
  }
  if (currentPath === '/register' || currentPath === '/register-company') {
    return <RegisterCompanyPage navigate={navigate} />;
  }
  if (currentPath === '/login' || currentPath === '/admin-login') {
    return <AdminLoginPage navigate={navigate} />;
  }
  if (currentPath === '/courier-login') {
    return <CourierLoginPage navigate={navigate} />;
  }
  if (currentPath === '/forgot-password') {
    return <ForgotPasswordPage navigate={navigate} />;
  }

  // App Layout with Header and Sidebar for authenticated users
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header navigate={navigate} currentPath={currentPath} />

      <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6">
        
        {/* Persistent Sidebar */}
        <div className="hidden md:block w-60 shrink-0">
          <Sidebar currentPath={currentPath} navigate={navigate} />
        </div>

        {/* Dynamic Main Workspace Content */}
        <main className="flex-1 min-w-0">
          {/* Admin Routes */}
          {(currentPath === '/dashboard' || currentPath === '/admin/dashboard') && (
            <ProtectedRoute requiredRole="admin" navigate={navigate}>
              <AdminDashboardPage navigate={navigate} />
            </ProtectedRoute>
          )}

          {currentPath === '/merchants' && (
            <ProtectedRoute requiredRole="admin" navigate={navigate}>
              <MerchantsPage />
            </ProtectedRoute>
          )}

          {currentPath === '/couriers' && (
            <ProtectedRoute requiredRole="admin" navigate={navigate}>
              <CouriersPage />
            </ProtectedRoute>
          )}

          {currentPath === '/orders' && (
            <ProtectedRoute requiredRole="admin" navigate={navigate}>
              <OrdersFoundationPage />
            </ProtectedRoute>
          )}

          {(currentPath === '/collections' || currentPath === '/admin/collections') && (
            <ProtectedRoute requiredRole="admin" navigate={navigate}>
              <CollectionsPage navigate={navigate} />
            </ProtectedRoute>
          )}

          {currentPath === '/returns' && (
            <ProtectedRoute requiredRole="admin" navigate={navigate}>
              <ReturnsPage />
            </ProtectedRoute>
          )}

          {currentPath === '/reports' && (
            <ProtectedRoute requiredRole="admin" navigate={navigate}>
              <ReportsPage />
            </ProtectedRoute>
          )}

          {currentPath === '/activity' && (
            <ProtectedRoute requiredRole="admin" navigate={navigate}>
              <ActivityLogPage navigate={navigate} />
            </ProtectedRoute>
          )}

          {currentPath === '/settings' && (
            <ProtectedRoute requiredRole="admin" navigate={navigate}>
              <SettingsPage />
            </ProtectedRoute>
          )}

          {/* Courier Routes */}
          {currentPath === '/courier/dashboard' && (
            <ProtectedRoute requiredRole="courier" navigate={navigate}>
              <CourierDashboardPage navigate={navigate} />
            </ProtectedRoute>
          )}

          {currentPath === '/courier/orders' && (
            <ProtectedRoute requiredRole="courier" navigate={navigate}>
              <CourierOrdersPage navigate={navigate} />
            </ProtectedRoute>
          )}

          {currentPath === '/courier/returns' && (
            <ProtectedRoute requiredRole="courier" navigate={navigate}>
              <ReturnsPage />
            </ProtectedRoute>
          )}

          {currentPath.startsWith('/courier/orders/') && (
            <ProtectedRoute requiredRole="courier" navigate={navigate}>
              <CourierOrderDetailPage 
                orderId={currentPath.replace('/courier/orders/', '').split('?')[0]} 
                navigate={navigate} 
              />
            </ProtectedRoute>
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
            <AppRouter />
          </AuthProvider>
        </ToastProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}
