import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  MoreVertical,
  Radio,
  ExternalLink,
  Loader2,
  RefreshCw,
  SlidersHorizontal,
  ChevronLeft
} from 'lucide-react';
import { useSuperAdmin } from '../../contexts/SuperAdminContext';
import { CompanyWithPlatformMetrics } from '../../types';
import { safeFetchJson } from '../../utils/apiClient';

interface SuperAdminCompaniesPageProps {
  onNavigate: (path: string) => void;
}

export const SuperAdminCompaniesPage: React.FC<SuperAdminCompaniesPageProps> = ({ onNavigate }) => {
  const { token, hasPermission } = useSuperAdmin();
  const [companies, setCompanies] = useState<CompanyWithPlatformMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [onlineFilter, setOnlineFilter] = useState<string>('all');

  // Action Modals State
  const [selectedCompany, setSelectedCompany] = useState<CompanyWithPlatformMetrics | null>(null);
  const [actionType, setActionType] = useState<'suspend' | 'activate' | 'extend' | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [extensionDays, setExtensionDays] = useState<number>(30);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchCompanies = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const { ok, data } = await safeFetchJson<any>('/api/super-admin/companies', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ok && data?.success) {
        setCompanies(data.companies || []);
      }
    } catch (err) {
      console.error('Failed to fetch companies:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [token]);

  const filteredCompanies = companies.filter(comp => {
    const matchesSearch =
      comp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comp.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comp.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comp.id?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || (comp.status || 'active') === statusFilter;
    const matchesOnline =
      onlineFilter === 'all' ||
      (onlineFilter === 'online' && comp.is_online) ||
      (onlineFilter === 'offline' && !comp.is_online);

    return matchesSearch && matchesStatus && matchesOnline;
  });

  const handleStatusChange = async () => {
    if (!selectedCompany || !actionType) return;
    setSubmittingAction(true);
    setActionError(null);

    const targetStatus = actionType === 'suspend' ? 'suspended' : 'active';
    try {
      const { ok, data, error } = await safeFetchJson<any>(`/api/super-admin/companies/${selectedCompany.id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: targetStatus,
          reason: actionReason,
        }),
      });

      if (ok && data?.success) {
        setActionType(null);
        setSelectedCompany(null);
        setActionReason('');
        await fetchCompanies();
      } else {
        setActionError(data?.error || error || 'فشل تحديث حالة الشركة');
      }
    } catch (err: any) {
      setActionError(err.message || 'حدث خطأ في الخادم');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleExtendSubscription = async () => {
    if (!selectedCompany) return;
    setSubmittingAction(true);
    setActionError(null);

    try {
      const { ok, data, error } = await safeFetchJson<any>(`/api/super-admin/companies/${selectedCompany.id}/subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          extensionDays,
        }),
      });

      if (ok && data?.success) {
        setActionType(null);
        setSelectedCompany(null);
        await fetchCompanies();
      } else {
        setActionError(data?.error || error || 'فشل تمديد الاشتراك');
      }
    } catch (err: any) {
      setActionError(err.message || 'حدث خطأ في الخادم');
    } finally {
      setSubmittingAction(false);
    }
  };

  const getStatusBadge = (status: string = 'active') => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            نشطة
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5" />
            موقوفة مؤقتاً
          </span>
        );
      case 'disabled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5" />
            معطلة
          </span>
        );
      case 'trial':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Clock className="w-3.5 h-3.5" />
            فترة تجريبية
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div id="super-admin-companies-view" className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-400" />
            <h1 className="text-xl font-black text-white">إدارة شركات الشحن (SaaS Multi-Tenants)</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            عرض وتفعيل وإيقاف وتمديد اشتراكات جميع شركات الشحن المشتركة في منصة DELIXA
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchCompanies(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالاسم، البريد، أو الهاتف..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2 pr-10 pl-4 text-xs text-white placeholder-slate-500 outline-hidden transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-3 py-2 text-xs font-semibold outline-hidden focus:border-blue-500"
          >
            <option value="all">كافة الحالات</option>
            <option value="active">النشطة فقط</option>
            <option value="suspended">الموقوفة مؤقتاً</option>
            <option value="disabled">المعطلة</option>
            <option value="trial">الفترة التجريبية</option>
          </select>

          {/* Online Filter */}
          <select
            value={onlineFilter}
            onChange={(e) => setOnlineFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-3 py-2 text-xs font-semibold outline-hidden focus:border-blue-500"
          >
            <option value="all">كافة الاتصالات</option>
            <option value="online">المتصلة الآن 🟢</option>
            <option value="offline">غير المتصلة</option>
          </select>
        </div>
      </div>

      {/* Companies Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="text-xs font-semibold">جاري جلب بيانات الشركات...</span>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="text-center p-16 text-slate-400">
            <Building2 className="w-12 h-12 mx-auto text-slate-600 mb-3" />
            <div className="text-sm font-bold text-white">لا توجد شركات مطابقة</div>
            <div className="text-xs text-slate-500 mt-1">جرب تغيير كلمات البحث أو الفلاتر</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-bold border-b border-slate-800 uppercase">
                <tr>
                  <th className="py-3.5 px-4">الشركة</th>
                  <th className="py-3.5 px-4">الحالة</th>
                  <th className="py-3.5 px-4">الاتصال اللحظي</th>
                  <th className="py-3.5 px-4">الباقة والاشتراك</th>
                  <th className="py-3.5 px-4">المناديب / المتاجر</th>
                  <th className="py-3.5 px-4">إجمالي الشحنات</th>
                  <th className="py-3.5 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredCompanies.map((comp) => {
                  return (
                    <tr key={comp.id} className="hover:bg-slate-800/40 transition">
                      {/* Company Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">
                            {comp.name ? comp.name.charAt(0) : 'D'}
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm">{comp.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{comp.email || comp.phone || 'بدون بريد'}</div>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {getStatusBadge(comp.status)}
                      </td>

                      {/* Online Status */}
                      <td className="py-3.5 px-4">
                        {comp.is_online ? (
                          <div className="flex items-center gap-2 text-emerald-400 font-bold">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span>متصلة الآن</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-medium">غير متصلة</span>
                        )}
                      </td>

                      {/* Plan */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-200">{comp.plan_name || 'باقة النمو'}</div>
                        <div className="text-[10px] text-slate-400">
                          ينتهي: {comp.subscription_end_date ? new Date(comp.subscription_end_date).toLocaleDateString('ar-EG') : 'غير محدد'}
                        </div>
                      </td>

                      {/* Counts */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-300">
                          {comp.couriers_count} مناديب • {comp.merchants_count} متجر
                        </div>
                      </td>

                      {/* Orders Count & COD */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">{comp.orders_count} شحنة</div>
                        <div className="text-[10px] text-emerald-400">{(comp.total_cod_volume || 0).toLocaleString()} ج.م تحصيل</div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onNavigate(`/super-admin/companies/${comp.id}`)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white rounded-lg font-semibold transition"
                          >
                            التفاصيل
                          </button>

                          {hasPermission('companies.suspend') && comp.status === 'active' && (
                            <button
                              onClick={() => {
                                setSelectedCompany(comp);
                                setActionType('suspend');
                              }}
                              className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 rounded-lg font-semibold transition"
                            >
                              إيقاف
                            </button>
                          )}

                          {hasPermission('companies.suspend') && comp.status === 'suspended' && (
                            <button
                              onClick={() => {
                                setSelectedCompany(comp);
                                setActionType('activate');
                              }}
                              className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 rounded-lg font-semibold transition"
                            >
                              تفعيل
                            </button>
                          )}

                          {hasPermission('subscriptions.edit') && (
                            <button
                              onClick={() => {
                                setSelectedCompany(comp);
                                setActionType('extend');
                              }}
                              className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white rounded-lg font-semibold transition"
                            >
                              تمديد
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Modals */}
      {actionType && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-white">
              {actionType === 'suspend' && `إيقاف شركة: ${selectedCompany.name}`}
              {actionType === 'activate' && `إعادة تفعيل شركة: ${selectedCompany.name}`}
              {actionType === 'extend' && `تمديد اشتراك: ${selectedCompany.name}`}
            </h3>

            {actionError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
                {actionError}
              </div>
            )}

            {actionType === 'suspend' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-300">
                  عند إيقاف الشركة، لن يتمكن مدير الشركة أو المناديب من تسجيل الدخول أو إتمام أي عمليات، وستظهر لهم رسالة تفيد بمراجعة إدارة المنصة.
                </p>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">سبب الإيقاف (اختياري)</label>
                  <textarea
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="مثال: انتهاء مدة الاشتراك ولم يتم السداد..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:border-amber-500 outline-hidden"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {actionType === 'activate' && (
              <p className="text-xs text-slate-300">
                هل أنت متأكد من إعادة تفعيل شركة <strong>{selectedCompany.name}</strong>؟ ستستعيد الشركة صلاحيات الدخول فوراً.
              </p>
            )}

            {actionType === 'extend' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-300">
                  اختر عدد الأيام الإضافية لتمديد اشتراك الشركة:
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[7, 14, 30].map(days => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setExtensionDays(days)}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        extensionDays === days
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      +{days} يوم
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setActionType(null);
                  setSelectedCompany(null);
                }}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700 transition"
              >
                إلغاء
              </button>

              <button
                type="button"
                disabled={submittingAction}
                onClick={actionType === 'extend' ? handleExtendSubscription : handleStatusChange}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition ${
                  actionType === 'suspend' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-blue-600 hover:bg-blue-500'
                }`}
              >
                {submittingAction && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>تأكيد الإجراء</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
