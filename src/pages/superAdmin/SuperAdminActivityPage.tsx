import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  Shield,
  Loader2
} from 'lucide-react';
import { useSuperAdmin } from '../../contexts/SuperAdminContext';
import { PlatformActivityLog } from '../../types';

interface SuperAdminActivityPageProps {
  onNavigate: (path: string) => void;
}

export const SuperAdminActivityPage: React.FC<SuperAdminActivityPageProps> = ({ onNavigate }) => {
  const { token } = useSuperAdmin();
  const [logs, setLogs] = useState<PlatformActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const fetchLogs = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch('/api/super-admin/activity-logs?limit=100', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setLogs(data.logs || []);
        }
      }
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [token]);

  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      log.details?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAction = actionFilter === 'all' || log.action?.includes(actionFilter);
    return matchesSearch && matchesAction;
  });

  return (
    <div id="super-admin-activity-view" className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <h1 className="text-xl font-black text-white">سجل العمليات والتدقيق (Platform Audit Log)</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            توثيق كامل لكافة التغييرات، تسجيلات الدخول، وإجراءات المشرفين على منصة DELIXA
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchLogs(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في سجل العمليات..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2 pr-10 pl-4 text-xs text-white placeholder-slate-500 outline-hidden transition"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-3 py-2 text-xs font-semibold outline-hidden focus:border-blue-500 w-full sm:w-auto"
        >
          <option value="all">كافة العمليات</option>
          <option value="login">تسجيل الدخول</option>
          <option value="company">الشركات والاشتراكات</option>
          <option value="payment">المدفوعات</option>
          <option value="staff">فريق العمل</option>
          <option value="settings">الإعدادات</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="text-xs font-semibold">جاري جلب سجل العمليات...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center p-16 text-slate-400 text-xs">لا توجد عمليات مسجلة مطابقة</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">الإجراء</th>
                  <th className="py-3.5 px-4">المنفذ (Actor)</th>
                  <th className="py-3.5 px-4">نوع الهدف</th>
                  <th className="py-3.5 px-4">التفاصيل</th>
                  <th className="py-3.5 px-4">التاريخ والوقت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-400">
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white flex items-center gap-1.5 mt-2">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{log.actor}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">{log.target_type || '-'}</td>
                    <td className="py-3.5 px-4 text-slate-200 max-w-md">{log.details}</td>
                    <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('ar-EG')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
