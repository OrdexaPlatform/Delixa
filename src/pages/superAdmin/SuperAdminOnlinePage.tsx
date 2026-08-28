import React, { useState, useEffect } from 'react';
import {
  Radio,
  Building2,
  RefreshCw,
  Clock,
  Laptop,
  Smartphone,
  Globe,
  Loader2
} from 'lucide-react';
import { useSuperAdmin } from '../../contexts/SuperAdminContext';
import { OnlineCompanyStatus } from '../../types';
import { safeFetchJson } from '../../utils/apiClient';

interface SuperAdminOnlinePageProps {
  onNavigate: (path: string) => void;
}

export const SuperAdminOnlinePage: React.FC<SuperAdminOnlinePageProps> = ({ onNavigate }) => {
  const { token } = useSuperAdmin();
  const [onlineCompanies, setOnlineCompanies] = useState<OnlineCompanyStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOnlineStatus = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const { ok, data } = await safeFetchJson<any>('/api/super-admin/presence', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ok && data?.success) {
        setOnlineCompanies(data.companies || []);
      }
    } catch (err) {
      console.error('Failed to load presence:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOnlineStatus();
    const interval = setInterval(() => fetchOnlineStatus(), 15000);
    return () => clearInterval(interval);
  }, [token]);

  return (
    <div id="super-admin-online-view" className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
            <h1 className="text-xl font-black text-white">الشركات المتصلة والنشطة الآن (Live Presence)</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            مراقبة حية لحظية للشركات والمستخدمين الذين يتصفحون منصة DELIXA في هذه اللحظة
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchOnlineStatus(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>تحديث فوري</span>
          </button>
        </div>
      </div>

      {/* Online Count Banner */}
      <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-2xl p-5 shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Radio className="w-6 h-6 animate-ping" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-400">{onlineCompanies.length} شركة متصلة حالياً</div>
            <p className="text-xs text-slate-300">يتم إرسال نبضات Heartbeat كل 30 ثانية لتأكيد الاتصال النشط</p>
          </div>
        </div>
      </div>

      {/* Grid of Online Companies */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          <span className="text-xs font-semibold">جاري فحص الاتصالات الحية...</span>
        </div>
      ) : onlineCompanies.length === 0 ? (
        <div className="text-center p-16 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400">
          <Radio className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <div className="text-sm font-bold text-white">لا توجد شركات متصلة في هذه اللحظة</div>
          <div className="text-xs text-slate-500 mt-1">ستظهر الشركات هنا فور فتح أي مدير شركة أو مندوب للتطبيق</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {onlineCompanies.map((c) => (
            <div
              key={c.company_id}
              className="bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-5 shadow-xl transition space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                    {c.company_name ? c.company_name.charAt(0) : 'D'}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{c.company_name}</h3>
                    <span className="text-[10px] text-slate-400 font-mono">ID: {c.company_id.slice(0, 8)}...</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>متصل</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 space-y-2 text-xs text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">المستخدمون النشطون:</span>
                  <span className="font-bold text-white">{c.active_users_count || 1} مستخدم</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">آخر ظهور:</span>
                  <span className="text-emerald-400 font-medium">الآن</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => onNavigate(`/super-admin/companies/${c.company_id}`)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
                >
                  فتح ملف الشركة
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
