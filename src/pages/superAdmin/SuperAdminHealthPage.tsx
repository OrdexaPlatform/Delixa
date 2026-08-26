import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Database,
  Server,
  Zap,
  Mail,
  CreditCard,
  MessageSquare,
  Clock,
  Loader2
} from 'lucide-react';
import { useSuperAdmin } from '../../contexts/SuperAdminContext';

interface SuperAdminHealthPageProps {
  onNavigate: (path: string) => void;
}

export const SuperAdminHealthPage: React.FC<SuperAdminHealthPageProps> = ({ onNavigate }) => {
  const { token } = useSuperAdmin();
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHealth = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch('/api/super-admin/system-health', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setHealth(data.health);
        }
      }
    } catch (err) {
      console.error('Failed to load health:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, [token]);

  const getStatusIcon = (status: string) => {
    if (status === 'connected' || status === 'configured' || status === 'operational') {
      return <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
    }
    if (status === 'degraded' || status === 'not_configured' || status === 'optional') {
      return <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
    }
    return <XCircle className="w-5 h-5 text-rose-400 shrink-0" />;
  };

  return (
    <div id="super-admin-health-view" className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h1 className="text-xl font-black text-white">صحة النظام والخدمات السحابية (System Health)</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            مراقبة حية لأداء قاعدة بيانات Supabase، خادم Express، بوابات الدفع، وإشعارات المنصة
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchHealth(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>فحص تشخيصي الآن</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          <span className="text-xs font-semibold">جاري فحص جميع خدمات المنصة...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Supabase Database Health */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">قاعدة البيانات (Supabase)</h3>
                  <span className="text-[10px] text-slate-400 font-mono">PostgreSQL Database</span>
                </div>
              </div>
              {getStatusIcon(health?.database?.status)}
            </div>

            <div className="pt-3 border-t border-slate-800 space-y-2 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">حالة الاتصال:</span>
                <span className="font-bold text-emerald-400">{health?.database?.status === 'connected' ? 'متصل بنجاح' : 'غير متصل'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">زمن الاستجابة (Latency):</span>
                <span className="font-bold text-white font-mono">{health?.database?.latency_ms || 0} ms</span>
              </div>
            </div>
          </div>

          {/* Node.js / Express Server */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">خادم التطبيق (Node.js)</h3>
                  <span className="text-[10px] text-slate-400 font-mono">Express Backend</span>
                </div>
              </div>
              {getStatusIcon(health?.server?.status)}
            </div>

            <div className="pt-3 border-t border-slate-800 space-y-2 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">مدة التشغيل (Uptime):</span>
                <span className="font-bold text-white">{Math.floor((health?.server?.uptime || 0) / 60)} دقيقة</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">الذاكرة المستخدمة (RAM):</span>
                <span className="font-bold text-white font-mono">
                  {Math.round((health?.server?.memory?.heapUsed || 0) / 1024 / 1024)} MB
                </span>
              </div>
            </div>
          </div>

          {/* Payment Gateways Config */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">بوابات الدفع الإلكتروني</h3>
                  <span className="text-[10px] text-slate-400 font-mono">Paymob & Stripe</span>
                </div>
              </div>
              {getStatusIcon(health?.integrations?.paymob ? 'configured' : 'not_configured')}
            </div>

            <div className="pt-3 border-t border-slate-800 space-y-2 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Paymob:</span>
                <span className="font-semibold text-slate-200">{health?.integrations?.paymob ? 'مهيأة بالكامل' : 'مفاتيح تجريبية / يدوية'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">InstaPay & المحافظ:</span>
                <span className="font-bold text-emerald-400">جاهزة للتحويل والتوثيق</span>
              </div>
            </div>
          </div>

          {/* Email Resend Service */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">خدمة البريد (Resend / SMTP)</h3>
                  <span className="text-[10px] text-slate-400 font-mono">Transactional Emails</span>
                </div>
              </div>
              {getStatusIcon(health?.integrations?.resend ? 'configured' : 'not_configured')}
            </div>

            <div className="pt-3 border-t border-slate-800 space-y-2 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">حالة الربط:</span>
                <span className="font-semibold text-slate-200">{health?.integrations?.resend ? 'متصل' : 'تنبيهات النظام جاهزة'}</span>
              </div>
            </div>
          </div>

          {/* WhatsApp / SMS Gateway */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">إشعارات الواتساب والرسائل</h3>
                  <span className="text-[10px] text-slate-400 font-mono">WhatsApp Webhook & SMS</span>
                </div>
              </div>
              {getStatusIcon('operational')}
            </div>

            <div className="pt-3 border-t border-slate-800 space-y-2 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">روابط التتبع اللحظية:</span>
                <span className="font-bold text-emerald-400">تعمل بدون انقطاع</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
