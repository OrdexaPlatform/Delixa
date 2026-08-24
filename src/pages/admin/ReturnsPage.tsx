import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { db, RETURN_REASONS } from '../../lib/db';
import { ReturnRecord, ReturnStatus, Order, Merchant, Courier } from '../../types';
import { ReturnInvoiceModal } from '../../components/returns/ReturnInvoiceModal';
import { CreateReturnModal } from '../../components/returns/CreateReturnModal';
import { 
  RotateCcw, 
  Plus, 
  Search, 
  Filter, 
  Printer, 
  Truck, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  DollarSign, 
  FileText, 
  Store, 
  User, 
  MapPin, 
  Calendar, 
  ChevronRight, 
  ChevronLeft,
  RefreshCw,
  AlertCircle,
  MoreVertical,
  X
} from 'lucide-react';

export const ReturnsPage: React.FC = () => {
  const { t, isRTL } = useLanguage();
  const { showToast } = useToast();
  const { session } = useAuth();
  const companyId = session?.company?.id || '';
  const isCourier = session?.profile?.role === 'courier';
  const courierId = session?.courier?.id;

  // Data state
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [ordersMap, setOrdersMap] = useState<Record<string, Order>>({});
  const [merchantsMap, setMerchantsMap] = useState<Record<string, Merchant>>({});
  const [couriersMap, setCouriersMap] = useState<Record<string, Courier>>({});
  const [couriersList, setCouriersList] = useState<Courier[]>([]);
  const [merchantsList, setMerchantsList] = useState<Merchant[]>([]);
  const [metrics, setMetrics] = useState({ total: 0, created: 0, with_courier: 0, returned: 0, cancelled: 0, total_amount: 0 });

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [merchantFilter, setMerchantFilter] = useState<string>('all');
  const [courierFilter, setCourierFilter] = useState<string>(isCourier && courierId ? courierId : 'all');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedReturnForInvoice, setSelectedReturnForInvoice] = useState<ReturnRecord | null>(null);
  const [selectedReturnForStatus, setSelectedReturnForStatus] = useState<ReturnRecord | null>(null);

  const loadData = async () => {
    if (!companyId) return;

    const rets = isCourier && courierId 
      ? await db.getReturns(companyId, courierId) 
      : await db.getReturns(companyId);
    setReturns(rets);
    const m = await db.getReturnMetrics(companyId, isCourier ? courierId : undefined);
    setMetrics({
      total: m.totalReturns,
      created: m.createdCount,
      with_courier: m.withCourierCount,
      returned: m.returnedCount,
      cancelled: m.cancelledCount,
      total_amount: m.totalReturnValue,
    });

    const ords = await db.getOrders(companyId);
    const oMap: Record<string, Order> = {};
    ords.forEach(o => { oMap[o.id] = o; });
    setOrdersMap(oMap);

    const mList = await db.getMerchants(companyId);
    setMerchantsList(mList);
    const mMap: Record<string, Merchant> = {};
    mList.forEach(m => { mMap[m.id] = m; });
    setMerchantsMap(mMap);

    const cList = await db.getCouriers(companyId);
    setCouriersList(cList);
    const cMap: Record<string, Courier> = {};
    cList.forEach(c => { cMap[c.id] = c; });
    setCouriersMap(cMap);
  };

  useEffect(() => {
    loadData();
  }, [companyId]);

  // Status badge styling helper
  const renderStatusBadge = (status: ReturnStatus) => {
    switch (status) {
      case 'created':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-500" />
            {t.statusReturnCreated}
          </span>
        );
      case 'with_courier':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Truck className="w-3 h-3 text-blue-500" />
            {t.statusReturnWithCourier}
          </span>
        );
      case 'returned':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            {t.statusReturnReturned}
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-500" />
            {t.statusReturnCancelled}
          </span>
        );
      default:
        return null;
    }
  };

  const getReasonLabel = (reasonKey: string) => {
    const found = RETURN_REASONS.find(r => r.id === reasonKey);
    if (found) {
      return isRTL ? found.label : found.enLabel;
    }
    return reasonKey;
  };

  // Status Change Handler
  const handleUpdateStatus = async (returnId: string, newStatus: ReturnStatus, courierIdParam?: string) => {
    try {
      if (courierIdParam !== undefined && !isCourier) {
        await db.updateReturn(
          companyId,
          returnId,
          { courier_id: courierIdParam || null },
          { role: 'admin', name: session?.profile.full_name || 'Admin' }
        );
      }

      await db.updateReturnStatus(
        companyId, 
        returnId, 
        newStatus, 
        { 
          role: isCourier ? 'courier' : 'admin', 
          name: isCourier ? (session?.courier?.full_name || 'مندوب التوصيل') : (session?.profile.full_name || 'Admin')
        }
      );

      showToast(
        'success',
        'تم تحديث حالة الإرجاع بنجاح',
        `تم تغيير الحالة إلى: ${newStatus}`
      );

      setSelectedReturnForStatus(null);
      loadData();
    } catch (err: any) {
      showToast(
        'error',
        'فشل التحديث',
        err.message || 'تعذر تغيير حالة الإرجاع'
      );
    }
  };

  // Filtered Returns
  const filteredReturns = useMemo(() => {
    return returns.filter(ret => {
      const order = ordersMap[ret.order_id];
      const merchant = order ? merchantsMap[order.merchant_id] : null;

      // Status filter
      if (statusFilter !== 'all' && ret.status !== statusFilter) {
        return false;
      }

      // Merchant filter
      if (merchantFilter !== 'all' && order?.merchant_id !== merchantFilter) {
        return false;
      }

      // Courier filter
      if (courierFilter !== 'all' && ret.courier_id !== courierFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const returnNumMatch = ret.return_number.toLowerCase().includes(q);
        const orderNumMatch = order?.order_number.toLowerCase().includes(q) || false;
        const customerNameMatch = ret.customer_name.toLowerCase().includes(q);
        const customerPhoneMatch = ret.customer_phone.includes(q);
        const merchantMatch = merchant?.store_name.toLowerCase().includes(q) || false;

        if (!returnNumMatch && !orderNumMatch && !customerNameMatch && !customerPhoneMatch && !merchantMatch) {
          return false;
        }
      }

      return true;
    });
  }, [returns, ordersMap, merchantsMap, statusFilter, merchantFilter, courierFilter, searchQuery]);

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-rose-600" />
            <span>{t.returnsTitle}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t.returnsSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isCourier && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{t.createReturn}</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">{t.returnsCountStat}</div>
            <div className="text-xl font-black font-mono text-slate-900 mt-0.5">{metrics.total}</div>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">{t.returnsWithCourierStat}</div>
            <div className="text-xl font-black font-mono text-slate-900 mt-0.5">{metrics.with_courier}</div>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">{t.returnsCompletedStat}</div>
            <div className="text-xl font-black font-mono text-slate-900 mt-0.5">{metrics.returned}</div>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">{t.returnsTotalValueStat}</div>
            <div className="text-lg font-black font-mono text-slate-900 mt-0.5">
              {metrics.total_amount.toLocaleString()} <span className="text-xs font-bold text-slate-500">{t.currency}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute top-3 start-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="رقم الإرجاع، الشحنة، العميل، الهاتف..."
              className="w-full ps-9 pe-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="all">{t.allStatuses}</option>
              <option value="created">{t.statusReturnCreated}</option>
              <option value="with_courier">{t.statusReturnWithCourier}</option>
              <option value="returned">{t.statusReturnReturned}</option>
              <option value="cancelled">{t.statusReturnCancelled}</option>
            </select>
          </div>

          {/* Merchant Filter */}
          <div>
            <select
              value={merchantFilter}
              onChange={e => setMerchantFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="all">{t.allMerchants}</option>
              {merchantsList.map(m => (
                <option key={m.id} value={m.id}>
                  {m.store_name}
                </option>
              ))}
            </select>
          </div>

          {/* Courier Filter */}
          <div>
            <select
              value={courierFilter}
              onChange={e => setCourierFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="all">{t.allCouriers}</option>
              {couriersList.map(c => (
                <option key={c.id} value={c.id}>
                  {c.full_name} ({c.employee_id})
                </option>
              ))}
            </select>
          </div>

        </div>

        {(searchQuery || statusFilter !== 'all' || merchantFilter !== 'all' || courierFilter !== 'all') && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span>تم العثور على {filteredReturns.length} سجل إرجاع</span>
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setMerchantFilter('all');
                setCourierFilter('all');
              }}
              className="text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>{t.clearFilters}</span>
            </button>
          </div>
        )}
      </div>

      {/* Returns Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredReturns.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div className="font-bold text-slate-800 text-sm">{t.noReturnsFound}</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              يمكنك إنشاء طلب إرجاع جديد بالضغط على زر "إنشاء طلب إرجاع" أو من داخل تفاصيل الشحنة المسلمة أو المتعثرة.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm inline-flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.createReturn}</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 text-start">{t.returnNumber}</th>
                  <th className="py-3 px-4 text-start">{t.originalOrder} / المتجر</th>
                  <th className="py-3 px-4 text-start">{t.returnCustomerInfo}</th>
                  <th className="py-3 px-4 text-start">{t.assignedReturnCourier}</th>
                  <th className="py-3 px-4 text-start">{t.returnReason}</th>
                  <th className="py-3 px-4 text-end">{t.totalReturnAmount}</th>
                  <th className="py-3 px-4 text-center">{t.returnStatus}</th>
                  <th className="py-3 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReturns.map(ret => {
                  const order = ordersMap[ret.order_id];
                  const merchant = order ? merchantsMap[order.merchant_id] : null;
                  const courier = ret.courier_id ? couriersMap[ret.courier_id] : null;

                  return (
                    <tr key={ret.id} className="hover:bg-slate-50/80 transition-colors">
                      
                      {/* Return Number & Date */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-black text-rose-600 text-xs">
                          {ret.return_number}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(ret.created_at).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>

                      {/* Order & Merchant */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-blue-700 text-xs flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-blue-500" />
                          <span>{order?.order_number || '—'}</span>
                        </div>
                        <div className="text-[11px] text-slate-600 font-medium mt-0.5 flex items-center gap-1">
                          <Store className="w-3 h-3 text-slate-400" />
                          <span>{merchant?.store_name || '—'}</span>
                        </div>
                      </td>

                      {/* Customer & Address */}
                      <td className="py-3.5 px-4 max-w-[200px]">
                        <div className="font-bold text-slate-800 text-xs truncate">
                          {ret.customer_name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono truncate">
                          {ret.customer_phone}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5 flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">{ret.return_address}</span>
                        </div>
                      </td>

                      {/* Courier */}
                      <td className="py-3.5 px-4">
                        {courier ? (
                          <div>
                            <div className="font-bold text-slate-800 text-xs flex items-center gap-1">
                              <Truck className="w-3.5 h-3.5 text-slate-400" />
                              <span>{courier.full_name}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {courier.employee_id} • {courier.area}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            {t.unassignedReturnCourier}
                          </span>
                        )}
                      </td>

                      {/* Reason */}
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-semibold">
                          {getReasonLabel(ret.return_reason)}
                        </span>
                        {ret.other_reason && (
                          <div className="text-[10px] text-slate-500 italic mt-0.5 truncate max-w-[130px]">
                            {ret.other_reason}
                          </div>
                        )}
                      </td>

                      {/* Financial Total */}
                      <td className="py-3.5 px-4 text-end">
                        <div className="font-mono font-bold text-slate-900 text-xs">
                          {Number(ret.total_return_amount).toLocaleString()} {t.currency}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          بضاعة: {Number(ret.return_amount).toLocaleString()} + شحن: {Number(ret.return_shipping_cost).toLocaleString()}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {renderStatusBadge(ret.status)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          
                          {/* Print / View Invoice Button */}
                          <button
                            onClick={() => setSelectedReturnForInvoice(ret)}
                            title={t.printReturnInvoice}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Quick Status Workflow Action Button */}
                          {ret.status === 'created' && (
                            <button
                              onClick={() => setSelectedReturnForStatus(ret)}
                              title={t.startReturnAction}
                              className="px-2 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-[10px] font-bold border border-amber-200 transition-colors"
                            >
                              بدء النقل
                            </button>
                          )}

                          {ret.status === 'with_courier' && (
                            <button
                              onClick={() => setSelectedReturnForStatus(ret)}
                              title={t.markReturnCompleted}
                              className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-[10px] font-bold border border-emerald-200 transition-colors"
                            >
                              تأكيد الإرجاع
                            </button>
                          )}

                          {ret.status !== 'created' && ret.status !== 'with_courier' && (
                            <button
                              onClick={() => setSelectedReturnForStatus(ret)}
                              title="تعديل الحالة"
                              className="p-1.5 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
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

      {/* Modals */}
      {/* 1. Create Return Modal */}
      <CreateReturnModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => loadData()}
        companyId={companyId}
      />

      {/* 2. Print / View Invoice Modal */}
      {selectedReturnForInvoice && (
        <ReturnInvoiceModal
          isOpen={Boolean(selectedReturnForInvoice)}
          onClose={() => setSelectedReturnForInvoice(null)}
          returnRecord={selectedReturnForInvoice}
          order={ordersMap[selectedReturnForInvoice.order_id] || null}
          merchant={ordersMap[selectedReturnForInvoice.order_id] ? merchantsMap[ordersMap[selectedReturnForInvoice.order_id].merchant_id] : null}
          courier={selectedReturnForInvoice.courier_id ? couriersMap[selectedReturnForInvoice.courier_id] : null}
          companyName={session?.company?.name || 'Delixa Logistics'}
          companyPhone={session?.company?.phone}
          companyAddress={session?.company?.address}
        />
      )}

      {/* 3. Status Change / Reassign Modal */}
      {selectedReturnForStatus && (
        <ReturnStatusChangeModal
          isOpen={Boolean(selectedReturnForStatus)}
          onClose={() => setSelectedReturnForStatus(null)}
          returnRecord={selectedReturnForStatus}
          couriers={couriersList}
          onUpdate={handleUpdateStatus}
        />
      )}

    </div>
  );
};

interface ReturnStatusChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnRecord: ReturnRecord;
  couriers: Courier[];
  onUpdate: (returnId: string, status: ReturnStatus, courierId?: string) => void;
}

const ReturnStatusChangeModal: React.FC<ReturnStatusChangeModalProps> = ({
  isOpen,
  onClose,
  returnRecord,
  couriers,
  onUpdate
}) => {
  const { t } = useLanguage();
  const [targetStatus, setTargetStatus] = useState<ReturnStatus>(returnRecord.status);
  const [courierId, setCourierId] = useState<string>(returnRecord.courier_id || '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">تحديث حالة الإرجاع والمندوب</h3>
              <p className="text-[11px] text-slate-500 font-mono">{returnRecord.return_number}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">حالة الإرجاع:</label>
            <select
              value={targetStatus}
              onChange={e => setTargetStatus(e.target.value as ReturnStatus)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="created">{t.statusReturnCreated}</option>
              <option value="with_courier">{t.statusReturnWithCourier}</option>
              <option value="returned">{t.statusReturnReturned}</option>
              <option value="cancelled">{t.statusReturnCancelled}</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">{t.assignedReturnCourier}:</label>
            <select
              value={courierId}
              onChange={e => setCourierId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="">{t.unassignedReturnCourier}</option>
              {couriers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.full_name} ({c.employee_id}) — {c.area}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
          >
            {t.cancel}
          </button>
          <button
            onClick={() => onUpdate(returnRecord.id, targetStatus, courierId || undefined)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
          >
            {t.saveChanges}
          </button>
        </div>

      </div>
    </div>
  );
};
