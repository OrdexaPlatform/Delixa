import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { db } from '../../lib/db';
import {
  Store,
  Users,
  Package,
  UserCheck,
  Shield,
  Plus,
  ArrowRight,
  ArrowLeft,
  Truck,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  DollarSign,
  TrendingUp,
  BarChart3,
  ExternalLink,
  MessageCircle,
  Sparkles,
  Filter,
  CheckCheck,
  CalendarClock,
  XCircle,
  History,
  Coins,
  Banknote
} from 'lucide-react';
import { Order, Merchant, Courier, OrderEvent } from '../../types';

interface AdminDashboardPageProps {
  navigate: (path: string) => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ navigate }) => {
  const { session } = useAuth();
  const { t, isRTL } = useLanguage();
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  const [metrics, setMetrics] = useState<Awaited<ReturnType<typeof db.getAdminMetrics>> | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [couriersList, setCouriersList] = useState<Courier[]>([]);
  const [merchantsList, setMerchantsList] = useState<Merchant[]>([]);

  const loadData = async () => {
    if (!session) return;
    const companyId = session.company.id;

    // Fetch real metrics from DB
    const [dbMetrics, orders, couriers, merchants] = await Promise.all([
      db.getAdminMetrics(companyId),
      db.getOrders(companyId),
      db.getCouriers(companyId),
      db.getMerchants(companyId),
    ]);

    setMetrics(dbMetrics);
    setRecentOrders(orders.slice(0, 6));
    setCouriersList(couriers);
    setMerchantsList(merchants);
  };

  useEffect(() => {
    loadData();

    const handleSync = () => {
      loadData();
    };

    window.addEventListener('delixa-realtime-order-sync', handleSync);
    window.addEventListener('storage', handleSync);

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('delixa_orders_channel');
      channel.onmessage = () => loadData();
    } catch {
      // BroadcastChannel unsupported fallback
    }

    return () => {
      window.removeEventListener('delixa-realtime-order-sync', handleSync);
      window.removeEventListener('storage', handleSync);
      if (channel) {
        channel.close();
      }
    };
  }, [session]);

  if (!session || !metrics) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-600">جاري تحميل لوحة التحكم...</p>
        </div>
      </div>
    );
  }

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return '';
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

      if (diffMins < 1) return isRTL ? 'الآن' : 'Just now';
      if (diffMins < 60) return isRTL ? `منذ ${diffMins} د` : `${diffMins}m ago`;
      if (diffHours < 24) return isRTL ? `منذ ${diffHours} س` : `${diffHours}h ago`;
      return date.toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* 1. Welcome & Quick Action Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              {session.company.name}
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
              {t.roleAdmin}
            </span>
            <span className="px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md flex items-center gap-1">
              <Shield className="w-3 h-3" />
              <span>مساحة معزولة Multi-Tenant</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            مرحباً {session.profile.full_name}، إليك نظرة تشغيلية شاملة وإحصائيات دقيقة لعمليات الشحن والتوصيل اليوم.
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="dash-create-order-btn"
            onClick={() => navigate('/orders')}
            className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t.createOrderButton}</span>
          </button>

          <button
            id="dash-collections-btn"
            onClick={() => navigate('/collections')}
            className="px-3.5 py-2 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Banknote className="w-4 h-4 text-amber-600" />
            <span>تحصيلات المناديب</span>
          </button>

          <button
            id="dash-create-return-btn"
            onClick={() => navigate('/returns')}
            className="px-3.5 py-2 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-purple-600" />
            <span>تسجيل إرجاع</span>
          </button>

          <button
            id="dash-view-reports-btn"
            onClick={() => navigate('/reports')}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5 border border-slate-200 cursor-pointer"
          >
            <BarChart3 className="w-4 h-4 text-slate-600" />
            <span>التقارير</span>
          </button>
        </div>
      </div>

      {/* 2. Top Primary Operational & Collection Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Outstanding Courier Collections (Prompt 4 Section 19) */}
        <div
          id="kpi-outstanding-collections-dash"
          onClick={() => navigate('/collections')}
          className="bg-white p-5 rounded-2xl border border-amber-200 shadow-xs hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group bg-gradient-to-br from-amber-50/40 via-white to-amber-50/10"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900/80">تحصيلات المناديب المعلقة</span>
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700 group-hover:scale-105 transition-transform">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {metrics.outstandingCourierCollections.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-slate-500">{t.currency}</span>
          </div>
          <div className="mt-2 text-xs text-amber-800 font-semibold flex items-center justify-between">
            <span>{metrics.couriersWithOutstandingCount} {t.couriersWithOutstanding || 'مندوب بحوزتهم نقدية'}</span>
            <span className="text-blue-600 group-hover:underline text-[11px]">تسوية &larr;</span>
          </div>
        </div>

        {/* Total Orders & Delivery Success Rate */}
        <div
          id="kpi-orders-total"
          onClick={() => navigate('/orders')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">إجمالي الشحنات</span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 group-hover:scale-105 transition-transform">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {metrics.totalOrders}
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {metrics.deliverySuccessRate}% تسليم
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>مسلّمة: {metrics.deliveredOrders}</span>
            <span>متعثرة: {metrics.failedOrders}</span>
          </div>
        </div>

        {/* Total COD Collected & Target */}
        <div
          id="kpi-cod-amount"
          onClick={() => navigate('/orders')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">المبالغ المسلمة (COD)</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-105 transition-transform">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-emerald-700 tracking-tight">
              {metrics.deliveredCodAmount.toLocaleString()}
              <span className="text-xs font-bold text-slate-500 ms-1">{t.currency}</span>
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>إجمالي مستهدف: {metrics.totalCodAmount.toLocaleString()} {t.currency}</span>
          </div>
        </div>

        {/* Customer Confirmation Rate */}
        <div
          id="kpi-confirmation-rate"
          onClick={() => navigate('/orders')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">تأكيد استلام العملاء</span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 group-hover:scale-105 transition-transform">
              <CheckCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {metrics.confirmationMetrics.confirmationRate}%
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {metrics.confirmationMetrics.confirmed} مؤكدة
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>تأجيل: {metrics.confirmationMetrics.reschedule_requested}</span>
            <span>إلغاء: {metrics.confirmationMetrics.cancelled}</span>
          </div>
        </div>

        {/* Returns & Courier Fleet */}
        <div
          id="kpi-returns-stat"
          onClick={() => navigate('/returns')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-purple-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">المرتجعات والمناديب</span>
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 group-hover:scale-105 transition-transform">
              <RotateCcw className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {metrics.totalReturns}
              <span className="text-xs font-medium text-slate-500 ms-1">مرتجع</span>
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              {metrics.activeReturns} معلقة
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>المناديب: {metrics.activeCouriers} / {metrics.totalCouriers}</span>
            <span>متاجر: {metrics.activeMerchants}</span>
          </div>
        </div>

      </div>

      {/* 3. Today's Delivery Operational Breakdown (Card Grid) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>ملخص عمليات توصيل اليوم ({new Date().toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', { weekday: 'long', month: 'short', day: 'numeric' })})</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              متابعة فورية ومباشرة لحركة التوزيع وتأكيدات العملاء لليوم الحالي
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 bg-blue-50 text-blue-800 rounded-lg border border-blue-200">
              مجدولة اليوم: {metrics.todayOverview.totalScheduledToday} شحنة
            </span>
            <button
              onClick={() => navigate('/orders')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <span>عرض في الشحنات</span>
              <ArrowIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 5 Today KPI Mini-Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col">
            <span className="text-[11px] font-semibold text-slate-500">إجمالي شحنات اليوم</span>
            <span className="text-2xl font-black text-slate-900 mt-1">
              {metrics.todayOverview.totalScheduledToday}
            </span>
            <span className="text-[10px] text-slate-400 mt-1">مدرجة في جدول اليوم</span>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 flex flex-col">
            <span className="text-[11px] font-semibold text-blue-700">مع المناديب الآن</span>
            <span className="text-2xl font-black text-blue-800 mt-1">
              {metrics.todayOverview.outForDeliveryToday}
            </span>
            <span className="text-[10px] text-blue-600 mt-1">قيد التوصيل في الطريق</span>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-col">
            <span className="text-[11px] font-semibold text-emerald-700">مسلّمة اليوم</span>
            <span className="text-2xl font-black text-emerald-800 mt-1">
              {metrics.todayOverview.deliveredToday}
            </span>
            <span className="text-[10px] text-emerald-600 mt-1">
              نسبة الإنجاز: {metrics.todayOverview.successRateToday}%
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200 flex flex-col">
            <span className="text-[11px] font-semibold text-rose-700">تعثر تسليمها اليوم</span>
            <span className="text-2xl font-black text-rose-800 mt-1">
              {metrics.todayOverview.failedToday}
            </span>
            <span className="text-[10px] text-rose-600 mt-1">تحتاج متابعة وتوجيه</span>
          </div>

          <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200 flex flex-col">
            <span className="text-[11px] font-semibold text-teal-700">أكدها العميل اليوم</span>
            <span className="text-2xl font-black text-teal-800 mt-1">
              {metrics.todayOverview.confirmedToday}
            </span>
            <span className="text-[10px] text-teal-600 mt-1">جاهزة ومؤكدة للاستلام</span>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 flex flex-col">
            <span className="text-[11px] font-semibold text-amber-700">تأجيل مطلوب من العميل</span>
            <span className="text-2xl font-black text-amber-800 mt-1">
              {metrics.todayOverview.rescheduledToday}
            </span>
            <span className="text-[10px] text-amber-600 mt-1">طلبوا موعداً لاحقاً</span>
          </div>

        </div>
      </div>

      {/* 4. Two-Column Row: Courier Performance Table & Top Merchants */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Couriers Performance Board (2 columns wide) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-600" />
                <span>أداء المناديب اليوم وإجمالي التحصيلات (Couriers Performance)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                توزيع الشحنات، نسب الإنجاز والمبالغ المحصلة لكل مندوب
              </p>
            </div>
            <button
              onClick={() => navigate('/couriers')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <span>إدارة المناديب</span>
              <ArrowIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          {metrics.courierPerformance.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl bg-slate-50">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-semibold">{t.noCouriersFound}</p>
              <button
                onClick={() => navigate('/couriers')}
                className="mt-3 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t.addCourierButton}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-[11px] font-bold">
                    <th className="pb-3 text-start">المندوب</th>
                    <th className="pb-3 text-center">المسندة</th>
                    <th className="pb-3 text-center">المسلمة</th>
                    <th className="pb-3 text-center">المتعثرة</th>
                    <th className="pb-3 text-center">نسبة النجاح</th>
                    <th className="pb-3 text-end">التحصيل (COD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics.courierPerformance.map(cp => (
                    <tr key={cp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{cp.name}</span>
                          <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1 py-0.2 rounded border border-slate-200">
                            {cp.employeeId}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{cp.phone}</span>
                      </td>
                      <td className="py-3 text-center font-bold text-slate-700">
                        {cp.assignedCount}
                      </td>
                      <td className="py-3 text-center font-bold text-emerald-600">
                        {cp.deliveredCount}
                      </td>
                      <td className="py-3 text-center font-bold text-rose-600">
                        {cp.failedCount}
                      </td>
                      <td className="py-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            cp.successRate >= 80
                              ? 'bg-emerald-100 text-emerald-800'
                              : cp.successRate >= 50
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {cp.successRate}%
                        </span>
                      </td>
                      <td className="py-3 text-end font-bold text-slate-900 font-mono">
                        {cp.collectedCod.toLocaleString()} {t.currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top Merchant Partners (1 column wide) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Store className="w-4 h-4 text-blue-600" />
                <span>أعلى المتاجر شحناً</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                أداء التجار وحجم الشحنات
              </p>
            </div>
            <button
              onClick={() => navigate('/merchants')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <span>المتاجر</span>
              <ArrowIcon className="w-3 h-3" />
            </button>
          </div>

          {metrics.merchantPerformance.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              لا توجد متاجر نشطة بعد
            </div>
          ) : (
            <div className="space-y-3">
              {metrics.merchantPerformance.slice(0, 5).map(mp => (
                <div
                  key={mp.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs hover:bg-slate-100/70 transition-colors"
                >
                  <div className="min-w-0 flex-1 me-2">
                    <h4 className="font-bold text-slate-900 truncate">{mp.name}</h4>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                      <span>{mp.totalOrders} شحنة</span>
                      <span>•</span>
                      <span className="text-emerald-600 font-semibold">{mp.deliveredOrders} مسلّمة</span>
                    </div>
                  </div>

                  <div className="text-end shrink-0">
                    <span className="font-bold text-slate-900 block font-mono text-[11px]">
                      {mp.totalCod.toLocaleString()} {t.currency}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 inline-block mt-0.5">
                      {mp.successRate}% نجاح
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* 5. Recent Activity Log Feed & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Orders Table (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-600" />
                <span>أحدث الشحنات المسجلة</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                شحنات الشركة والربط المباشر مع المناديب والتجار
              </p>
            </div>
            <button
              onClick={() => navigate('/orders')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <span>عرض جميع الشحنات</span>
              <ArrowIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentOrders.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl bg-slate-50">
              <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-semibold">{t.noOrdersFound}</p>
              <button
                onClick={() => navigate('/orders')}
                className="mt-3 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t.createOrderButton}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-[11px] font-bold">
                    <th className="pb-3 text-start">{t.orderNumber}</th>
                    <th className="pb-3 text-start">{t.customerName}</th>
                    <th className="pb-3 text-start">{t.assignedCourier}</th>
                    <th className="pb-3 text-start">{t.codAmount}</th>
                    <th className="pb-3 text-start">{t.orderStatus}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentOrders.map(order => {
                    const assigned = couriersList.find(c => c.id === order.courier_id);
                    return (
                      <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 font-mono font-bold text-blue-700">
                          #{order.order_number}
                        </td>
                        <td className="py-3 font-semibold text-slate-900">
                          <div>{order.customer_name}</div>
                          <span className="text-[10px] text-slate-400 font-mono">{order.customer_phone}</span>
                        </td>
                        <td className="py-3 text-slate-600">
                          {assigned ? (
                            <span className="inline-flex items-center gap-1 font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                              <Truck className="w-3 h-3" />
                              {assigned.full_name}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">
                              {t.unassigned}
                            </span>
                          )}
                        </td>
                        <td className="py-3 font-bold text-slate-900 font-mono">
                          {Number(order.cod_amount).toLocaleString()} {t.currency}
                        </td>
                        <td className="py-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              order.status === 'delivered'
                                ? 'bg-emerald-100 text-emerald-800'
                                : order.status === 'out_for_delivery'
                                ? 'bg-blue-100 text-blue-800'
                                : order.status === 'failed'
                                ? 'bg-rose-100 text-rose-800'
                                : order.status === 'assigned'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {order.status === 'delivered'
                              ? t.statusDelivered
                              : order.status === 'out_for_delivery'
                              ? t.statusOutForDelivery
                              : order.status === 'failed'
                              ? t.statusFailed
                              : order.status === 'assigned'
                              ? t.statusAssigned
                              : t.statusPending}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Live Activity Stream (1 col) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                <span>سجل النشاطات والأحداث</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                تحديثات العمليات وسجل التدقيق الفوري
              </p>
            </div>
            <button
              onClick={() => navigate('/activity')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <span>السجل الكامل</span>
              <ArrowIcon className="w-3 h-3" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto max-h-[380px]">
            {metrics.recentActivity.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                لا توجد نشاطات مسجلة حتى الآن
              </div>
            ) : (
              metrics.recentActivity.map(event => (
                <div
                  key={event.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-start space-y-1"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-slate-900 text-[11px] truncate">
                      {event.actor_name || (event.actor === 'customer' ? 'العميل' : event.actor === 'courier' ? 'المندوب' : 'الإدارة')}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                      {formatRelativeTime(event.created_at || event.timestamp)}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {event.details}
                  </p>

                  <div className="flex items-center gap-1.5 pt-1 text-[10px]">
                    <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-mono">
                      {event.event_type}
                    </span>
                    {event.actor === 'customer' && (
                      <span className="px-1.5 py-0.2 rounded bg-teal-100 text-teal-800 font-semibold">
                        تأكيد العميل
                      </span>
                    )}
                    {event.return_id && (
                      <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 font-semibold">
                        مرتجع
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <button
              onClick={() => navigate('/activity')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 hover:underline"
            >
              <span>فتح سجل النشاطات مع التصفية والبحث</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
