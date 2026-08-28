import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCcw,
  DollarSign,
  Receipt,
  Loader2
} from 'lucide-react';
import { useSuperAdmin } from '../../contexts/SuperAdminContext';
import { PlatformPayment } from '../../types';
import { safeFetchJson } from '../../utils/apiClient';

interface SuperAdminPaymentsPageProps {
  onNavigate: (path: string) => void;
}

export const SuperAdminPaymentsPage: React.FC<SuperAdminPaymentsPageProps> = ({ onNavigate }) => {
  const { token, hasPermission } = useSuperAdmin();
  const [payments, setPayments] = useState<PlatformPayment[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Manual Payment Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [form, setForm] = useState({
    company_id: '',
    plan_name: 'اشتراك شهري',
    amount: 999,
    currency: 'EGP',
    payment_method: 'instapay' as any,
    transaction_id: '',
    status: 'paid' as any,
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchPayments = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [payRes, compRes] = await Promise.all([
        safeFetchJson<any>('/api/super-admin/payments', { headers: { Authorization: `Bearer ${token}` } }),
        safeFetchJson<any>('/api/super-admin/companies', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (payRes.ok && payRes.data?.success) {
        setPayments(payRes.data.payments || []);
        setSummary(payRes.data.summary || null);
      }

      if (compRes.ok && compRes.data?.success) {
        setCompanies(compRes.data.companies || []);
        if (compRes.data.companies?.length > 0 && !form.company_id) {
          setForm(f => ({ ...f, company_id: compRes.data.companies[0].id }));
        }
      }
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [token]);

  const filteredPayments = payments.filter(p => {
    const matchesSearch =
      p.payment_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.transaction_id?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company_id || !form.amount) {
      setFormError('يرجى اختيار الشركة وإدخال المبلغ');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const { ok, data, error } = await safeFetchJson<any>('/api/super-admin/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (ok && data?.success) {
        setIsModalOpen(false);
        await fetchPayments();
      } else {
        setFormError(data?.error || error || 'فشل تسجيل الدفعة');
      }
    } catch (err: any) {
      setFormError(err.message || 'حدث خطأ في الخادم');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="super-admin-payments-view" className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-400" />
            <h1 className="text-xl font-black text-white">إدارة المدفوعات وإيرادات المنصة</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            توثيق المعاملات المالية، الاشتراكات، وبوابات الدفع (InstaPay, Vodafone Cash, Paymob, Stripe)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchPayments(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>

          {hasPermission('payments.edit') && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>تسجيل دفعة يدوية</span>
            </button>
          )}
        </div>
      </div>

      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <span className="text-xs font-bold text-slate-400">إجمالي الإيرادات المسجلة</span>
          <div className="mt-2 text-2xl font-black text-emerald-400">
            {(summary?.totalRevenue || 0).toLocaleString()} <span className="text-xs text-slate-400">ج.م</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <span className="text-xs font-bold text-slate-400">إيرادات هذا الشهر</span>
          <div className="mt-2 text-2xl font-black text-white">
            {(summary?.revenueThisMonth || 0).toLocaleString()} <span className="text-xs text-slate-400">ج.م</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <span className="text-xs font-bold text-slate-400">إيرادات اليوم</span>
          <div className="mt-2 text-2xl font-black text-blue-400">
            {(summary?.revenueToday || 0).toLocaleString()} <span className="text-xs text-slate-400">ج.م</span>
          </div>
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
            placeholder="بحث برقم الدفعة، الشركة، أو المعاملة..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl py-2 pr-10 pl-4 text-xs text-white placeholder-slate-500 outline-hidden transition"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-3 py-2 text-xs font-semibold outline-hidden focus:border-emerald-500 w-full sm:w-auto"
        >
          <option value="all">كافة الحالات</option>
          <option value="paid">مدفوعة بنجاح (Paid)</option>
          <option value="pending">معلقة (Pending)</option>
          <option value="refunded">مسترجعة (Refunded)</option>
          <option value="failed">فاشلة (Failed)</option>
        </select>
      </div>

      {/* Payments Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            <span className="text-xs font-semibold">جاري جلب سجل المدفوعات...</span>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="text-center p-16 text-slate-400 text-xs">لا توجد دفعات مسجلة مطابقة</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">رقم الدفعة</th>
                  <th className="py-3.5 px-4">الشركة</th>
                  <th className="py-3.5 px-4">الباقة / الوصف</th>
                  <th className="py-3.5 px-4">المبلغ</th>
                  <th className="py-3.5 px-4">طريقة الدفع</th>
                  <th className="py-3.5 px-4">الحالة</th>
                  <th className="py-3.5 px-4">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40">
                    <td className="py-3.5 px-4 font-mono font-bold text-white">{p.payment_number}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-200">
                      <button
                        onClick={() => onNavigate(`/super-admin/companies/${p.company_id}`)}
                        className="hover:underline text-blue-400 text-right"
                      >
                        {p.company_name}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">{p.plan_name}</td>
                    <td className="py-3.5 px-4 font-bold text-emerald-400 text-sm">
                      {p.amount.toLocaleString()} {p.currency || 'EGP'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                        {p.payment_method}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          p.status === 'paid'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : p.status === 'pending'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {p.status === 'paid' ? 'مدفوعة' : p.status === 'pending' ? 'معلقة' : p.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(p.payment_date).toLocaleDateString('ar-EG')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Payment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-white">تسجيل دفعة اشتراك يدوية</h3>

            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreatePayment} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">الشركة</label>
                <select
                  value={form.company_id}
                  onChange={(e) => setForm({ ...form, company_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-hidden focus:border-emerald-500"
                  required
                >
                  <option value="">اختر الشركة...</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">المبلغ</label>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-hidden focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">طريقة الدفع</label>
                  <select
                    value={form.payment_method}
                    onChange={(e) => setForm({ ...form, payment_method: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-hidden focus:border-emerald-500"
                  >
                    <option value="instapay">InstaPay</option>
                    <option value="vodafone_cash">فودافون كاش</option>
                    <option value="fawry">فوري (Fawry)</option>
                    <option value="card">بطاقة بنكية (Card)</option>
                    <option value="bank_transfer">تحويل بنكي</option>
                    <option value="cash">نقداً</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">رقم المعاملة / المرجع (اختياري)</label>
                <input
                  type="text"
                  value={form.transaction_id}
                  onChange={(e) => setForm({ ...form, transaction_id: e.target.value })}
                  placeholder="مثال: TXN-984210"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">ملاحظات</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700 transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>حفظ الدفعة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
