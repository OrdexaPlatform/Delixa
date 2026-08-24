import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { db, FAILURE_REASONS, subscribeOrderUpdates } from '../../lib/db';
import { openWhatsAppChat, generateWhatsAppConfirmationMessage } from '../../lib/whatsapp';
import { Order, DeliveryFailureReason, Merchant } from '../../types';
import { Modal } from '../../components/common/Modal';
import { 
  ArrowLeft, 
  ArrowRight, 
  Phone, 
  MapPin, 
  Clock, 
  Truck, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  MessageSquare, 
  Copy, 
  Store, 
  Calendar, 
  DollarSign, 
  Check, 
  Clock3, 
  RotateCcw,
  Navigation,
  FileText,
  UserCheck
} from 'lucide-react';

interface CourierOrderDetailPageProps {
  orderId: string;
  navigate: (path: string) => void;
}

export const CourierOrderDetailPage: React.FC<CourierOrderDetailPageProps> = ({ orderId, navigate }) => {
  const { session } = useAuth();
  const { isRTL } = useLanguage();
  const { showToast } = useToast();
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  const [order, setOrder] = useState<Order | null>(null);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);

  // Confirmation Modals
  const [isStartDeliveryModalOpen, setIsStartDeliveryModalOpen] = useState(false);
  const [isMarkDeliveredModalOpen, setIsMarkDeliveredModalOpen] = useState(false);
  const [isFailureModalOpen, setIsFailureModalOpen] = useState(false);
  const [isSuccessScreenOpen, setIsSuccessScreenOpen] = useState(false);

  // Failure Form State
  const [failureReason, setFailureReason] = useState<DeliveryFailureReason>('customer_unavailable');
  const [failureNote, setFailureNote] = useState('');
  const [isConfirmingFailure, setIsConfirmingFailure] = useState(false);

  const loadData = () => {
    if (!session || !session.courier) return;
    const companyId = session.company.id;
    const courierId = session.courier.id;

    // Security check: courier can only view assigned order
    const courierOrders = db.getOrders(companyId, courierId);
    const found = courierOrders.find(o => o.id === orderId);
    
    if (found) {
      setOrder(found);
      const m = db.getMerchantById(companyId, found.merchant_id);
      setMerchant(m);
    } else {
      setOrder(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();

    const unsubscribe = subscribeOrderUpdates((updatedOrderId) => {
      if (!updatedOrderId || updatedOrderId === orderId) {
        loadData();
      }
    });

    return () => unsubscribe();
  }, [session, orderId]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-slate-500 font-medium text-sm">جاري تحميل تفاصيل الشحنة...</p>
      </div>
    );
  }

  if (!order || !session?.courier) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-sm max-w-lg mx-auto my-8">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">الشحنة غير موجودة أو غير مسندة إليك</h2>
        <p className="text-slate-500 text-sm mb-6">
          لا تملك صلاحية الوصول لهذه الشحنة أو أنها لم تعد معينة لحسابك.
        </p>
        <button
          id="back-to-orders-btn"
          onClick={() => navigate('/courier/orders')}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800"
        >
          <BackArrow className="w-4 h-4" />
          <span>العودة لقائمة شحنات اليوم</span>
        </button>
      </div>
    );
  }

  const isCancelled = order.status === 'cancelled' || order.customer_response_status === 'cancelled';
  const isDelivered = order.status === 'delivered';
  const isFailed = order.status === 'failed';
  const isOutForDelivery = order.status === 'out_for_delivery';
  const isAssigned = order.status === 'assigned';

  // WhatsApp sender
  const handleSendWhatsApp = () => {
    if (!session?.courier) return;
    const storeName = merchant?.store_name || session.company.name;
    const msg = generateWhatsAppConfirmationMessage({
      order,
      merchantName: storeName,
      companyName: session.company.name
    });

    openWhatsAppChat(order.customer_phone, msg);
    db.recordWhatsAppSent(session.company.id, order.id, 'courier', session.courier.full_name);
    showToast('success', isRTL ? 'تم فتح محادثة الواتساب مع العميل' : 'WhatsApp chat opened');
    loadData();
  };

  const handleCopyLink = () => {
    const token = order.confirmation_token || order.id;
    const link = `${window.location.origin}/s/${token}`;
    navigator.clipboard.writeText(link);
    showToast('success', isRTL ? 'تم نسخ رابط تأكيد الشحنة للعميل بنجاح' : 'Customer link copied!');
  };

  // Start Delivery
  const confirmStartDelivery = () => {
    if (!session?.courier) return;
    try {
      db.updateOrderStatus(session.company.id, order.id, 'out_for_delivery', {
        actorRole: 'courier',
        actorName: session.courier.full_name,
        courierId: session.courier.id,
      });
      setIsStartDeliveryModalOpen(false);
      showToast('info', isRTL ? 'خرجت الشحنة للتوصيل الآن!' : 'Shipment is Out for Delivery', order.order_number);
      loadData();
    } catch (err: any) {
      showToast('error', isRTL ? 'خطأ' : 'Error', err.message);
    }
  };

  // Mark Delivered
  const confirmMarkDelivered = () => {
    if (!session?.courier) return;
    try {
      db.updateOrderStatus(session.company.id, order.id, 'delivered', {
        actorRole: 'courier',
        actorName: session.courier.full_name,
        courierId: session.courier.id,
      });
      setIsMarkDeliveredModalOpen(false);
      setIsSuccessScreenOpen(true);
      loadData();
    } catch (err: any) {
      showToast('error', isRTL ? 'خطأ' : 'Error', err.message);
    }
  };

  // Failed Delivery Submit
  const handleFailedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!failureReason) return;
    if (failureReason === 'other' && !failureNote.trim()) {
      showToast('warning', isRTL ? 'يرجى كتابة توضيح عند اختيار سبب آخر' : 'Please specify other reason note');
      return;
    }
    setIsConfirmingFailure(true);
  };

  const confirmFailedDelivery = () => {
    if (!session?.courier) return;
    try {
      db.updateOrderStatus(session.company.id, order.id, 'failed', {
        actorRole: 'courier',
        actorName: session.courier.full_name,
        courierId: session.courier.id,
        failureReason: failureReason,
        failureNote: failureNote.trim(),
        failureNotes: failureNote.trim()
      });
      setIsConfirmingFailure(false);
      setIsFailureModalOpen(false);
      showToast('info', isRTL ? 'تم تسجيل تعثر التسليم بنجاح' : 'Marked as Failed', order.order_number);
      loadData();
    } catch (err: any) {
      showToast('error', isRTL ? 'خطأ' : 'Error', err.message);
    }
  };

  const events = db.getOrderEvents(order.id);

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-24">
      
      {/* Top Bar with Navigation */}
      <div className="flex items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <button
          id="courier-back-btn"
          onClick={() => navigate('/courier/orders')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 px-3 py-2 rounded-xl hover:bg-slate-100 font-bold text-sm transition-colors"
        >
          <BackArrow className="w-4 h-4" />
          <span>قائمة شحنات اليوم</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-mono">#{order.order_number}</span>
        </div>
      </div>

      {/* Main Order Card: Shipment & Status */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header Ribbon */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-xl sm:text-2xl font-black text-white">
                #{order.order_number}
              </span>
              {/* Delivery Status Badge */}
              {isDelivered && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500 text-white flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>تم التسليم بنجاح (Delivered)</span>
                </span>
              )}
              {isOutForDelivery && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-500 text-white flex items-center gap-1 animate-pulse">
                  <Truck className="w-3.5 h-3.5" />
                  <span>خرج للتوصيل (Out for Delivery)</span>
                </span>
              )}
              {isAssigned && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500 text-white flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>معين للتوصيل (Assigned)</span>
                </span>
              )}
              {isFailed && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-500 text-white flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" />
                  <span>تعثر التسليم (Failed)</span>
                </span>
              )}
              {isCancelled && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-700 text-white flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" />
                  <span>ملغي (Cancelled)</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 flex items-center gap-1">
              <Store className="w-3.5 h-3.5 text-blue-400" />
              <span>المتجر: </span>
              <strong className="text-white">{merchant?.store_name || 'متجر غير محدد'}</strong>
            </p>
          </div>

          {/* COD Amount Banner */}
          <div className="bg-white/10 backdrop-blur-md border border-white/15 px-4 py-2.5 rounded-xl text-end sm:text-start">
            <span className="text-[11px] text-blue-200 block font-medium">مبلغ التحصيل عند الاستلام (COD)</span>
            <span className="text-2xl font-black text-emerald-400 font-mono">
              {Number(order.cod_amount).toLocaleString()} <span className="text-xs text-white">ج.م</span>
            </span>
          </div>
        </div>

        {/* Customer Confirmation Status Section (Section 6 & Section 15 & Section 16) */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-indigo-600" />
            <span>حالة تأكيد العميل (Customer Confirmation)</span>
          </h3>

          {/* 1. Confirmed */}
          {order.customer_response_status === 'confirmed' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-emerald-950 text-base">🟢 مؤكد من العميل (Confirmed)</h4>
                </div>
                <p className="text-xs text-emerald-800 mt-1">
                  قام العميل بفتح الرابط وتأكيد استلام الشحنة في موعدها المحدد.
                </p>
                {order.customer_responded_at && (
                  <span className="inline-block text-[11px] text-emerald-700 font-mono mt-1">
                    تاريخ ووقت التأكيد: {new Date(order.customer_responded_at).toLocaleString(isRTL ? 'ar-EG' : 'en-US')}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 2. Reschedule Requested (Section 15 Prominent View) */}
          {order.customer_response_status === 'reschedule_requested' && (
            <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500 animate-ping" />
                <h4 className="font-bold text-amber-950 text-base flex items-center gap-1.5">
                  <span>🟠 العميل طلب موعد تسليم جديد (Reschedule Requested)</span>
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3.5 rounded-lg border border-amber-200 text-sm">
                <div>
                  <span className="text-xs text-slate-500 block">الموعد الأصلي للجدولة:</span>
                  <span className="font-bold text-slate-700 line-through">
                    {order.delivery_date} ({order.delivery_from} — {order.delivery_to})
                  </span>
                </div>
                <div className="bg-amber-100/70 p-2 rounded-md border border-amber-300">
                  <span className="text-xs font-bold text-amber-900 block">الموعد الجديد المطلوب من العميل:</span>
                  <span className="font-black text-amber-950 text-base">
                    {order.customer_selected_date || order.customer_reschedule_date} ({order.customer_selected_from || ''} — {order.customer_selected_to || ''})
                  </span>
                </div>
              </div>

              {(order.customer_note || order.customer_reschedule_note) && (
                <div className="bg-amber-100/50 p-3 rounded-lg border border-amber-200/80 text-xs">
                  <span className="font-bold text-amber-900 block mb-1">ملاحظة العميل المرفقة:</span>
                  <p className="text-amber-950 font-medium italic">
                    "{order.customer_note || order.customer_reschedule_note}"
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 3. Cancelled by Customer (Section 16) */}
          {order.customer_response_status === 'cancelled' && (
            <div className="bg-rose-50 border-2 border-rose-300 rounded-xl p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-rose-950 text-base">🔴 ملغي من قبل العميل (Cancelled by Customer)</h4>
                <p className="text-xs text-rose-800 mt-1">
                  قام العميل بإلغاء هذه الشحنة. تم إيقاف جميع إجراءات التوصيل لهذا الطلب.
                </p>
              </div>
            </div>
          )}

          {/* 4. Waiting for Customer */}
          {(!order.customer_response_status || order.customer_response_status === 'pending') && (
            <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <Clock3 className="w-6 h-6 text-amber-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">🟡 بانتظار رد العميل (Waiting for Customer)</h4>
                  <p className="text-xs text-slate-500">لم يقم العميل بتأكيد أو تعديل الموعد حتى الآن.</p>
                </div>
              </div>
            </div>
          )}

          {/* WhatsApp & Confirmation Link Action Buttons */}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <button
              id="courier-whatsapp-btn"
              onClick={handleSendWhatsApp}
              className="flex-1 min-w-[200px] flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              <span>إرسال رابط التأكيد عبر واتساب (WhatsApp)</span>
            </button>

            <button
              id="courier-copylink-btn"
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold rounded-xl transition-colors"
              title="نسخ رابط التأكيد"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>نسخ الرابط</span>
            </button>
          </div>
        </div>

        {/* Customer & Delivery Location Section (Section 6 & Section 7) */}
        <div className="p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-blue-600" />
            <span>بيانات العميل وعنوان التوصيل</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Customer Details Box */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div>
                <span className="text-xs text-slate-500 block">اسم المستلم:</span>
                <span className="font-black text-slate-900 text-base">{order.customer_name}</span>
              </div>

              <div>
                <span className="text-xs text-slate-500 block">رقم الهاتف:</span>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <span className="font-mono font-bold text-slate-900 text-base" dir="ltr">
                    {order.customer_phone}
                  </span>
                  
                  {/* Call Customer Button (Section 7) */}
                  <a
                    id="call-customer-btn"
                    href={`tel:${order.customer_phone}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-sm transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>اتصال بالعميل</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Address Details Box */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div>
                <span className="text-xs text-slate-500 block">عنوان التوصيل:</span>
                <p className="font-bold text-slate-900 text-sm mt-0.5 leading-relaxed">
                  {order.customer_address}
                </p>
                {(order.governorate || order.city_area) && (
                  <span className="inline-block text-xs text-slate-600 font-medium mt-1">
                    📍 {[order.city_area, order.governorate].filter(Boolean).join(' - ')}
                  </span>
                )}
              </div>

              {order.customer_landmark && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-xs text-slate-500 block">علامة مميزة:</span>
                  <span className="text-xs font-semibold text-slate-800">
                    {order.customer_landmark}
                  </span>
                </div>
              )}
            </div>

          </div>

          {/* Delivery Timing Box */}
          <div className="p-4 bg-blue-50/60 border border-blue-200/80 rounded-xl flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <span className="text-xs text-blue-800 font-bold block">موعد التوصيل المجدول:</span>
                <span className="text-sm font-black text-blue-950 font-mono">
                  {order.delivery_date} (من {order.delivery_from} إلى {order.delivery_to})
                </span>
              </div>
            </div>
            {order.notes && (
              <div className="text-xs text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-blue-200">
                <strong>ملاحظات المتجر:</strong> {order.notes}
              </div>
            )}
          </div>

          {/* Failure Information if Failed */}
          {isFailed && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-red-800 font-bold text-sm">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span>سبب تعذر التسليم: {FAILURE_REASONS[order.failure_reason as DeliveryFailureReason] || order.failure_reason}</span>
              </div>
              {(order.failure_note || order.failure_notes) && (
                <p className="text-xs text-red-700 ps-6">
                  ملاحظات المندوب: "{order.failure_note || order.failure_notes}"
                </p>
              )}
              {order.failed_at && (
                <span className="text-[11px] text-red-500 font-mono ps-6 block">
                  وقت التعثر: {new Date(order.failed_at).toLocaleString(isRTL ? 'ar-EG' : 'en-US')}
                </span>
              )}
            </div>
          )}

        </div>

      </div>

      {/* Audit Trail & Events Timeline (Section 22) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-slate-600" />
          <span>سجل حركات الشحنة (Activity Timeline)</span>
        </h3>

        {events.length === 0 ? (
          <p className="text-xs text-slate-400 italic">لا توجد حركات مسجلة حتى الآن.</p>
        ) : (
          <div className="space-y-3 relative before:absolute before:inset-0 before:start-3.5 before:w-0.5 before:bg-slate-200">
            {events.map((ev) => (
              <div key={ev.id} className="relative flex items-start gap-3 ps-8">
                <div className="absolute start-2 top-1.5 w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow-sm" />
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex-1 text-xs">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-slate-800">
                      {ev.details || ev.event_type}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(ev.timestamp).toLocaleTimeString(isRTL ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {ev.actor_name && (
                    <span className="text-[10px] text-slate-500">
                      بواسطة: {ev.actor_name} ({ev.actor})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sticky Mobile Action Buttons (Section 9, 11, 13, 16) */}
      <div className="fixed bottom-0 start-0 end-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 z-20 shadow-lg">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          
          {/* Cancelled Order Notice (Section 16: No actions available) */}
          {isCancelled && (
            <div className="w-full bg-rose-100 text-rose-800 py-3 px-4 rounded-xl text-center font-bold text-sm border border-rose-300">
              🔴 الشحنة ملغاة — لا توجد إجراءات توصيل متاحة
            </div>
          )}

          {/* Delivered Order Notice (Section 23: Final state) */}
          {isDelivered && (
            <div className="w-full bg-emerald-100 text-emerald-900 py-3 px-4 rounded-xl text-center font-bold text-sm border border-emerald-300 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>تم تسليم الشحنة وتحصيل {Number(order.cod_amount).toLocaleString()} ج.م بنجاح!</span>
            </div>
          )}

          {/* Assigned Order Actions -> Start Delivery (Section 9) */}
          {isAssigned && !isCancelled && (
            <button
              id="start-delivery-btn"
              onClick={() => setIsStartDeliveryModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-black text-base shadow-md shadow-blue-600/30 transition-all cursor-pointer"
            >
              <Truck className="w-5 h-5" />
              <span>🚚 بدء التوصيل (Start Delivery)</span>
            </button>
          )}

          {/* Out for Delivery Actions -> Mark Delivered OR Failed (Section 11 & Section 13) */}
          {isOutForDelivery && !isCancelled && (
            <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                id="mark-delivered-btn"
                onClick={() => setIsMarkDeliveredModalOpen(true)}
                className="sm:col-span-2 flex items-center justify-center gap-2 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-black text-base shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>✅ تأكيد تسليم الشحنة (Delivered)</span>
              </button>

              <button
                id="mark-failed-btn"
                onClick={() => {
                  setFailureReason('customer_unavailable');
                  setFailureNote('');
                  setIsFailureModalOpen(true);
                }}
                className="flex items-center justify-center gap-2 py-3.5 px-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl font-bold text-sm shadow-md shadow-red-600/20 transition-all cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                <span>❌ تعثر التسليم</span>
              </button>
            </div>
          )}

          {/* Failed Order Re-start */}
          {isFailed && !isCancelled && (
            <button
              id="retry-delivery-btn"
              onClick={() => setIsStartDeliveryModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer"
            >
              <Truck className="w-4 h-4" />
              <span>إعادة خروج الشحنة للتوصيل (Out for Delivery)</span>
            </button>
          )}

        </div>
      </div>

      {/* 1. START DELIVERY CONFIRMATION MODAL (Section 9) */}
      <Modal
        isOpen={isStartDeliveryModalOpen}
        onClose={() => setIsStartDeliveryModalOpen(false)}
        title="بدء عملية التوصيل للشحنة"
        size="sm"
      >
        <div className="space-y-4 text-center">
          <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
            <Truck className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              هل تريد بدء توصيل هذه الشحنة الآن؟
            </h3>
            <p className="text-xs text-slate-500">
              سيتم تغيير حالة الشحنة إلى (خرج للتوصيل - Out for Delivery) وتحديث لوحة الإدارة فوراً.
            </p>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-start text-xs space-y-1">
            <div><strong>رقم الشحنة:</strong> #{order.order_number}</div>
            <div><strong>العميل:</strong> {order.customer_name}</div>
            <div><strong>العنوان:</strong> {order.customer_address}</div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              id="confirm-start-delivery-btn"
              onClick={confirmStartDelivery}
              className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md transition-all"
            >
              بدء التوصيل (Start Delivery)
            </button>
            <button
              onClick={() => setIsStartDeliveryModalOpen(false)}
              className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all"
            >
              إلغاء
            </button>
          </div>
        </div>
      </Modal>

      {/* 2. MARK AS DELIVERED CONFIRMATION MODAL (Section 11) */}
      <Modal
        isOpen={isMarkDeliveredModalOpen}
        onClose={() => setIsMarkDeliveredModalOpen(false)}
        title="تأكيد تسليم الشحنة للعميل"
        size="sm"
      >
        <div className="space-y-4 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              تأكيد تسليم الشحنة وتحصيل المبلغ؟
            </h3>
            <p className="text-xs text-slate-500">
              يرجى التأكد من تسليم الطرد للعميل واستلام مبلغ التحصيل المطلوب كاملاً.
            </p>
          </div>

          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-center">
            <span className="text-xs text-emerald-800 block mb-1">المبلغ المطلوب تحصيله (COD)</span>
            <span className="text-2xl font-black text-emerald-700 font-mono">
              {Number(order.cod_amount).toLocaleString()} ج.م
            </span>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              id="confirm-delivered-modal-btn"
              onClick={confirmMarkDelivered}
              className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md transition-all"
            >
              تأكيد التسليم (Confirm Delivery)
            </button>
            <button
              onClick={() => setIsMarkDeliveredModalOpen(false)}
              className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all"
            >
              إلغاء
            </button>
          </div>
        </div>
      </Modal>

      {/* 3. DELIVERY SUCCESS SCREEN (Section 12) */}
      <Modal
        isOpen={isSuccessScreenOpen}
        onClose={() => {
          setIsSuccessScreenOpen(false);
          navigate('/courier/orders');
        }}
        title="تم التوصيل بنجاح"
        size="md"
      >
        <div className="text-center py-4 space-y-4">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <Check className="w-10 h-10 stroke-[3]" />
          </div>

          <div>
            <h3 className="text-2xl font-black text-slate-900">
              ✅ تم تسليم الشحنة بنجاح!
            </h3>
            <p className="text-slate-500 text-xs mt-1">
              تم تحديث حالة الشحنة وحسابات التحصيل في نظام الشركة فوراً.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-start space-y-2 max-w-sm mx-auto">
            <div className="flex justify-between">
              <span className="text-slate-500">رقم الشحنة:</span>
              <strong className="font-mono text-slate-900 font-bold">#{order.order_number}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">العميل المستلم:</span>
              <strong className="text-slate-900 font-bold">{order.customer_name}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">المتجر الشاحن:</span>
              <strong className="text-slate-900 font-bold">{merchant?.store_name || session.company.name}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">وقت التسليم الفعلي:</span>
              <strong className="font-mono text-slate-900 font-bold">
                {new Date().toLocaleTimeString(isRTL ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">مندوب التوصيل:</span>
              <strong className="text-slate-900 font-bold">{session.courier.full_name} ({session.courier.employee_id})</strong>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200 text-emerald-800">
              <span className="font-bold">المبلغ المحصل:</span>
              <strong className="font-mono text-base font-black">{Number(order.cod_amount).toLocaleString()} ج.م</strong>
            </div>
          </div>

          <button
            id="return-to-orders-list-btn"
            onClick={() => {
              setIsSuccessScreenOpen(false);
              navigate('/courier/orders');
            }}
            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer"
          >
            العودة لقائمة شحنات اليوم
          </button>
        </div>
      </Modal>

      {/* 4. FAILED DELIVERY FORM & CONFIRMATION (Section 13 & Section 14) */}
      <Modal
        isOpen={isFailureModalOpen}
        onClose={() => {
          setIsFailureModalOpen(false);
          setIsConfirmingFailure(false);
        }}
        title="تسجيل تعثر تسليم الشحنة"
        size="md"
      >
        {!isConfirmingFailure ? (
          <form onSubmit={handleFailedSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                يرجى تحديد سبب تعذر التسليم بدقة: <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {(Object.keys(FAILURE_REASONS) as DeliveryFailureReason[]).map((reasonKey) => (
                  <label
                    key={reasonKey}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      failureReason === reasonKey
                        ? 'border-red-500 bg-red-50/60 font-bold text-red-950 shadow-sm'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="failureReason"
                      value={reasonKey}
                      checked={failureReason === reasonKey}
                      onChange={() => setFailureReason(reasonKey)}
                      className="text-red-600 focus:ring-red-500 w-4 h-4"
                    />
                    <span>{FAILURE_REASONS[reasonKey]}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ملاحظات وتفاصيل إضافية {failureReason === 'other' ? <span className="text-red-500">(مطلوبة)</span> : '(اختيارية)'}:
              </label>
              <textarea
                id="failure-note-input"
                rows={3}
                value={failureNote}
                onChange={(e) => setFailureNote(e.target.value)}
                placeholder={failureReason === 'other' ? 'اكتب سبب التعثر بالتفصيل هنا...' : 'أي ملاحظة توضيحية إضافية للإدارة والمتجر...'}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-red-500 focus:bg-white outline-none"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                id="submit-failed-form-btn"
                className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer"
              >
                متابعة لتأكيد التعثر
              </button>
              <button
                type="button"
                onClick={() => setIsFailureModalOpen(false)}
                className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all"
              >
                إلغاء
              </button>
            </div>
          </form>
        ) : (
          /* Confirmation Step (Section 14) */
          <div className="space-y-4 text-center py-2">
            <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">
                هل أنت متأكد من تسجيل تعثر تسليم هذه الشحنة؟
              </h3>
              <p className="text-xs text-slate-500">
                سيتم حفظ سبب التعثر وإشعار إدارة الشركة والمتجر فوراً.
              </p>
            </div>

            <div className="bg-red-50 p-3.5 rounded-xl border border-red-200 text-start text-xs space-y-1.5">
              <div>
                <strong>السبب المحدد:</strong> {FAILURE_REASONS[failureReason]}
              </div>
              {failureNote.trim() && (
                <div>
                  <strong>الملاحظات:</strong> {failureNote.trim()}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                id="confirm-failed-delivery-final-btn"
                onClick={confirmFailedDelivery}
                className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer"
              >
                تأكيد تعثر التسليم (Confirm Failed Delivery)
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmingFailure(false)}
                className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all"
              >
                رجوع للتعديل
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};
