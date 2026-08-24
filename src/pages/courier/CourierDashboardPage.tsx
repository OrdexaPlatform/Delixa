import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { db, FAILURE_REASONS, subscribeOrderUpdates } from '../../lib/db';
import { openWhatsAppChat, generateWhatsAppConfirmationMessage } from '../../lib/whatsapp';
import { Order, DeliveryFailureReason, CourierCollectionSummary } from '../../types';
import { Modal } from '../../components/common/Modal';
import { 
  Truck, 
  BadgeCheck, 
  MapPin, 
  Phone, 
  CheckCircle2, 
  Clock, 
  PackageCheck, 
  ArrowRight, 
  ArrowLeft,
  DollarSign,
  Building2,
  Calendar,
  AlertTriangle,
  Eye,
  Info,
  Clock3,
  XCircle,
  LogOut,
  ChevronRight,
  MessageSquare,
  Copy,
  CalendarClock,
  Sparkles,
  Store,
  Check,
  Coins,
  Banknote,
  Receipt,
  ShieldCheck
} from 'lucide-react';

interface CourierDashboardPageProps {
  navigate: (path: string) => void;
}

export const CourierDashboardPage: React.FC<CourierDashboardPageProps> = ({ navigate }) => {
  const { session, logout } = useAuth();
  const { isRTL, t } = useLanguage();
  const { showToast } = useToast();
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  const [orders, setOrders] = useState<Order[]>([]);
  const [merchantsMap, setMerchantsMap] = useState<Record<string, string>>({});
  const [collectionSummary, setCollectionSummary] = useState<CourierCollectionSummary | null>(null);
  const [metrics, setMetrics] = useState({
    todayTotal: 0,
    todayConfirmed: 0,
    todayWaiting: 0,
    todayRescheduled: 0,
    todayOutForDelivery: 0,
    todayDelivered: 0,
    todayFailed: 0,
    todayCancelled: 0,
    totalCodToCollect: 0,
    totalCodDelivered: 0,
  });

  // Action Modals
  const [isStartDeliveryModalOpen, setIsStartDeliveryModalOpen] = useState(false);
  const [isMarkDeliveredModalOpen, setIsMarkDeliveredModalOpen] = useState(false);
  const [isFailureModalOpen, setIsFailureModalOpen] = useState(false);
  const [isSuccessScreenOpen, setIsSuccessScreenOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Failure Form State
  const [failureReason, setFailureReason] = useState<DeliveryFailureReason>('customer_unavailable');
  const [failureNote, setFailureNote] = useState('');
  const [isConfirmingFailure, setIsConfirmingFailure] = useState(false);

  const loadData = async () => {
    if (!session || !session.courier) return;
    const companyId = session.company.id;
    const courierId = session.courier.id;

    // Strict RLS: query orders strictly for this courier
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

      // Within same priority, sort by delivery window / time
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

    // Fetch courier collection summary (Prompt 4 Section 3)
    const colSummary = await db.getCourierCollectionSummary(companyId, courierId);
    setCollectionSummary(colSummary);

    const m = await db.getCourierMetrics(companyId, courierId);
    setMetrics({
      todayTotal: m.todayTotal,
      todayConfirmed: m.todayConfirmed,
      todayWaiting: m.todayWaiting,
      todayRescheduled: m.todayRescheduled,
      todayOutForDelivery: m.todayOutForDelivery,
      todayDelivered: m.todayDelivered,
      todayFailed: m.todayFailed,
      todayCancelled: m.todayCancelled,
      totalCodToCollect: m.totalCodToCollect,
      totalCodDelivered: m.totalCodDelivered,
    });
  };

  useEffect(() => {
    loadData();

    const unsubscribe = subscribeOrderUpdates(() => {
      loadData();
    });

    return () => unsubscribe();
  }, [session]);

  if (!session || !session.courier) return null;

  const courier = session.courier;

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
      showToast('info', isRTL ? 'خرجت الشحنة للتوصيل الآن' : 'Shipment is now Out for Delivery', selectedOrder.order_number);
      loadData();
    } catch (err: any) {
      showToast('error', isRTL ? 'خطأ' : 'Error', err.message);
    }
  };

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
      loadData();
    } catch (err: any) {
      showToast('error', isRTL ? 'خطأ' : 'Error', err.message);
    }
  };

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
      loadData();
    } catch (err: any) {
      showToast('error', isRTL ? 'خطأ' : 'Error', err.message);
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
    loadData();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      
      {/* 1. Header (Section 3) */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-700/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-950/40 text-lg font-black shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-blue-400 text-sm tracking-wide uppercase">Delixa EG</span>
                <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-blue-900/80 text-blue-200 text-xs border border-blue-700">
                  {courier.employee_id}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-0.5">
                {courier.full_name}
              </h1>
              <p className="text-xs text-slate-300 flex items-center gap-1.5 mt-0.5">
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                <span>{session.company.name}</span>
                <span>•</span>
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                <span>منطقة: {courier.area || 'جميع المناطق'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              id="courier-logout-btn"
              onClick={logout}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl backdrop-blur-sm border border-white/15 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>تسجيل الخروج (Logout)</span>
            </button>
          </div>

        </div>
      </div>

      {/* 2. Main Statistics: Today's Deliveries (Section 3) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span>شحنات اليوم (Today's Deliveries)</span>
            </h2>
            <p className="text-xs text-slate-500">إحصائيات وحالات شحنات التوصيل المسندة إليك اليوم مباشرة</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">إجمالي شحنات اليوم:</span>
            <span className="font-mono text-xl font-black text-blue-600 bg-blue-50 px-3 py-0.5 rounded-xl border border-blue-200">
              {metrics.todayTotal} شحنة
            </span>
          </div>
        </div>

        {/* Breakdown Metric Chips (Section 3 Example Format) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          
          {/* Confirmed */}
          <div className="bg-emerald-50/80 border border-emerald-200 p-3.5 rounded-2xl">
            <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-bold mb-1">
              <span className="text-base leading-none">🟢</span>
              <span>مؤكد (Confirmed)</span>
            </div>
            <div className="text-2xl font-black text-emerald-950 font-mono">
              {metrics.todayConfirmed}
            </div>
          </div>

          {/* Waiting */}
          <div className="bg-amber-50/80 border border-amber-200 p-3.5 rounded-2xl">
            <div className="flex items-center gap-1.5 text-amber-800 text-xs font-bold mb-1">
              <span className="text-base leading-none">🟡</span>
              <span>بانتظار العميل</span>
            </div>
            <div className="text-2xl font-black text-amber-950 font-mono">
              {metrics.todayWaiting}
            </div>
          </div>

          {/* Rescheduled */}
          <div className="bg-orange-50/80 border border-orange-200 p-3.5 rounded-2xl">
            <div className="flex items-center gap-1.5 text-orange-800 text-xs font-bold mb-1">
              <span className="text-base leading-none">🟠</span>
              <span>طلب تأجيل</span>
            </div>
            <div className="text-2xl font-black text-orange-950 font-mono">
              {metrics.todayRescheduled}
            </div>
          </div>

          {/* Out for Delivery */}
          <div className="bg-blue-50/80 border border-blue-200 p-3.5 rounded-2xl">
            <div className="flex items-center gap-1.5 text-blue-800 text-xs font-bold mb-1">
              <span className="text-base leading-none">🔵</span>
              <span>خرج للتوصيل</span>
            </div>
            <div className="text-2xl font-black text-blue-950 font-mono">
              {metrics.todayOutForDelivery}
            </div>
          </div>

          {/* Delivered */}
          <div className="bg-emerald-100/70 border border-emerald-300 p-3.5 rounded-2xl">
            <div className="flex items-center gap-1.5 text-emerald-900 text-xs font-bold mb-1">
              <span className="text-base leading-none">✅</span>
              <span>تم التسليم</span>
            </div>
            <div className="text-2xl font-black text-emerald-950 font-mono">
              {metrics.todayDelivered}
            </div>
          </div>

          {/* Failed */}
          <div className="bg-red-50/80 border border-red-200 p-3.5 rounded-2xl">
            <div className="flex items-center gap-1.5 text-red-800 text-xs font-bold mb-1">
              <span className="text-base leading-none">❌</span>
              <span>تعذر التسليم</span>
            </div>
            <div className="text-2xl font-black text-red-950 font-mono">
              {metrics.todayFailed}
            </div>
          </div>

        </div>

        {/* Financial COD Summary Banner */}
        <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 block">نقدية التحصيل المطلوبة للشحنات الجارية (COD)</span>
              <span className="text-xl font-black text-emerald-400 font-mono">
                {Number(metrics.totalCodToCollect).toLocaleString()} <span className="text-xs text-white">ج.م</span>
              </span>
            </div>
          </div>

          <button
            id="view-all-today-deliveries-btn"
            onClick={() => navigate('/courier/orders')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            <span>عرض قائمة الشحنات الكاملة</span>
            <ArrowIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2.5. Courier COD Current Collections (Prompt 4 Section 3) */}
      {collectionSummary && (
        <div 
          id="courier-current-collections-card"
          className="bg-white rounded-3xl p-5 sm:p-6 border border-amber-200/80 bg-gradient-to-br from-amber-50/40 via-white to-amber-50/20 shadow-xs"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-100 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-amber-100 text-amber-800 rounded-2xl">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <span>{t.currentCollections || 'التحصيلات النقدية الحالية'}</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                    COD Balance
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  إجمالي مبالغ الدفع عند الاستلام المسلمة بعهدتك حالياً بانتظار التوريد والتسوية
                </p>
              </div>
            </div>

            {/* Read-Only Status Indicator */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl self-start sm:self-center">
              <ShieldCheck className="w-4 h-4 text-slate-400" />
              <span>تتم التسوية والاعتماد من قبل إدارة الشركة فقط</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            {/* Outstanding Balance (المبلغ المطلوب توريده) */}
            <div className="bg-amber-100/60 border border-amber-300/80 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-xs font-bold text-amber-900/80">
                {t.unsettledCodBalance || 'المبلغ المستحق بعهدتك (غير مسوى)'}
              </span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-black text-amber-950 font-mono tracking-tight">
                  {collectionSummary.current_outstanding_balance.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-amber-800">{t.currency}</span>
              </div>
              <span className="text-[11px] text-amber-800 font-semibold mt-1">
                {collectionSummary.current_outstanding_balance > 0 
                  ? 'يرجى توريد المبلغ لخزينة الشركة'
                  : 'تمت تسوية جميع المبالغ بالكامل'}
              </span>
            </div>

            {/* Delivered COD Orders Included */}
            <div className="bg-white border border-slate-200/80 p-4 rounded-2xl flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">
                  {t.deliveredCodOrdersCount || 'شحنات COD المسلمة'}
                </span>
                <Receipt className="w-4 h-4 text-blue-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900 font-mono">
                  {collectionSummary.delivered_cod_orders_count}
                </span>
                <span className="text-xs font-semibold text-slate-500">شحنة مسلمة</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1">
                إجمالي تحصيلاتها: {collectionSummary.total_delivered_cod.toLocaleString()} {t.currency}
              </span>
            </div>

            {/* Last Settlement Info */}
            <div className="bg-white border border-slate-200/80 p-4 rounded-2xl flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">
                  {t.lastSettlementDate || 'آخر تسوية مسجلة'}
                </span>
                <Clock className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2">
                {collectionSummary.last_settlement_date ? (
                  <div>
                    <span className="text-sm font-bold text-slate-900 block">
                      {new Date(collectionSummary.last_settlement_date).toLocaleDateString('ar-EG')}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(collectionSummary.last_settlement_date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic">
                    {t.neverSettled || 'لا توجد تسويات سابقة'}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-emerald-700 font-semibold mt-1">
                إجمالي المسوى سابقاً: {collectionSummary.total_settled_amount.toLocaleString()} {t.currency}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Today's Delivery List (Section 4 & Section 5 Sorted by Priority) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-blue-600" />
            <span>شحنات اليوم مرتبة حسب الأولوية</span>
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            مرتبة: خرج للتوصيل ← مؤكد ← طلب تأجيل ← بانتظار العميل
          </span>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 shadow-sm">
            <PackageCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-800">لا توجد شحنات معينة لك حالياً</h4>
            <p className="text-xs text-slate-500 mt-1">عندما تقوم إدارة الشركة بإسناد شحنات لك ستظهر هنا مباشرة.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orders.map((order) => {
              const isCancelled = order.status === 'cancelled' || order.customer_response_status === 'cancelled';
              const isDelivered = order.status === 'delivered';
              const isFailed = order.status === 'failed';
              const isOutForDelivery = order.status === 'out_for_delivery';
              const isAssigned = order.status === 'assigned';
              const merchantName = merchantsMap[order.merchant_id] || session.company.name;

              return (
                <div
                  key={order.id}
                  id={`order-card-${order.order_number}`}
                  onClick={() => navigate(`/courier/orders/${order.id}`)}
                  className={`bg-white rounded-2xl border p-4.5 shadow-sm hover:shadow-md transition-all cursor-pointer space-y-3 relative ${
                    isOutForDelivery
                      ? 'border-blue-400 ring-2 ring-blue-400/30'
                      : order.customer_response_status === 'confirmed' && !isDelivered && !isFailed
                      ? 'border-emerald-300 bg-emerald-50/20'
                      : order.customer_response_status === 'reschedule_requested'
                      ? 'border-amber-300 bg-amber-50/20'
                      : 'border-slate-200'
                  }`}
                >
                  {/* Card Header: Order Number & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-black text-slate-900">
                          #{order.order_number}
                        </span>
                        
                        {/* Status Badge */}
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
                            معين (Assigned)
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
                      <span className="text-[10px] text-slate-400 block font-medium">التحصيل (COD)</span>
                      <span className="font-mono text-base font-black text-emerald-600">
                        {Number(order.cod_amount).toLocaleString()} <span className="text-[10px]">ج.م</span>
                      </span>
                    </div>
                  </div>

                  {/* Customer Information & Address */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-slate-900 font-bold text-sm">{order.customer_name}</strong>
                      <span className="font-mono text-slate-600" dir="ltr">{order.customer_phone}</span>
                    </div>

                    <div className="text-slate-600 text-[11px] line-clamp-1">
                      📍 {order.customer_address}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-blue-900 font-mono pt-1 border-t border-slate-200/60">
                      <span>🕒 {order.delivery_date || 'اليوم'}</span>
                      <span>({order.delivery_from} — {order.delivery_to})</span>
                    </div>
                  </div>

                  {/* Customer Confirmation Badge */}
                  <div className="pt-1">
                    {order.customer_response_status === 'confirmed' && (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100/70 px-2.5 py-1 rounded-lg border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>🟢 تم التأكيد من العميل</span>
                      </div>
                    )}
                    {order.customer_response_status === 'reschedule_requested' && (
                      <div className="text-xs font-bold text-amber-900 bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-300 space-y-0.5">
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping" />
                          <span>🟠 طلب العميل موعد جديد:</span>
                        </div>
                        <div className="text-[11px] font-mono text-amber-950 font-black ps-3">
                          {order.customer_selected_date} ({order.customer_selected_from} — {order.customer_selected_to})
                        </div>
                      </div>
                    )}
                    {order.customer_response_status === 'cancelled' && (
                      <div className="text-xs font-bold text-rose-800 bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-300 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>🔴 ملغي من قبل العميل</span>
                      </div>
                    )}
                    {(!order.customer_response_status || order.customer_response_status === 'pending') && (
                      <div className="text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1">
                        <Clock3 className="w-3.5 h-3.5 text-slate-400" />
                        <span>🟡 بانتظار تأكيد العميل</span>
                      </div>
                    )}
                  </div>

                  {/* Card Quick Action Bar (Section 7, 8, 9, 11, 13) */}
                  <div className="pt-2 border-t border-slate-100 flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                    
                    {/* Call Button */}
                    <a
                      href={`tel:${order.customer_phone}`}
                      className="flex-1 min-w-[90px] flex items-center justify-center gap-1 px-2.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition-colors"
                      title="اتصال هاتفي"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>اتصال</span>
                    </a>

                    {/* WhatsApp Button */}
                    <button
                      onClick={(e) => handleSendWhatsApp(order, e)}
                      className="flex-1 min-w-[90px] flex items-center justify-center gap-1 px-2.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 transition-colors"
                      title="إرسال رابط التأكيد عبر واتساب"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>واتساب</span>
                    </button>

                    {/* Start Delivery if Assigned */}
                    {isAssigned && !isCancelled && (
                      <button
                        onClick={(e) => handleStartDelivery(order, e)}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-sm transition-colors mt-1"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>🚚 بدء التوصيل</span>
                      </button>
                    )}

                    {/* Mark Delivered & Failed if Out for Delivery */}
                    {isOutForDelivery && !isCancelled && (
                      <div className="w-full grid grid-cols-2 gap-2 mt-1">
                        <button
                          onClick={(e) => handleMarkDelivered(order, e)}
                          className="flex items-center justify-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-sm transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>✅ تم التسليم</span>
                        </button>

                        <button
                          onClick={(e) => handleOpenFailureModal(order, e)}
                          className="flex items-center justify-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
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
      </div>

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
                      name="failureReasonDash"
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
