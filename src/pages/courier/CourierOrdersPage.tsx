import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { db, FAILURE_REASONS, subscribeOrderUpdates } from '../../lib/db';
import { openWhatsAppChat, generateWhatsAppConfirmationMessage } from '../../lib/whatsapp';
import { Order, OrderStatus, DeliveryFailureReason, CustomerResponseStatus } from '../../types';
import { Modal } from '../../components/common/Modal';
import { 
  Package, 
  Search, 
  Phone, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  Truck, 
  XCircle, 
  Filter, 
  AlertTriangle,
  MessageSquare, 
  Copy, 
  CalendarClock,
  ExternalLink,
  Store,
  Calendar,
  Check,
  Clock3,
  UserCheck,
  DollarSign,
  ChevronRight,
  Eye
} from 'lucide-react';

interface CourierOrdersPageProps {
  navigate?: (path: string) => void;
}

export const CourierOrdersPage: React.FC<CourierOrdersPageProps> = ({ navigate }) => {
  const { session } = useAuth();
  const { t, isRTL } = useLanguage();
  const { showToast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [merchantsMap, setMerchantsMap] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'out_for_delivery' | 'confirmed' | 'rescheduled' | 'waiting' | 'delivered' | 'failed'>('all');

  // Modals & Action States
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isStartDeliveryModalOpen, setIsStartDeliveryModalOpen] = useState(false);
  const [isMarkDeliveredModalOpen, setIsMarkDeliveredModalOpen] = useState(false);
  const [isFailureModalOpen, setIsFailureModalOpen] = useState(false);
  const [isSuccessScreenOpen, setIsSuccessScreenOpen] = useState(false);

  // Failure Modal Fields
  const [failureReason, setFailureReason] = useState<DeliveryFailureReason>('customer_unavailable');
  const [failureNote, setFailureNote] = useState('');
  const [isConfirmingFailure, setIsConfirmingFailure] = useState(false);

  const loadOrders = async () => {
    if (!session || !session.courier) return;
    const companyId = session.company.id;
    const courierId = session.courier.id;

    const list = await db.getOrders(companyId, courierId);
    
    // Sort orders by Priority (Section 5)
    const sorted = [...list].sort((a, b) => {
      const getPriorityScore = (o: Order) => {
        if (o.status === 'out_for_delivery') return 1;
        if (o.customer_response_status === 'confirmed' && o.status !== 'delivered' && o.status !== 'failed' && o.status !== 'cancelled') return 2;
        if (o.customer_response_status === 'reschedule_requested') return 3;
        if ((!o.customer_response_status || o.customer_response_status === 'pending') && o.status !== 'delivered' && o.status !== 'failed' && o.status !== 'cancelled') return 4;
        if (o.status === 'assigned') return 5;
        if (o.status === 'delivered') return 6;
        if (o.status === 'failed') return 7;
        return 8;
      };

      const scoreA = getPriorityScore(a);
      const scoreB = getPriorityScore(b);

      if (scoreA !== scoreB) {
        return scoreA - scoreB;
      }

      // Secondary sort: delivery time
      const timeA = a.delivery_from || '00:00';
      const timeB = b.delivery_from || '00:00';
      return timeA.localeCompare(timeB);
    });

    setOrders(sorted);

    // Map merchants
    const merchants = await db.getMerchants(companyId);
    const mMap: Record<string, string> = {};
    merchants.forEach(m => {
      mMap[m.id] = m.store_name;
    });
    setMerchantsMap(mMap);
  };

  useEffect(() => {
    loadOrders();

    const unsubscribe = subscribeOrderUpdates(async (updatedOrderId) => {
      loadOrders();
      if (selectedOrder && (!updatedOrderId || selectedOrder.id === updatedOrderId)) {
        const freshList = await db.getOrders(session?.company?.id || '', session?.courier?.id);
        const fresh = freshList.find(o => o.id === selectedOrder.id);
        if (fresh) setSelectedOrder(fresh);
      }
    });

    return () => unsubscribe();
  }, [session, selectedOrder?.id]);

  if (!session || !session.courier) return null;

  // Filtered list
  const filteredOrders = orders.filter((order) => {
    // Search
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchLower) ||
      order.customer_name.toLowerCase().includes(searchLower) ||
      order.customer_phone.includes(searchTerm) ||
      order.customer_address.toLowerCase().includes(searchLower) ||
      (merchantsMap[order.merchant_id] || '').toLowerCase().includes(searchLower);

    if (!matchesSearch) return false;

    // Filter Chips
    if (statusFilter === 'out_for_delivery') {
      return order.status === 'out_for_delivery';
    }
    if (statusFilter === 'confirmed') {
      return order.customer_response_status === 'confirmed' && order.status !== 'delivered' && order.status !== 'failed' && order.status !== 'cancelled';
    }
    if (statusFilter === 'rescheduled') {
      return order.customer_response_status === 'reschedule_requested';
    }
    if (statusFilter === 'waiting') {
      return (!order.customer_response_status || order.customer_response_status === 'pending') && order.status !== 'delivered' && order.status !== 'failed' && order.status !== 'cancelled';
    }
    if (statusFilter === 'delivered') {
      return order.status === 'delivered';
    }
    if (statusFilter === 'failed') {
      return order.status === 'failed';
    }

    return true;
  });

  // Action handlers
  const handleOpenDetails = (orderId: string) => {
    if (navigate) {
      navigate(`/courier/orders/${orderId}`);
    }
  };

  const handleSendWhatsApp = async (order: Order, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!session || !session.courier) return;

    const storeName = merchantsMap[order.merchant_id] || session.company.name;
    const msg = generateWhatsAppConfirmationMessage({
      order,
      merchantName: storeName,
      companyName: session.company.name
    });

    openWhatsAppChat(order.customer_phone, msg);
    await db.recordWhatsAppSent(session.company.id, order.id, 'courier', session.courier.full_name);
    showToast('success', isRTL ? 'تم فتح محادثة الواتساب مع العميل' : 'WhatsApp chat opened');
    loadOrders();
  };

  const handleCopyLink = (order: Order, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const token = order.confirmation_token || order.id;
    const link = `${window.location.origin}/s/${token}`;
    navigator.clipboard.writeText(link);
    showToast('success', isRTL ? 'تم نسخ رابط تأكيد الشحنة للعميل' : 'Customer link copied!');
  };

  // Start Delivery
  const handleStartDelivery = (order: Order, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedOrder(order);
    setIsStartDeliveryModalOpen(true);
  };

  const confirmStartDelivery = async () => {
    if (!session?.courier || !selectedOrder) return;
    try {
      await db.updateOrderStatus(session.company.id, selectedOrder.id, 'out_for_delivery', {
        actorRole: 'courier',
        actorName: session.courier.full_name,
        courierId: session.courier.id,
      });
      setIsStartDeliveryModalOpen(false);
      showToast('info', isRTL ? 'خرجت الشحنة للتوصيل الآن!' : 'Shipment is Out for Delivery', selectedOrder.order_number);
      loadOrders();
    } catch (err: any) {
      showToast('error', isRTL ? 'خطأ' : 'Error', err.message);
    }
  };

  // Mark Delivered
  const handleMarkDelivered = (order: Order, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedOrder(order);
    setIsMarkDeliveredModalOpen(true);
  };

  const confirmMarkDelivered = async () => {
    if (!session?.courier || !selectedOrder) return;
    try {
      await db.updateOrderStatus(session.company.id, selectedOrder.id, 'delivered', {
        actorRole: 'courier',
        actorName: session.courier.full_name,
        courierId: session.courier.id,
      });
      setIsMarkDeliveredModalOpen(false);
      setIsSuccessScreenOpen(true);
      loadOrders();
    } catch (err: any) {
      showToast('error', isRTL ? 'خطأ' : 'Error', err.message);
    }
  };

  // Failed Delivery Form
  const handleOpenFailureModal = (order: Order, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedOrder(order);
    setFailureReason('customer_unavailable');
    setFailureNote('');
    setIsConfirmingFailure(false);
    setIsFailureModalOpen(true);
  };

  const handleFailureSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!failureReason) return;
    if (failureReason === 'other' && !failureNote.trim()) {
      showToast('warning', isRTL ? 'يرجى كتابة توضيح عند اختيار سبب آخر' : 'Please provide notes for other reason');
      return;
    }
    setIsConfirmingFailure(true);
  };

  const confirmFailedDelivery = async () => {
    if (!session?.courier || !selectedOrder) return;
    try {
      await db.updateOrderStatus(session.company.id, selectedOrder.id, 'failed', {
        actorRole: 'courier',
        actorName: session.courier.full_name,
        courierId: session.courier.id,
        failureReason: failureReason,
        failureNotes: failureNote.trim()
      });
      setIsConfirmingFailure(false);
      setIsFailureModalOpen(false);
      showToast('info', isRTL ? 'تم تسجيل تعثر التسليم للشحنة' : 'Delivery failure recorded', selectedOrder.order_number);
      loadOrders();
    } catch (err: any) {
      showToast('error', isRTL ? 'خطأ' : 'Error', err.message);
    }
  };

  // Counts for tabs
  const countOut = orders.filter(o => o.status === 'out_for_delivery').length;
  const countConfirmed = orders.filter(o => o.customer_response_status === 'confirmed' && o.status !== 'delivered' && o.status !== 'failed' && o.status !== 'cancelled').length;
  const countRescheduled = orders.filter(o => o.customer_response_status === 'reschedule_requested').length;
  const countWaiting = orders.filter(o => (!o.customer_response_status || o.customer_response_status === 'pending') && o.status !== 'delivered' && o.status !== 'failed' && o.status !== 'cancelled').length;
  const countDelivered = orders.filter(o => o.status === 'delivered').length;
  const countFailed = orders.filter(o => o.status === 'failed').length;

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-20">
      
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" />
            <span>شحنات اليوم المطلوب تسليمها</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            التحكم المباشر في حركة التوصيل والتواصل مع العملاء في منطقة تغطيتك
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="text-xs text-slate-500 font-medium">إجمالي الشحنات:</span>
          <span className="font-mono text-sm font-black px-2.5 py-1 bg-slate-900 text-white rounded-lg">
            {orders.length}
          </span>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3.5' : 'left-3.5'} w-4 h-4 text-slate-400`} />
        <input
          id="courier-search-input"
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="البحث برقم الشحنة، اسم العميل، الهاتف، العنوان أو المتجر..."
          className={`w-full py-3 ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm`}
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'left-3' : 'right-3'} text-xs text-slate-400 hover:text-slate-600`}
          >
            مسح
          </button>
        )}
      </div>

      {/* Filter Chips / Quick Tabs (Mobile Optimized Horizontal Scroll) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        
        {/* All */}
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          الكل ({orders.length})
        </button>

        {/* Out for Delivery */}
        <button
          onClick={() => setStatusFilter('out_for_delivery')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
            statusFilter === 'out_for_delivery'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
          }`}
        >
          <span>🔵 خرج للتوصيل</span>
          <span className="font-mono text-[11px] px-1.5 py-0.2 bg-white/20 rounded-md">{countOut}</span>
        </button>

        {/* Confirmed */}
        <button
          onClick={() => setStatusFilter('confirmed')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
            statusFilter === 'confirmed'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
          }`}
        >
          <span>🟢 مؤكد من العميل</span>
          <span className="font-mono text-[11px] px-1.5 py-0.2 bg-white/20 rounded-md">{countConfirmed}</span>
        </button>

        {/* Rescheduled */}
        <button
          onClick={() => setStatusFilter('rescheduled')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
            statusFilter === 'rescheduled'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300'
          }`}
        >
          <span>🟠 طلب تأجيل</span>
          <span className="font-mono text-[11px] px-1.5 py-0.2 bg-white/20 rounded-md">{countRescheduled}</span>
        </button>

        {/* Waiting */}
        <button
          onClick={() => setStatusFilter('waiting')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
            statusFilter === 'waiting'
              ? 'bg-slate-700 text-white shadow-sm'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
          }`}
        >
          <span>🟡 بانتظار الرد</span>
          <span className="font-mono text-[11px] px-1.5 py-0.2 bg-white/20 rounded-md">{countWaiting}</span>
        </button>

        {/* Delivered */}
        <button
          onClick={() => setStatusFilter('delivered')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
            statusFilter === 'delivered'
              ? 'bg-emerald-800 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
          }`}
        >
          <span>✅ تم التسليم</span>
          <span className="font-mono text-[11px] px-1.5 py-0.2 bg-white/20 rounded-md">{countDelivered}</span>
        </button>

        {/* Failed */}
        <button
          onClick={() => setStatusFilter('failed')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
            statusFilter === 'failed'
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
          }`}
        >
          <span>❌ تعثر</span>
          <span className="font-mono text-[11px] px-1.5 py-0.2 bg-white/20 rounded-md">{countFailed}</span>
        </button>

      </div>

      {/* Orders List (Priority Sorted Mobile First Cards) */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
          <Package className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">لا توجد شحنات مطابقة</h3>
          <p className="text-xs text-slate-500">جرب تغيير فلتر الحالة أو كلمة البحث أعلاه.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const isCancelled = order.status === 'cancelled' || order.customer_response_status === 'cancelled';
            const isDelivered = order.status === 'delivered';
            const isFailed = order.status === 'failed';
            const isOutForDelivery = order.status === 'out_for_delivery';
            const isAssigned = order.status === 'assigned';
            const merchantName = merchantsMap[order.merchant_id] || session.company.name;

            return (
              <div
                key={order.id}
                id={`courier-order-${order.order_number}`}
                onClick={() => handleOpenDetails(order.id)}
                className={`bg-white rounded-2xl border p-4 shadow-sm hover:shadow-md transition-all cursor-pointer space-y-3 relative ${
                  isOutForDelivery
                    ? 'border-blue-400 ring-2 ring-blue-400/30'
                    : order.customer_response_status === 'confirmed' && !isDelivered && !isFailed
                    ? 'border-emerald-300 bg-emerald-50/15'
                    : order.customer_response_status === 'reschedule_requested'
                    ? 'border-amber-300 bg-amber-50/15'
                    : 'border-slate-200'
                }`}
              >
                
                {/* Header Row */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-base font-black text-slate-900">
                        #{order.order_number}
                      </span>

                      {/* Delivery Status Badge */}
                      {isDelivered && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>تم التسليم</span>
                        </span>
                      )}
                      {isOutForDelivery && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-600 text-white flex items-center gap-1 animate-pulse">
                          <Truck className="w-3 h-3" />
                          <span>خرج للتوصيل</span>
                        </span>
                      )}
                      {isAssigned && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          معين
                        </span>
                      )}
                      {isFailed && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                          تعثر التسليم
                        </span>
                      )}
                      {isCancelled && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          ملغي
                        </span>
                      )}
                    </div>

                    <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Store className="w-3 h-3 text-slate-400" />
                      <span>{merchantName}</span>
                    </span>
                  </div>

                  {/* COD Amount */}
                  <div className="text-end">
                    <span className="text-[10px] text-slate-400 block">التحصيل (COD)</span>
                    <span className="font-mono text-base font-black text-emerald-600">
                      {Number(order.cod_amount).toLocaleString()} <span className="text-[10px]">ج.م</span>
                    </span>
                  </div>
                </div>

                {/* Customer Information & Address (Section 4) */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-slate-900 font-bold text-sm">{order.customer_name}</strong>
                    <span className="font-mono text-slate-700 font-semibold" dir="ltr">{order.customer_phone}</span>
                  </div>

                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    📍 {order.customer_address}
                    {order.customer_landmark && <span className="text-slate-500"> (علامة: {order.customer_landmark})</span>}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-blue-900 font-mono pt-1 border-t border-slate-200/60">
                    <span>🕒 تاريخ التوصيل: {order.delivery_date || 'اليوم'}</span>
                    <span>({order.delivery_from} — {order.delivery_to})</span>
                  </div>
                </div>

                {/* Customer Confirmation Badge (Section 4 & Section 6) */}
                <div>
                  {order.customer_response_status === 'confirmed' && (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100/70 px-2.5 py-1 rounded-lg border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>🟢 مؤكد من العميل (Confirmed)</span>
                    </div>
                  )}
                  {order.customer_response_status === 'reschedule_requested' && (
                    <div className="text-xs font-bold text-amber-900 bg-amber-100 px-2.5 py-1.5 rounded-lg border border-amber-300 space-y-0.5">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping" />
                        <span>🟠 طلب العميل تأجيل الموعد إلى:</span>
                      </div>
                      <div className="text-[11px] font-mono text-amber-950 font-black ps-3">
                        {order.customer_selected_date || order.customer_reschedule_date} ({order.customer_selected_from || ''} — {order.customer_selected_to || ''})
                      </div>
                    </div>
                  )}
                  {order.customer_response_status === 'cancelled' && (
                    <div className="text-xs font-bold text-rose-800 bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-300 flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>🔴 تم الإلغاء من قبل العميل</span>
                    </div>
                  )}
                  {(!order.customer_response_status || order.customer_response_status === 'pending') && (
                    <div className="text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1">
                      <Clock3 className="w-3.5 h-3.5 text-slate-400" />
                      <span>🟡 بانتظار رد العميل (Waiting for Confirmation)</span>
                    </div>
                  )}
                </div>

                {/* Card Quick Action Buttons (Section 7, 8, 9, 11, 13) */}
                <div className="pt-2 border-t border-slate-100 flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                  
                  {/* Call Customer */}
                  <a
                    href={`tel:${order.customer_phone}`}
                    className="flex-1 min-w-[90px] flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>اتصال</span>
                  </a>

                  {/* Send WhatsApp */}
                  <button
                    onClick={(e) => handleSendWhatsApp(order, e)}
                    className="flex-1 min-w-[90px] flex items-center justify-center gap-1 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>واتساب</span>
                  </button>

                  {/* View Details Button */}
                  <button
                    onClick={() => handleOpenDetails(order.id)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>تفاصيل</span>
                  </button>

                  {/* Start Delivery if Assigned */}
                  {isAssigned && !isCancelled && (
                    <button
                      onClick={(e) => handleStartDelivery(order, e)}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-sm transition-colors mt-1"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>🚚 بدء التوصيل (Start Delivery)</span>
                    </button>
                  )}

                  {/* Mark Delivered & Failed if Out for Delivery */}
                  {isOutForDelivery && !isCancelled && (
                    <div className="w-full grid grid-cols-2 gap-2 mt-1">
                      <button
                        onClick={(e) => handleMarkDelivered(order, e)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-sm transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>✅ تم التسليم</span>
                      </button>

                      <button
                        onClick={(e) => handleOpenFailureModal(order, e)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>❌ تعثر التسليم</span>
                      </button>
                    </div>
                  )}

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* 1. START DELIVERY CONFIRMATION MODAL */}
      <Modal
        isOpen={isStartDeliveryModalOpen}
        onClose={() => setIsStartDeliveryModalOpen(false)}
        title="بدء توصيل الشحنة"
        size="sm"
      >
        <div className="space-y-4 text-center">
          <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
            <Truck className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              بدء توصيل الشحنة #{selectedOrder?.order_number}؟
            </h3>
            <p className="text-xs text-slate-500">
              سيتم تغيير حالة الشحنة إلى (خرج للتوصيل - Out for Delivery).
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={confirmStartDelivery}
              className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              بدء التوصيل (Start)
            </button>
            <button
              onClick={() => setIsStartDeliveryModalOpen(false)}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </div>
      </Modal>

      {/* 2. MARK DELIVERED CONFIRMATION MODAL */}
      <Modal
        isOpen={isMarkDeliveredModalOpen}
        onClose={() => setIsMarkDeliveredModalOpen(false)}
        title="تأكيد تسليم الشحنة"
        size="sm"
      >
        <div className="space-y-4 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              تأكيد تسليم الشحنة #{selectedOrder?.order_number} وتحصيل المبلغ؟
            </h3>
            <p className="text-xs text-slate-500">
              يرجى التأكد من تسليم الطرد واستلام المبلغ المطلوب.
            </p>
          </div>

          <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-center">
            <span className="text-xs text-emerald-800 block">مبلغ التحصيل (COD):</span>
            <span className="text-xl font-black text-emerald-700 font-mono">
              {Number(selectedOrder?.cod_amount).toLocaleString()} ج.م
            </span>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={confirmMarkDelivered}
              className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              تأكيد التسليم (Confirm)
            </button>
            <button
              onClick={() => setIsMarkDeliveredModalOpen(false)}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </div>
      </Modal>

      {/* 3. DELIVERY SUCCESS MODAL */}
      <Modal
        isOpen={isSuccessScreenOpen}
        onClose={() => setIsSuccessScreenOpen(false)}
        title="تم التسليم بنجاح"
        size="sm"
      >
        <div className="text-center py-3 space-y-3">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>

          <h3 className="text-lg font-black text-slate-900">
            ✅ تم تسليم الشحنة بنجاح!
          </h3>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-start space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">رقم الشحنة:</span>
              <strong className="font-mono text-slate-900 font-bold">#{selectedOrder?.order_number}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">العميل:</span>
              <strong className="text-slate-900 font-bold">{selectedOrder?.customer_name}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">المبلغ المحصل:</span>
              <strong className="text-emerald-700 font-mono font-black">{Number(selectedOrder?.cod_amount).toLocaleString()} ج.م</strong>
            </div>
          </div>

          <button
            onClick={() => setIsSuccessScreenOpen(false)}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            حسناً، إغلاق
          </button>
        </div>
      </Modal>

      {/* 4. FAILED DELIVERY FORM & CONFIRMATION */}
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
          <form onSubmit={handleFailureSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                اختر سبب تعثر التسليم: <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2 max-h-60 overflow-y-auto pe-1">
                {(Object.keys(FAILURE_REASONS) as DeliveryFailureReason[]).map((reasonKey) => (
                  <label
                    key={reasonKey}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      failureReason === reasonKey
                        ? 'border-red-500 bg-red-50/60 font-bold text-red-950 shadow-sm'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="failureReasonOrder"
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
                rows={2}
                value={failureNote}
                onChange={(e) => setFailureNote(e.target.value)}
                placeholder={failureReason === 'other' ? 'اكتب سبب التعثر بالتفصيل هنا...' : 'أي ملاحظة توضيحية إضافية...'}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-red-500 focus:bg-white outline-none"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                متابعة لتأكيد التعثر
              </button>
              <button
                type="button"
                onClick={() => setIsFailureModalOpen(false)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 text-center py-2">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-1">
                هل أنت متأكد من تسجيل تعثر تسليم الشحنة #{selectedOrder?.order_number}؟
              </h3>
              <p className="text-xs text-slate-500">
                السبب: {FAILURE_REASONS[failureReason]} {failureNote ? `(${failureNote})` : ''}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={confirmFailedDelivery}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                تأكيد تعثر التسليم
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmingFailure(false)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all cursor-pointer"
              >
                رجوع
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};
