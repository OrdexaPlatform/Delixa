import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  Package,
  Layers,
  Radio,
  Clock,
  ArrowUpRight,
  RefreshCw,
  Plus,
  Loader2,
  ChevronRight,
  TrendingUp,
  Receipt
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useSuperAdmin } from '../../contexts/SuperAdminContext';

interface SuperAdminDashboardPageProps {
  onNavigate: (path: string) => void;
}

export const SuperAdminDashboardPage: React.FC<SuperAdminDashboardPageProps> = ({ onNavigate }) => {
  const { token, admin } = useSuperAdmin();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [charts, setCharts] = useState<any>(null);
  const [timeframe, setTimeframe] = useState<'7days' | '30days' | '12months'>('30days');
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  const fetchDashboardData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [statsRes, logsRes] = await Promise.all([
        fetch('/api/super-admin/dashboard/stats', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/super-admin/activity-logs?limit=8', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        if (data.success) {
          setStats(data.stats);
          setCharts(data.charts);
        }
      }

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        if (logsData.success) {
          setRecentLogs(logsData.logs || []);
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="text-sm font-semibold">جاري تحميل إحصائيات المنصة...</span>
      </div>
    );
  }

  // Filter Chart Data based on timeframe
  let activeChartData: any[] = [];
  if (charts) {
    if (timeframe === '7days') {
      activeChartData = (charts.daily || []).slice(-7);
    } else if (timeframe === '30days') {
      activeChartData = charts.daily || [];
    } else {
      activeChartData = charts.monthly || [];
    }
  }

  // Subscriptions Pie Data
  const pieData = [
    { name: 'اشتراكات نشطة', value: stats?.activeSubscriptions || 0, color: '#3b82f6' },
    { name: 'فترات تجريبية', value: stats?.trialSubscriptions || 0, color: '#10b981' },
    { name: 'منتهية الصلاحية', value: stats?.expiredSubscriptions || 0, color: '#f43f5e' },
  ];

  return (
    <div id="super-admin-dashboard-view" className="space-y-6 animate-in fade-in duration-200">
      {/* Welcome & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-white">مرحباً، {admin?.full_name}</h1>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {admin?.role === 'super_admin' ? 'مالك المنصة' : 'إدارة المنصة'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            إليك ملخص الأداء المالي، الشركات المشتركة، وحالة النظام اللحظية لمنصة DELIXA
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            id="super-admin-refresh-stats-btn"
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>تحديث البيانات</span>
          </button>

          <button
            onClick={() => onNavigate('/super-admin/companies')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>إدارة الشركات</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Companies Card */}
        <div
          onClick={() => onNavigate('/super-admin/companies')}
          className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-5 transition cursor-pointer group shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">إجمالي شركات الشحن</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-105 transition">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{stats?.totalCompanies || 0}</span>
            <span className="text-xs text-emerald-400 font-semibold">{stats?.activeCompanies || 0} نشطة</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>موقوفة: {stats?.suspendedCompanies || 0}</span>
            <span>تجريبية: {stats?.trialCompanies || 0}</span>
          </div>
        </div>

        {/* Revenue Card */}
        <div
          onClick={() => onNavigate('/super-admin/payments')}
          className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-5 transition cursor-pointer group shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">إيرادات المنصة (SaaS)</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{(stats?.totalRevenue || 0).toLocaleString()}</span>
            <span className="text-xs text-emerald-400 font-semibold">ج.م</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>هذا الشهر: {(stats?.revenueThisMonth || 0).toLocaleString()} ج.م</span>
            <span>اليوم: {(stats?.revenueToday || 0).toLocaleString()} ج.م</span>
          </div>
        </div>

        {/* Total Orders Handled */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">إجمالي شحنات المنصة</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{(stats?.totalOrders || 0).toLocaleString()}</span>
            <span className="text-xs text-indigo-400 font-semibold">{stats?.ordersToday || 0} شحنة اليوم</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>مناديب: {stats?.totalCouriers || 0}</span>
            <span>متاجر: {stats?.totalMerchants || 0}</span>
          </div>
        </div>

        {/* Live Active Pulse Card */}
        <div
          onClick={() => onNavigate('/super-admin/online')}
          className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-5 transition cursor-pointer group shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">الشركات النشطة الآن</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition">
              <Radio className="w-4 h-4 animate-pulse text-emerald-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400">{stats?.onlineCompaniesCount || 0}</span>
            <span className="text-xs text-slate-400">شركة متصلة لحظياً</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>تنتهي خلال 7 أيام: {stats?.expiring7DaysCompanies || 0}</span>
            <span>منتهية: {stats?.expiredCompanies || 0}</span>
          </div>
        </div>
      </div>

      {/* Analytics & Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue & Orders Chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-white">إيرادات المنصة وحركة الشحنات</h2>
              <p className="text-xs text-slate-400">نمو إيرادات الاشتراكات وحجم عمليات التوصيل</p>
            </div>
            {/* Timeframe selector */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setTimeframe('7days')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  timeframe === '7days' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                7 أيام
              </button>
              <button
                onClick={() => setTimeframe('30days')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  timeframe === '30days' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                30 يوم
              </button>
              <button
                onClick={() => setTimeframe('12months')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  timeframe === '12months' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                12 شهر
              </button>
            </div>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activeChartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem' }}
                  labelStyle={{ color: '#94a3b8', fontWeight: 600 }}
                />
                <Area type="monotone" dataKey="revenue" name="الإيرادات (ج.م)" stroke="#10b981" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Subscriptions Status Donut Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-white">توزيع الاشتراكات</h2>
                <p className="text-xs text-slate-400">حالة اشتراكات الشركات الحالية</p>
              </div>
              <button
                onClick={() => onNavigate('/super-admin/subscriptions')}
                className="text-xs text-blue-400 hover:underline font-semibold"
              >
                التفاصيل
              </button>
            </div>

            <div className="h-52 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-800">
            {pieData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-300 font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-white">{item.value} شركة</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Quick Actions & Recent Activity Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick SaaS Management Actions */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white">إجراءات الإدارة السريعة</h2>
          <div className="space-y-2.5">
            <button
              onClick={() => onNavigate('/super-admin/subscriptions')}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 transition text-right group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">إدارة باقات الاشتراك</div>
                  <div className="text-[11px] text-slate-400">تعديل الأسعار والميزات والحدود</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
            </button>

            <button
              onClick={() => onNavigate('/super-admin/payments')}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 transition text-right group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">تسجيل دفعة جديدة</div>
                  <div className="text-[11px] text-slate-400">توثيق مدفوعات نقدية أو بنكية</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
            </button>

            <button
              onClick={() => onNavigate('/super-admin/staff')}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 transition text-right group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">إضافة موظف / مسؤول فرعي</div>
                  <div className="text-[11px] text-slate-400">تحديد أدوار وصلاحيات الفريق</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
            </button>

            <button
              onClick={() => onNavigate('/super-admin/analytics')}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 transition text-right group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">تحليلات الزوار الفريدين</div>
                  <div className="text-[11px] text-slate-400">إحصائيات الأجهزة والصفحات الأكثر زيارة</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
            </button>
          </div>
        </div>

        {/* Recent Audit & Activity Logs */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">سجل العمليات والتدقيق اللحظي</h2>
              <p className="text-xs text-slate-400">آخر الإجراءات المنفذة في منصة DELIXA</p>
            </div>
            <button
              onClick={() => onNavigate('/super-admin/activity')}
              className="text-xs text-blue-400 hover:underline font-semibold"
            >
              عرض السجل الكامل
            </button>
          </div>

          <div className="space-y-2">
            {recentLogs.length === 0 ? (
              <div className="text-center p-8 text-slate-500 text-xs">لا توجد عمليات مسجلة حديثاً</div>
            ) : (
              recentLogs.map((log, idx) => (
                <div
                  key={log.id || idx}
                  className="flex items-start justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-xs"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-200">{log.details}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>بواسطة: {log.actor}</span>
                        <span>•</span>
                        <span className="text-slate-400">النوع: {log.target_type}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 shrink-0 font-medium">
                    {new Date(log.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
