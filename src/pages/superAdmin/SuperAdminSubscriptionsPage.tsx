import React, { useState, useEffect } from 'react';
import {
  Layers,
  CheckCircle2,
  Plus,
  Edit2,
  Clock,
  AlertTriangle,
  Building2,
  Loader2,
  RefreshCw,
  Zap,
  Tag
} from 'lucide-react';
import { useSuperAdmin } from '../../contexts/SuperAdminContext';
import { PlatformSubscription, PlatformSubscriptionPlan } from '../../types';
import { safeFetchJson } from '../../utils/apiClient';

interface SuperAdminSubscriptionsPageProps {
  onNavigate: (path: string) => void;
}

export const SuperAdminSubscriptionsPage: React.FC<SuperAdminSubscriptionsPageProps> = ({ onNavigate }) => {
  const { token, hasPermission } = useSuperAdmin();
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'plans'>('subscriptions');
  const [subscriptions, setSubscriptions] = useState<PlatformSubscription[]>([]);
  const [plans, setPlans] = useState<PlatformSubscriptionPlan[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Plan Modal
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlatformSubscriptionPlan | null>(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    code: '',
    price: 999,
    currency: 'EGP',
    billing_cycle: 'monthly' as 'monthly' | 'quarterly' | 'yearly',
    trial_days: 14,
    order_limit: 1500,
    courier_limit: 10,
    merchant_limit: 50,
    featuresText: 'إدارة الطلبات\nمناديب التوصيل\nالمتاجر والتجار\nرابط تتبع العميل',
    is_active: true,
  });
  const [submittingPlan, setSubmittingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  const fetchSubscriptions = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const { ok, data } = await safeFetchJson<any>('/api/super-admin/subscriptions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ok && data?.success) {
        setSubscriptions(data.subscriptions || []);
        setPlans(data.plans || []);
        setCompanies(data.companies || []);
      }
    } catch (err) {
      console.error('Failed to load subscriptions:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [token]);

  const handleOpenCreatePlan = () => {
    setEditingPlan(null);
    setPlanForm({
      name: '',
      code: '',
      price: 999,
      currency: 'EGP',
      billing_cycle: 'monthly',
      trial_days: 14,
      order_limit: 1500,
      courier_limit: 10,
      merchant_limit: 50,
      featuresText: 'إدارة الطلبات\nمناديب التوصيل\nالمتاجر والتجار\nرابط تتبع العميل',
      is_active: true,
    });
    setPlanError(null);
    setIsPlanModalOpen(true);
  };

  const handleOpenEditPlan = (plan: PlatformSubscriptionPlan) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      code: plan.code,
      price: plan.price,
      currency: plan.currency,
      billing_cycle: plan.billing_cycle,
      trial_days: plan.trial_days,
      order_limit: plan.order_limit,
      courier_limit: plan.courier_limit,
      merchant_limit: plan.merchant_limit,
      featuresText: (plan.features || []).join('\n'),
      is_active: plan.is_active,
    });
    setPlanError(null);
    setIsPlanModalOpen(true);
  };

  const handleSubmitPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planForm.name || !planForm.code) {
      setPlanError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setSubmittingPlan(true);
    setPlanError(null);

    const payload = {
      ...planForm,
      features: planForm.featuresText.split('\n').map(f => f.trim()).filter(Boolean),
    };

    try {
      const url = editingPlan ? `/api/super-admin/plans/${editingPlan.id}` : '/api/super-admin/plans';
      const method = editingPlan ? 'PUT' : 'POST';

      const { ok, data, error } = await safeFetchJson<any>(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (ok && data?.success) {
        setIsPlanModalOpen(false);
        await fetchSubscriptions();
      } else {
        setPlanError(data?.error || error || 'فشل حفظ الباقة');
      }
    } catch (err: any) {
      setPlanError(err.message || 'حدث خطأ في الخادم');
    } finally {
      setSubmittingPlan(false);
    }
  };

  return (
    <div id="super-admin-subscriptions-view" className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-400" />
            <h1 className="text-xl font-black text-white">إدارة الباقات واشتراكات الشركات</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            متابعة الاشتراكات الفعالة، الفترات التجريبية، وتعديل أسعار وباقات المنصة
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchSubscriptions(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>

          {hasPermission('subscriptions.edit') && (
            <button
              onClick={handleOpenCreatePlan}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إنشاء باقة جديدة</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'subscriptions'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>اشتراكات الشركات ({subscriptions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('plans')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'plans'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>باقات الاشتراك ({plans.length})</span>
        </button>
      </div>

      {/* Tab 1: Subscriptions Table */}
      {activeTab === 'subscriptions' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-16 text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <span className="text-xs font-semibold">جاري جلب الاشتراكات...</span>
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="text-center p-16 text-slate-400 text-xs">لا توجد اشتراكات مسجلة حالياً</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">الشركة</th>
                    <th className="py-3.5 px-4">الباقة</th>
                    <th className="py-3.5 px-4">الحالة</th>
                    <th className="py-3.5 px-4">تاريخ البدء</th>
                    <th className="py-3.5 px-4">تاريخ الانتهاء</th>
                    <th className="py-3.5 px-4">الأيام المتبقية</th>
                    <th className="py-3.5 px-4 text-center">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {subscriptions.map((sub) => {
                    const days = sub.days_remaining !== undefined ? sub.days_remaining : 0;
                    return (
                      <tr key={sub.id} className="hover:bg-slate-800/40">
                        <td className="py-3.5 px-4 font-bold text-white">
                          <button
                            onClick={() => onNavigate(`/super-admin/companies/${sub.company_id}`)}
                            className="hover:underline text-blue-400 text-right"
                          >
                            {sub.company_name}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-200">{sub.plan_name}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              sub.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : sub.status === 'trial'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {sub.status === 'active' ? 'نشط' : sub.status === 'trial' ? 'تجريبي' : sub.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">{sub.start_date}</td>
                        <td className="py-3.5 px-4 text-slate-300 font-semibold">{sub.end_date}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`font-bold ${
                              days > 7 ? 'text-emerald-400' : days > 0 ? 'text-amber-400' : 'text-rose-400'
                            }`}
                          >
                            {days > 0 ? `${days} يوم متبقي` : 'منتهي الصلاحية'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => onNavigate(`/super-admin/companies/${sub.company_id}`)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition"
                          >
                            إدارة الاشتراك
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Plans Grid */}
      {activeTab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-slate-900 border border-slate-800 hover:border-blue-500/40 rounded-2xl p-6 shadow-xl flex flex-col justify-between transition"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {plan.code}
                  </span>
                  {plan.is_active ? (
                    <span className="text-[11px] font-bold text-emerald-400">مفعلة</span>
                  ) : (
                    <span className="text-[11px] font-bold text-slate-500">معطلة</span>
                  )}
                </div>

                <h3 className="text-lg font-black text-white">{plan.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">{plan.price}</span>
                  <span className="text-xs text-slate-400 font-bold">{plan.currency || 'EGP'} / {plan.billing_cycle === 'monthly' ? 'شهرياً' : plan.billing_cycle}</span>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-800 space-y-2 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">حد الشحنات:</span>
                    <span className="font-bold text-white">{plan.order_limit} شحنة</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">حد المناديب:</span>
                    <span className="font-bold text-white">{plan.courier_limit} مناديب</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">حد المتاجر:</span>
                    <span className="font-bold text-white">{plan.merchant_limit} متجر</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">أيام التجربة المجانية:</span>
                    <span className="font-bold text-white">{plan.trial_days} يوم</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-800 space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-400 block mb-2">الميزات المشمولة:</span>
                  {(plan.features || []).map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800">
                {hasPermission('subscriptions.edit') && (
                  <button
                    onClick={() => handleOpenEditPlan(plan)}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>تعديل الباقة</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Plan Create / Edit Modal */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white">
              {editingPlan ? `تعديل باقة: ${editingPlan.name}` : 'إنشاء باقة اشتراك جديدة'}
            </h3>

            {planError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
                {planError}
              </div>
            )}

            <form onSubmit={handleSubmitPlan} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">اسم الباقة</label>
                  <input
                    type="text"
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                    placeholder="باقة النمو"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-hidden focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">كود الباقة (Code)</label>
                  <input
                    type="text"
                    value={planForm.code}
                    disabled={Boolean(editingPlan)}
                    onChange={(e) => setPlanForm({ ...planForm, code: e.target.value })}
                    placeholder="growth"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-hidden focus:border-blue-500 disabled:opacity-50 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">السعر</label>
                  <input
                    type="number"
                    value={planForm.price}
                    onChange={(e) => setPlanForm({ ...planForm, price: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-hidden focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">العملة</label>
                  <input
                    type="text"
                    value={planForm.currency}
                    onChange={(e) => setPlanForm({ ...planForm, currency: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">دورة الفوترة</label>
                  <select
                    value={planForm.billing_cycle}
                    onChange={(e) => setPlanForm({ ...planForm, billing_cycle: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-hidden focus:border-blue-500"
                  >
                    <option value="monthly">شهري</option>
                    <option value="quarterly">ربع سنوي</option>
                    <option value="yearly">سنوي</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">حد الطلبات</label>
                  <input
                    type="number"
                    value={planForm.order_limit}
                    onChange={(e) => setPlanForm({ ...planForm, order_limit: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">حد المناديب</label>
                  <input
                    type="number"
                    value={planForm.courier_limit}
                    onChange={(e) => setPlanForm({ ...planForm, courier_limit: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">حد المتاجر</label>
                  <input
                    type="number"
                    value={planForm.merchant_limit}
                    onChange={(e) => setPlanForm({ ...planForm, merchant_limit: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">الميزات (سطر لكل ميزة)</label>
                <textarea
                  value={planForm.featuresText}
                  onChange={(e) => setPlanForm({ ...planForm, featuresText: e.target.value })}
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="plan-active-check"
                  checked={planForm.is_active}
                  onChange={(e) => setPlanForm({ ...planForm, is_active: e.target.checked })}
                  className="rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-0"
                />
                <label htmlFor="plan-active-check" className="text-slate-300 font-bold">تفعيل الباقة للمنصة</label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700 transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submittingPlan}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  {submittingPlan && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>حفظ الباقة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
