import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Save,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Mail,
  Phone,
  CreditCard,
  Building2,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { useSuperAdmin } from '../../contexts/SuperAdminContext';
import { PlatformSettings } from '../../types';
import { safeFetchJson } from '../../utils/apiClient';

interface SuperAdminSettingsPageProps {
  onNavigate: (path: string) => void;
}

export const SuperAdminSettingsPage: React.FC<SuperAdminSettingsPageProps> = ({ onNavigate }) => {
  const { token, hasPermission } = useSuperAdmin();
  const [settings, setSettings] = useState<PlatformSettings>({
    platform_name: 'DELIXA SaaS',
    support_email: 'support@delixa.app',
    support_phone: '+201000000000',
    allow_registration: true,
    maintenance_mode: false,
    maintenance_message: 'المنصة تخضع لعمليات صيانة وتحديث مجدولة لتحسين الأداء. سنعود للعمل قريباً.',
    default_trial_days: 14,
    currency_default: 'EGP',
    instapay_address: 'delixa@instapay',
    vodafone_cash_number: '01000000000',
    require_email_verification: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      const { ok, data } = await safeFetchJson<any>('/api/super-admin/settings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ok && data?.success && data?.settings) {
        setSettings(prev => ({ ...prev, ...data.settings }));
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [token]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSavedSuccess(false);

    try {
      const { ok, data, error } = await safeFetchJson<any>('/api/super-admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      if (ok && data?.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 4000);
      } else {
        setSaveError(data?.error || error || 'فشل حفظ الإعدادات');
      }
    } catch (err: any) {
      setSaveError(err.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="text-xs font-semibold">جاري تحميل إعدادات المنصة...</span>
      </div>
    );
  }

  return (
    <div id="super-admin-settings-view" className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-400" />
            <h1 className="text-xl font-black text-white">إعدادات المنصة المركزية (Platform Settings)</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            التحكم في وضع الصيانة، تسجيل الشركات الجديدة، بوابات الدفع، والبيانات العامة لمنصة DELIXA
          </p>
        </div>

        {hasPermission('settings.edit') && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition cursor-pointer"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>حفظ كافة التغييرات</span>
          </button>
        )}
      </div>

      {savedSuccess && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>تم حفظ وتطبيق إعدادات المنصة بنجاح على الفور!</span>
        </div>
      )}

      {saveError && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Maintenance Mode Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>وضع الصيانة للمنصة (Maintenance Mode)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                تفعيل وضع الصيانة سيمنع جميع مستخدمي الشركات والمناديب من الدخول، مع استمرار وصول Super Admin فقط.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.maintenance_mode}
                onChange={(e) => setSettings({ ...settings, maintenance_mode: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {settings.maintenance_mode && (
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <label className="block text-xs font-bold text-amber-400">رسالة الصيانة التي ستظهر للزوار والشركات</label>
              <textarea
                value={settings.maintenance_message}
                onChange={(e) => setSettings({ ...settings, maintenance_message: e.target.value })}
                rows={3}
                className="w-full bg-slate-950 border border-amber-500/30 rounded-xl p-3 text-xs text-white focus:border-amber-500 outline-hidden"
              />
            </div>
          )}
        </div>

        {/* General SaaS Settings */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-400" />
            <span>بيانات المنصة والاشتراكات الافتراضية</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 font-bold mb-1.5">اسم المنصة (Platform Name)</label>
              <input
                type="text"
                value={settings.platform_name}
                onChange={(e) => setSettings({ ...settings, platform_name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-blue-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold mb-1.5">أيام الفترة التجريبية الافتراضية (Trial Days)</label>
              <input
                type="number"
                value={settings.default_trial_days}
                onChange={(e) => setSettings({ ...settings, default_trial_days: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-blue-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold mb-1.5">بريد الدعم الفني العام</label>
              <input
                type="email"
                value={settings.support_email}
                onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-blue-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold mb-1.5">هاتف وواتساب الدعم الفني</label>
              <input
                type="text"
                value={settings.support_phone}
                onChange={(e) => setSettings({ ...settings, support_phone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-blue-500 outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Payment Gateways & Manual Accounts */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-400" />
            <span>بيانات استقبال المدفوعات اليدوية (InstaPay & Vodafone Cash)</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 font-bold mb-1.5">عنوان / معرف إنستاباي (InstaPay Address)</label>
              <input
                type="text"
                value={settings.instapay_address}
                onChange={(e) => setSettings({ ...settings, instapay_address: e.target.value })}
                placeholder="username@instapay"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-emerald-500 outline-hidden font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold mb-1.5">رقم محفظة فودافون كاش (Vodafone Cash)</label>
              <input
                type="text"
                value={settings.vodafone_cash_number}
                onChange={(e) => setSettings({ ...settings, vodafone_cash_number: e.target.value })}
                placeholder="010XXXXXXXX"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-emerald-500 outline-hidden font-mono"
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
