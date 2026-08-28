import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Users,
  Eye,
  Smartphone,
  Laptop,
  Globe,
  RefreshCw,
  TrendingUp,
  Loader2
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
import { safeFetchJson } from '../../utils/apiClient';

interface SuperAdminAnalyticsPageProps {
  onNavigate: (path: string) => void;
}

export const SuperAdminAnalyticsPage: React.FC<SuperAdminAnalyticsPageProps> = ({ onNavigate }) => {
  const { token } = useSuperAdmin();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [days, setDays] = useState(30);

  const fetchAnalytics = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const { ok, data: json } = await safeFetchJson<any>(`/api/super-admin/analytics?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ok && json?.success) {
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [days, token]);

  const deviceData = [
    { name: 'هواتف ذكية (Mobile)', value: data?.devices?.mobile || 0, color: '#3b82f6' },
    { name: 'أجهزة حاسوب (Desktop)', value: data?.devices?.desktop || 0, color: '#10b981' },
    { name: 'أجهزة لوحية (Tablet)', value: data?.devices?.tablet || 0, color: '#a855f7' },
  ];

  return (
    <div id="super-admin-analytics-view" className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <h1 className="text-xl font-black text-white">تحليلات الزوار والمنصة (Platform Analytics)</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            إحصائيات تفاعل الزوار، المشاهدات اليومية، الأجهزة، والصفحات الأكثر زيارة
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-3 py-2 text-xs font-semibold outline-hidden focus:border-blue-500"
          >
            <option value={7}>آخر 7 أيام</option>
            <option value={30}>آخر 30 يوم</option>
            <option value={90}>آخر 90 يوم</option>
          </select>

          <button
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">إجمالي مشاهدات الصفحات (Page Views)</span>
            <Eye className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">
            {(data?.summary?.totalPageViews || 0).toLocaleString()}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">إجمالي الزوار الفريدين (Unique Visitors)</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-400">
            {(data?.summary?.totalUniqueVisitors || 0).toLocaleString()}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">متوسط المشاهدات لكل زائر</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-purple-400">
            {data?.summary?.totalUniqueVisitors
              ? ((data.summary.totalPageViews || 0) / (data.summary.totalUniqueVisitors || 1)).toFixed(1)
              : '0'}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visitors Trend Line Chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white">مخطط الزيارات والمشاهدات اليومية</h2>
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.dailyTrends || []}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="visit_date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem' }}
                />
                <Area type="monotone" dataKey="page_views" name="المشاهدات" stroke="#3b82f6" fillOpacity={1} fill="url(#colorViews)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Devices Donut Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-white mb-2">أنواع الأجهزة المستخدمة</h2>
            <div className="h-52 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deviceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {deviceData.map((entry, index) => (
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
            {deviceData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-300 font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-white">{item.value} زيارة</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Pages Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <h2 className="text-sm font-bold text-white mb-4">أكثر الصفحات والمسارات زيارة</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-4">رابط الصفحة</th>
                <th className="py-2.5 px-4">عدد المشاهدات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {(data?.topPages || []).map((p: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-mono text-slate-200">{p.page_path}</td>
                  <td className="py-3 px-4 font-bold text-blue-400">{p.views?.toLocaleString()} مشاهدة</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
