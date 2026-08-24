import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { db, RETURN_REASONS } from '../../lib/db';
import { Order, ReturnRecord, ReturnReason, ReturnCostPayer, Merchant, Courier } from '../../types';
import { Modal } from '../common/Modal';
import { 
  RotateCcw, 
  Package, 
  Store, 
  User, 
  MapPin, 
  Phone, 
  DollarSign, 
  Truck, 
  AlertTriangle, 
  FileText, 
  CheckCircle2, 
  HelpCircle,
  Clock,
  Search,
  ShieldCheck,
  Building2
} from 'lucide-react';

interface CreateReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newReturn: ReturnRecord) => void;
  targetOrder?: Order | null;
  companyId: string;
}

export const CreateReturnModal: React.FC<CreateReturnModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  targetOrder,
  companyId
}) => {
  const { t, isRTL } = useLanguage();
  const { showToast } = useToast();
  const { session } = useAuth();

  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [merchantsMap, setMerchantsMap] = useState<Record<string, Merchant>>({});
  const [couriersList, setCouriersList] = useState<Courier[]>([]);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');

  // Form state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [returnAddress, setReturnAddress] = useState('');
  const [returnAmount, setReturnAmount] = useState<number | string>(0);
  const [returnShippingCost, setReturnShippingCost] = useState<number | string>(45);
  const [otherCost, setOtherCost] = useState<number | string>(0);
  
  // Who pays the return cost
  const [returnCostPayer, setReturnCostPayer] = useState<ReturnCostPayer>('customer');
  const [refundableAmount, setRefundableAmount] = useState<number | string>(0);
  const [returnCostAmount, setReturnCostAmount] = useState<number | string>(40);

  const [returnReason, setReturnReason] = useState<ReturnReason>('customer_refused');
  const [otherReason, setOtherReason] = useState('');
  const [notes, setNotes] = useState('');
  const [assignedCourierId, setAssignedCourierId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load merchants, couriers, and eligible orders
  useEffect(() => {
    if (!isOpen || !companyId) return;

    const merchants = db.getMerchants(companyId);
    const mMap: Record<string, Merchant> = {};
    merchants.forEach(m => { mMap[m.id] = m; });
    setMerchantsMap(mMap);

    const couriers = db.getCouriers(companyId).filter(c => c.status === 'active');
    setCouriersList(couriers);

    const allOrders = db.getOrders(companyId);
    const existingReturns = db.getReturns(companyId);
    const returnOrderIds = new Set(existingReturns.map(r => r.order_id));

    // Eligible orders: status is delivered or failed, and no return already registered
    const eligible = allOrders.filter(o => 
      (o.status === 'delivered' || o.status === 'failed') &&
      (!returnOrderIds.has(o.id) || (targetOrder && targetOrder.id === o.id))
    );
    setAvailableOrders(eligible);

    if (targetOrder) {
      initFormForOrder(targetOrder);
    } else if (eligible.length > 0) {
      initFormForOrder(eligible[0]);
    } else {
      setSelectedOrder(null);
    }
  }, [isOpen, companyId, targetOrder]);

  const initFormForOrder = (order: Order) => {
    setSelectedOrder(order);
    setCustomerName(order.customer_name);
    setCustomerPhone(order.customer_phone);
    setReturnAddress(order.customer_address);
    const cod = Number(order.cod_amount) || 0;
    setReturnAmount(cod);
    setRefundableAmount(cod);
    setReturnCostAmount(40);
    setReturnShippingCost(45);
    setOtherCost(0);
    setReturnCostPayer('customer');
    
    // Suggest reason based on order failure reason if applicable
    if (order.status === 'failed' && order.failure_reason) {
      if (order.failure_reason === 'wrong_address') {
        setReturnReason('wrong_address');
      } else if (order.failure_reason === 'customer_unavailable') {
        setReturnReason('customer_unavailable');
      } else {
        setReturnReason('customer_refused');
      }
      setNotes(order.failure_notes || order.failure_note || '');
    } else {
      setReturnReason('customer_refused');
      setNotes('');
    }

    setOtherReason('');
    setAssignedCourierId(order.courier_id || '');
    setErrorMessage(null);
  };

  // Computed totals & dynamic calculations
  const numReturnAmount = Math.max(0, Number(returnAmount) || 0);
  const numShippingCost = Math.max(0, Number(returnShippingCost) || 0);
  const numOtherCost = Math.max(0, Number(otherCost) || 0);
  const totalReturnAmount = numReturnAmount + numShippingCost + numOtherCost;

  const numRefundable = Math.max(0, Number(refundableAmount) || 0);
  const numCost = returnCostPayer === 'none' ? 0 : Math.max(0, Number(returnCostAmount) || 0);

  let customerNetRefund = numRefundable;
  let merchantChargeAmount = 0;

  if (returnCostPayer === 'customer') {
    customerNetRefund = Math.max(0, Math.round((numRefundable - numCost) * 100) / 100);
    merchantChargeAmount = 0;
  } else if (returnCostPayer === 'merchant') {
    customerNetRefund = numRefundable;
    merchantChargeAmount = numCost;
  } else {
    customerNetRefund = numRefundable;
    merchantChargeAmount = 0;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) {
      setErrorMessage('يرجى اختيار الشحنة المراد إرجاعها');
      return;
    }

    if (!customerName.trim()) {
      setErrorMessage('اسم العميل مطلوب');
      return;
    }

    if (!customerPhone.trim()) {
      setErrorMessage('رقم هاتف العميل مطلوب');
      return;
    }

    if (!returnAddress.trim()) {
      setErrorMessage('عنوان استلام المرتجع مطلوب');
      return;
    }

    if (returnCostPayer === 'customer' && numCost > numRefundable) {
      setErrorMessage(`تكلفة الإرجاع (${numCost} ج.م) لا يمكن أن تتجاوز المبلغ القابل للاسترداد (${numRefundable} ج.م)`);
      return;
    }

    if (returnReason === 'other' && !otherReason.trim()) {
      setErrorMessage('يرجى توضيح سبب الإرجاع');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const newReturn = db.createReturn(companyId, {
        order_id: selectedOrder.id,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        return_address: returnAddress.trim(),
        return_amount: numReturnAmount,
        return_shipping_cost: numShippingCost,
        other_cost: numOtherCost,
        return_cost_payer: returnCostPayer,
        refundable_amount: numRefundable,
        return_cost_amount: numCost,
        return_reason: returnReason,
        other_reason: otherReason.trim() || undefined,
        notes: notes.trim() || undefined,
        courier_id: assignedCourierId || null,
        created_by: session?.profile.full_name || 'Admin',
        actorName: session?.profile.full_name || 'Admin'
      });

      showToast(
        'success',
        'تم إنشاء طلب الإرجاع بنجاح',
        `رقم الإرجاع: ${newReturn.return_number} | صافي العميل: ${customerNetRefund.toLocaleString()} ج.م${merchantChargeAmount > 0 ? ` | مديونية التاجر: ${merchantChargeAmount.toLocaleString()} ج.م` : ''}`
      );

      onSuccess(newReturn);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء إنشاء طلب الإرجاع');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEligibleOrders = availableOrders.filter(o => 
    o.order_number.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
    o.customer_name.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
    o.customer_phone.includes(orderSearchQuery)
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t.createReturn}
      subtitle={t.createReturnSubtitle}
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold">تنبيه: </span>
              {errorMessage}
            </div>
          </div>
        )}

        {/* Section 1: Order Selector if not pre-locked */}
        {!targetOrder && (
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              اختر الشحنة المسلمة أو المتعثرة لإنشاء إرجاع لها:
            </label>

            {availableOrders.length === 0 ? (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                لا توجد شحنات مؤهلة للإرجاع حالياً (يجب أن تكون الشحنة في حالة "مسلّمة Delivered" أو "تعذر التسليم Failed" ولم يسجل لها إرجاع مسبق).
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute top-3 start-3 text-slate-400" />
                  <input
                    type="text"
                    value={orderSearchQuery}
                    onChange={e => setOrderSearchQuery(e.target.value)}
                    placeholder="ابحث برقم الشحنة أو اسم العميل أو الهاتف..."
                    className="w-full ps-9 pe-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1.5 p-1 border border-slate-200 rounded-xl bg-slate-50/50">
                  {filteredEligibleOrders.map(ord => {
                    const isSelected = selectedOrder?.id === ord.id;
                    const merchant = merchantsMap[ord.merchant_id];
                    return (
                      <button
                        type="button"
                        key={ord.id}
                        onClick={() => initFormForOrder(ord)}
                        className={`w-full text-start p-2.5 rounded-lg text-xs flex items-center justify-between transition-all ${
                          isSelected 
                            ? 'bg-blue-600 text-white font-bold shadow-sm' 
                            : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{ord.order_number}</span>
                          <span>•</span>
                          <span>{ord.customer_name}</span>
                          {merchant && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${isSelected ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-600'}`}>
                              {merchant.store_name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 font-mono">
                          <span>{Number(ord.cod_amount).toLocaleString()} {t.currency}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                            ord.status === 'delivered' 
                              ? (isSelected ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800') 
                              : (isSelected ? 'bg-rose-700 text-white' : 'bg-rose-100 text-rose-800')
                          }`}>
                            {ord.status === 'delivered' ? 'مسلمة' : 'تعثرت'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Section 2: Read-Only Original Order Snapshot */}
        {selectedOrder && (
          <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/40 border border-blue-100 space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-blue-100">
              <div className="font-bold text-blue-900 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-blue-600" />
                <span>{t.originalOrderDetails}</span>
              </div>
              <span className="font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                {selectedOrder.order_number}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
              <div>
                <span className="text-slate-400 block">{t.navMerchants}:</span>
                <span className="font-bold text-slate-800">{merchantsMap[selectedOrder.merchant_id]?.store_name || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">{t.customerName}:</span>
                <span className="font-bold text-slate-800">{selectedOrder.customer_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block">{t.codAmount}:</span>
                <span className="font-bold text-emerald-700 font-mono">{Number(selectedOrder.cod_amount).toLocaleString()} {t.currency}</span>
              </div>
              <div>
                <span className="text-slate-400 block">{t.orderStatus}:</span>
                <span className="font-bold text-slate-800">{selectedOrder.status}</span>
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Editable Return Customer & Address Information */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-blue-600" />
            <span>{t.returnCustomerInfo}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.customerName} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.phoneLabel} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              عنوان استلام المرتجع <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={returnAddress}
              onChange={e => setReturnAddress(e.target.value)}
              required
              placeholder="العنوان التفصيلي لاستلام الشحنة المرتجعة"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Section 4: Return Financial Calculation & Cost Payer Rules */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span>الحسابات المالية للمرتجع وتحمل التكلفة</span>
            </h3>
            <span className="text-[11px] text-slate-500">حسابات دقيقة للمسترجعات والمديونيات</span>
          </div>

          {/* Selector: Who pays the return cost */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              من يتحمّل تكلفة الإرجاع؟ <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              
              <button
                type="button"
                onClick={() => setReturnCostPayer('customer')}
                className={`p-3 rounded-xl border text-start transition-all relative ${
                  returnCostPayer === 'customer'
                    ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    العميل (Customer)
                  </span>
                  {returnCostPayer === 'customer' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  يتم خصم تكلفة الإرجاع من المبلغ المسترد للعميل.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setReturnCostPayer('merchant')}
                className={`p-3 rounded-xl border text-start transition-all relative ${
                  returnCostPayer === 'merchant'
                    ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                    التاجر / المتجر (Merchant)
                  </span>
                  {returnCostPayer === 'merchant' && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  يسترد العميل كامل المبلغ، وتقيد تكلفة الإرجاع كمديونية على التاجر.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setReturnCostPayer('none')}
                className={`p-3 rounded-xl border text-start transition-all relative ${
                  returnCostPayer === 'none'
                    ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    بدون تكلفة (No Cost)
                  </span>
                  {returnCostPayer === 'none' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  استرجاع مجاني دون خصم من العميل أو قيد مديونية على التاجر.
                </p>
              </button>

            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                المبلغ القابل للاسترداد (Refundable Amount)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={refundableAmount}
                onChange={e => {
                  setRefundableAmount(e.target.value);
                  setReturnAmount(e.target.value);
                }}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold"
              />
              <span className="text-[10px] text-slate-400">إجمالي المبلغ الأصلي المستحق للاسترداد للعميل</span>
            </div>

            {returnCostPayer !== 'none' ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  تكلفة الإرجاع (Return Cost)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={returnCostAmount}
                  onChange={e => setReturnCostAmount(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                />
                <span className="text-[10px] text-slate-400">
                  {returnCostPayer === 'customer' ? 'تخصم من استرداد العميل' : 'تقيد كمديونية على حساب التاجر'}
                </span>
              </div>
            ) : (
              <div className="flex items-center p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                <span>الإرجاع بدون تكلفة (0.00 ج.م)</span>
              </div>
            )}
          </div>

          {/* Dynamic Financial Summary Card */}
          <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3">
            <div className="text-xs font-bold text-slate-300 border-b border-slate-800 pb-2 flex items-center justify-between">
              <span>ملخص التسوية المالية للإرجاع:</span>
              <span className="text-[11px] font-normal text-slate-400">
                {returnCostPayer === 'customer' && 'تحمل العميل'}
                {returnCostPayer === 'merchant' && 'تحمل التاجر'}
                {returnCostPayer === 'none' && 'بدون تكلفة إرجاع'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">المبلغ القابل للاسترداد:</span>
                <span className="font-mono font-bold text-slate-100">{numRefundable.toLocaleString()} {t.currency}</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block">تكلفة الإرجاع:</span>
                <span className="font-mono font-bold text-amber-400">{numCost.toLocaleString()} {t.currency}</span>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-400 block">صافي استرداد العميل:</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">{customerNetRefund.toLocaleString()} {t.currency}</span>
              </div>
            </div>

            {merchantChargeAmount > 0 && (
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-indigo-300 bg-indigo-950/40 p-2.5 rounded-lg border border-indigo-900/50">
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>سيتم تسجيل قيد مديونية على حساب التاجر:</span>
                </div>
                <span className="font-mono font-bold text-indigo-200">
                  +{merchantChargeAmount.toLocaleString()} {t.currency}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Section 5: Reason, Courier & Notes */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.returnReason} <span className="text-rose-500">*</span>
              </label>
              <select
                value={returnReason}
                onChange={e => setReturnReason(e.target.value as ReturnReason)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {RETURN_REASONS.map(r => (
                  <option key={r.key} value={r.key}>
                    {isRTL ? r.labelAr : r.labelEn}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.assignedReturnCourier}
              </label>
              <select
                value={assignedCourierId}
                onChange={e => setAssignedCourierId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t.unassignedReturnCourier} (سيتم التعيين لاحقاً)</option>
                {couriersList.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} ({c.employee_id}) — {c.area}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {returnReason === 'other' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.otherReason} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={otherReason}
                onChange={e => setOtherReason(e.target.value)}
                required={returnReason === 'other'}
                placeholder="اكتب تفاصيل سبب الإرجاع هنا..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t.returnNotes}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="أي تعليمات أو ملاحظات خاصة بعملية الاسترجاع..."
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
          >
            {t.cancel}
          </button>

          <button
            type="submit"
            disabled={isSubmitting || !selectedOrder}
            className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'جاري الحفظ...' : t.createReturn}</span>
          </button>
        </div>

      </form>
    </Modal>
  );
};
