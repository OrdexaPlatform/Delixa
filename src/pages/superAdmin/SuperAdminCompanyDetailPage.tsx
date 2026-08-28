import React, { useState, useEffect } from 'react';
import {
  Building2,
  ArrowRight,
  Shield,
  Layers,
  Users,
  Store,
  Package,
  CreditCard,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Radio,
  Plus,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { useSuperAdmin } from '../../contexts/SuperAdminContext';
import { safeFetchJson } from '../../utils/apiClient';

interface SuperAdminCompanyDetailPageProps {
  companyId: string;
  onNavigate: (path: string) => void;
}

export const SuperAdminCompanyDetailPage: React.FC<SuperAdminCompanyDetailPageProps> = ({
  companyId,
  onNavigate,
}) => {
  const { token, hasPermission } = useSuperAdmin();
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'couriers' | 'merchants' | 'orders' | 'payments' | 'logs'>('overview');

  // Actions
  const [extensionDays, setExtensionDays] = useState<number>(30);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchCompanyDetails = async () => {
    try {
      const { ok, data } = await safeFetchJson<any>(`/api/super-admin/companies/${companyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ok && data?.success) {
        setCompany(data.company);
      }
    } catch (err) {
      console.error('Failed to load company details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyDetails();
  }, [companyId, token]);

  const handleStatusToggle = async (targetStatus: 'active' | 'suspended') => {
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const { ok, data, error } = await safeFetchJson<any>(`/api/super-admin/companies/${companyId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: targetStatus,
          reason: targetStatus === 'suspended' ? 'إيقاف يدوي من قبل Super Admin' : 'إعادة تفعيل من قبل Super Admin',
        }),
      });

      if (ok && data?.success) {
        setActionSuccess(`تم ${targetStatus === 'active' ? 'تفعيل' : 'إيقاف'} الشركة بنجاح`);
        await fetchCompanyDetails();
      } else {
        setActionError(data?.error || error || 'فشل تنفيذ الإجراء');
      }
    } catch (err: any) {
      setActionError(err.message || 'حدث خطأ في الخادم');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExtend = async (days: number) => {
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const { ok, data, error } = await safeFetchJson<any>(`/api/super-admin/companies/${companyId}/subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          extensionDays: days,
        }),
      });

      if (ok && data?.success) {
        setActionSuccess(`تم تمديد الاشتراك بنجاح (+${days} يوم)`);
        await fetchCompanyDetails();
      } else {
        setActionError(data?.error || error || 'فشل تمديد الاشتراك');
      }
    } catch (err: any) {
      setActionError(err.message || 'حدث خطأ في الخادم');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="text-xs font-semibold">جاري تحميل ملف الشركة الكامل...</span>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center p-16 bg-slate-900 border border-slate-800 rounded-2xl">
        <Building2 className="w-12 h-12 mx-auto text-slate-600 mb-3" />
        <div className="text-base font-bold text-white">الشركة غير موجودة</div>
        <button
          onClick={() => onNavigate('/super-admin/companies')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
        >
          العودة لقائمة الشركات
        </button>
      </div>
    );
  }

  return (
    <div id="super-admin-company-detail-view" className="space-y-6 animate-in fade-in duration-200">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('/super-admin/companies')}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white">{company.name}</h1>
              {company.status === 'active' ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  نشطة
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {company.status === 'suspended' ? 'موقوفة' : company.status}
                </span>
              )}
              {company.is_online && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  متصلة الآن
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">معرف الشركة: {company.id}</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {hasPermission('companies.suspend') && company.status === 'active' && (
            <button
              onClick={() => handleStatusToggle('suspended')}
              disabled={actionLoading}
              className="px-3 py-2 bg-amber-600/20 hover:bg-amber-600 text-amber-400 hover:text-slate-950 border border-amber-500/30 rounded-xl text-xs font-bold transition"
            >
              إيقاف الشركة
            </button>
          )}

          {hasPermission('companies.suspend') && company.status === 'suspended' && (
            <button
              onClick={() => handleStatusToggle('active')}
              disabled={actionLoading}
              className="px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-slate-950 border border-emerald-500/30 rounded-xl text-xs font-bold transition"
            >
              تفعيل الشركة
            </button>
          )}

          {hasPermission('subscriptions.edit') && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleExtend(7)}
                disabled={actionLoading}
                className="px-2.5 py-2 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 rounded-xl text-xs font-bold transition"
              >
                +7 أيام
              </button>
              <button
                onClick={() => handleExtend(30)}
                disabled={actionLoading}
                className="px-2.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition"
              >
                +30 يوم
              </button>
            </div>
          )}
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'overview', label: 'نظرة عامة والاشتراك', icon: Building2 },
          { id: 'couriers', label: `المناديب (${company.couriers?.length || 0})`, icon: Users },
          { id: 'merchants', label: `المتاجر (${company.merchants?.length || 0})`, icon: Store },
          { id: 'orders', label: `الشحنات (${company.recent_orders?.length || 0})`, icon: Package },
          { id: 'payments', label: `المدفوعات (${company.payments?.length || 0})`, icon: CreditCard },
          { id: 'logs', label: 'سجل العمليات', icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-white">بيانات الشركة</h2>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">اسم الشركة</span>
                <span className="font-semibold text-white">{company.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">البريد الإلكتروني</span>
                <span className="font-semibold text-slate-200">{company.email || 'غير مسجل'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">رقم الهاتف</span>
                <span className="font-semibold text-slate-200">{company.phone || 'غير مسجل'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">العنوان</span>
                <span className="font-semibold text-slate-200">{company.address || 'غير محدد'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">تاريخ الانضمام</span>
                <span className="font-semibold text-slate-200">{new Date(company.created_at).toLocaleDateString('ar-EG')}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-white">حالة الاشتراك</h2>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">الباقة الحالية</span>
                <span className="font-bold text-blue-400">{company.plan_name || 'باقة النمو (Growth)'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">تاريخ انتهاء الاشتراك</span>
                <span className="font-bold text-white">
                  {company.subscription_end_date ? new Date(company.subscription_end_date).toLocaleDateString('ar-EG') : 'غير محدد'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">نوع الاشتراك</span>
                <span className="font-semibold text-slate-200">{company.is_trial ? 'فترة تجريبية (Trial)' : 'اشتراك رسمي مدفوع'}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-white">إحصائيات التشغيل</h2>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">إجمالي المناديب:</span>
                <span className="font-bold text-white">{company.couriers?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">إجمالي المتاجر:</span>
                <span className="font-bold text-white">{company.merchants?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">إجمالي الشحنات:</span>
                <span className="font-bold text-white">{company.recent_orders?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">المستخدمون المتصلون الآن:</span>
                <span className="font-bold text-emerald-400">{company.active_users_online_count || 0}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Couriers */}
      {activeTab === 'couriers' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <h2 className="text-sm font-bold text-white mb-4">قائمة مناديب الشركة</h2>
          {company.couriers?.length === 0 ? (
            <div className="text-center p-8 text-slate-500 text-xs">لا يوجد مناديب مسجلين في هذه الشركة</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4">اسم المندوب</th>
                    <th className="py-2.5 px-4">كود الموظف</th>
                    <th className="py-2.5 px-4">رقم الهاتف</th>
                    <th className="py-2.5 px-4">المنطقة</th>
                    <th className="py-2.5 px-4">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {company.couriers.map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-bold text-white">{c.full_name}</td>
                      <td className="py-3 px-4 font-mono text-slate-300">{c.employee_id}</td>
                      <td className="py-3 px-4 text-slate-300">{c.phone}</td>
                      <td className="py-3 px-4 text-slate-400">{c.area || 'غير محدد'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${c.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                          {c.status === 'active' ? 'نشط' : c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Merchants */}
      {activeTab === 'merchants' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <h2 className="text-sm font-bold text-white mb-4">قائمة المتاجر والتجار</h2>
          {company.merchants?.length === 0 ? (
            <div className="text-center p-8 text-slate-500 text-xs">لا يوجد متاجر مسجلة في هذه الشركة</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4">اسم المتجر</th>
                    <th className="py-2.5 px-4">المالك</th>
                    <th className="py-2.5 px-4">الهاتف</th>
                    <th className="py-2.5 px-4">العنوان</th>
                    <th className="py-2.5 px-4">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {company.merchants.map((m: any) => (
                    <tr key={m.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-bold text-white">{m.store_name}</td>
                      <td className="py-3 px-4 text-slate-300">{m.owner_name}</td>
                      <td className="py-3 px-4 text-slate-300">{m.phone}</td>
                      <td className="py-3 px-4 text-slate-400">{m.address}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${m.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                          {m.status === 'active' ? 'نشط' : m.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Orders */}
      {activeTab === 'orders' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <h2 className="text-sm font-bold text-white mb-4">أحدث الشحنات المسجلة</h2>
          {company.recent_orders?.length === 0 ? (
            <div className="text-center p-8 text-slate-500 text-xs">لا توجد شحنات مسجلة</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4">رقم الشحنة</th>
                    <th className="py-2.5 px-4">العميل</th>
                    <th className="py-2.5 px-4">المبلغ</th>
                    <th className="py-2.5 px-4">الحالة</th>
                    <th className="py-2.5 px-4">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {company.recent_orders.map((o: any) => (
                    <tr key={o.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-bold text-white font-mono">#{o.order_number}</td>
                      <td className="py-3 px-4 text-slate-300">{o.customer_name} ({o.customer_phone})</td>
                      <td className="py-3 px-4 font-bold text-emerald-400">{o.cod_amount} ج.م</td>
                      <td className="py-3 px-4 text-slate-300">{o.status}</td>
                      <td className="py-3 px-4 text-slate-500">{new Date(o.created_at).toLocaleDateString('ar-EG')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Payments */}
      {activeTab === 'payments' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <h2 className="text-sm font-bold text-white mb-4">سجل مدفوعات الشركة</h2>
          {company.payments?.length === 0 ? (
            <div className="text-center p-8 text-slate-500 text-xs">لا توجد مدفوعات مسجلة لهذه الشركة</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4">رقم الدفعة</th>
                    <th className="py-2.5 px-4">المبلغ</th>
                    <th className="py-2.5 px-4">طريقة الدفع</th>
                    <th className="py-2.5 px-4">الحالة</th>
                    <th className="py-2.5 px-4">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {company.payments.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-bold text-white font-mono">{p.payment_number}</td>
                      <td className="py-3 px-4 font-bold text-emerald-400">{p.amount} {p.currency || 'EGP'}</td>
                      <td className="py-3 px-4 text-slate-300">{p.payment_method}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${p.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                          {p.status === 'paid' ? 'مدفوعة' : p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{new Date(p.payment_date).toLocaleDateString('ar-EG')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 6: Activity Logs */}
      {activeTab === 'logs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <h2 className="text-sm font-bold text-white mb-2">سجل العمليات المتعلقة بالشركة</h2>
          {company.activity_logs?.length === 0 ? (
            <div className="text-center p-8 text-slate-500 text-xs">لا توجد عمليات مسجلة</div>
          ) : (
            company.activity_logs.map((log: any) => (
              <div key={log.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs flex items-start justify-between">
                <div>
                  <div className="font-semibold text-white">{log.details}</div>
                  <div className="text-[11px] text-slate-400 mt-1">بواسطة: {log.actor}</div>
                </div>
                <span className="text-[10px] text-slate-400">{new Date(log.created_at).toLocaleDateString('ar-EG')}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
