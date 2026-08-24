import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { db, FAILURE_REASONS, subscribeOrderUpdates } from '../../lib/db';
import { openWhatsAppChat, generateWhatsAppConfirmationMessage } from '../../lib/whatsapp';
import { Order, OrderStatus, Merchant, Courier, DeliveryFailureReason, CustomerResponseStatus, OrderEvent, ReturnRecord } from '../../types';
import { Modal } from '../../components/common/Modal';
import { ReturnInvoiceModal } from '../../components/returns/ReturnInvoiceModal';
import { CreateReturnModal } from '../../components/returns/CreateReturnModal';
import { 
  Package, 
  Plus, 
  Search, 
  Store, 
  Truck, 
  Phone, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Clock3, 
  RotateCcw, 
  XCircle, 
  Trash2,
  Eye,
  Edit2,
  UserCheck,
  AlertTriangle,
  Calendar,
  DollarSign,
  User,
  Ban,
  Info,
  MessageSquare,
  Copy,
  ExternalLink,
  CalendarClock,
  Sparkles,
  History,
  Send,
  Printer
} from 'lucide-react';

const EGYPT_GOVERNORATES = [
  'القاهرة (Cairo)',
  'الجيزة (Giza)',
  'الإسكندرية (Alexandria)',
  'القليوبية (Qalyubia)',
  'الشرقية (Sharqia)',
  'الدقهلية (Dakahlia)',
  'الغربية (Gharbia)',
  'المنوفية (Monufia)',
  'البحيرة (Beheira)',
  'دمياط (Damietta)',
  'بورسعيد (Port Said)',
  'الإسماعيلية (Ismailia)',
  'السويس (Suez)',
  'كفر الشيخ (Kafr El Sheikh)',
  'الفيوم (Fayoum)',
  'بني سويف (Beni Suef)',
  'المنيا (Minya)',
  'أسيوط (Asyut)',
  'سوهاج (Sohag)',
  'قنا (Qena)',
  'الأقصر (Luxor)',
  'أسوان (Aswan)',
  'البحر الأحمر (Red Sea)',
  'مطروح (Matrouh)',
  'شمال سيناء (North Sinai)',
  'جنوب سيناء (South Sinai)',
  'الوادي الجديد (New Valley)'
];

export const OrdersFoundationPage: React.FC = () => {
  const { session } = useAuth();
  const { t, isRTL } = useLanguage();
  const { showToast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [customerResponseFilter, setCustomerResponseFilter] = useState<'all' | CustomerResponseStatus>('all');
  const [merchantFilter, setMerchantFilter] = useState<string>('all');
  const [courierFilter, setCourierFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isFailureModalOpen, setIsFailureModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCreateReturnModalOpen, setIsCreateReturnModalOpen] = useState(false);
  const [isReturnInvoiceModalOpen, setIsReturnInvoiceModalOpen] = useState(false);

  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [currentOrderReturn, setCurrentOrderReturn] = useState<ReturnRecord | null>(null);
  const [returnsMap, setReturnsMap] = useState<Record<string, ReturnRecord>>({});
  const [orderEvents, setOrderEvents] = useState<OrderEvent[]>([]);

  // Form Fields
  const [orderNumber, setOrderNumber] = useState('');
  const [merchantId, setMerchantId] = useState('');
  const [courierId, setCourierId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [governorate, setGovernorate] = useState('القاهرة (Cairo)');
  const [cityArea, setCityArea] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerLandmark, setCustomerLandmark] = useState('');
  const [codAmount, setCodAmount] = useState<number>(500);
  const [deliveryDate, setDeliveryDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [deliveryFrom, setDeliveryFrom] = useState('10:00');
  const [deliveryTo, setDeliveryTo] = useState('18:00');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<OrderStatus>('pending');

  // Failure modal fields
  const [failureReason, setFailureReason] = useState<DeliveryFailureReason>('customer_unavailable');
  const [failureNotes, setFailureNotes] = useState('');

  // Assign modal fields
  const [selectedCourierIdForAssign, setSelectedCourierIdForAssign] = useState<string>('');

  const loadData = () => {
    if (!session) return;
    const companyId = session.company.id;
    const ords = db.getOrders(companyId);
    const mers = db.getMerchants(companyId);
    const crs = db.getCouriers(companyId);
    const rets = db.getReturns(companyId);

    const rMap: Record<string, ReturnRecord> = {};
    rets.forEach(r => { rMap[r.order_id] = r; });

    setOrders(ords);
    setMerchants(mers);
    setCouriers(crs);
    setReturnsMap(rMap);
  };

  useEffect(() => {
    loadData();

    // Subscribe to live order updates
    const unsubscribe = subscribeOrderUpdates((updatedOrderId) => {
      loadData();
      if (currentOrder && (!updatedOrderId || currentOrder.id === updatedOrderId)) {
        const fresh = db.getOrders(session?.company?.id || '').find(o => o.id === currentOrder.id);
        if (fresh) {
          setCurrentOrder(fresh);
          setOrderEvents(db.getOrderEvents(fresh.id));
          const ret = db.getReturnByOrderId(session?.company?.id || '', fresh.id);
          setCurrentOrderReturn(ret || null);
        }
      }
    });

    return () => unsubscribe();
  }, [session, currentOrder?.id]);

  const handleSendWhatsApp = (order: Order, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!session) return;
    const merchant = merchants.find(m => m.id === order.merchant_id);
    const storeName = merchant?.store_name || session.company.name;
    
    const msg = generateWhatsAppConfirmationMessage({
      order,
      merchantName: storeName,
      companyName: session.company.name,
    });

    openWhatsAppChat(order.customer_phone, msg);
    db.recordWhatsAppSent(session.company.id, order.id, 'admin', session.profile?.full_name || 'Admin');
    showToast('success', isRTL ? 'تم فتح محادثة الواتساب وتسجيل الإرسال' : 'WhatsApp chat opened and logged');
    loadData();
    if (currentOrder && currentOrder.id === order.id) {
      setOrderEvents(db.getOrderEvents(order.id));
    }
  };

  const handleCopyLink = (order: Order, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const token = order.confirmation_token || order.id;
    const link = `${window.location.origin}/s/${token}`;
    navigator.clipboard.writeText(link);
    showToast('success', isRTL ? 'تم نسخ رابط العميل بنجاح!' : 'Customer link copied to clipboard!', link);
  };

  const resetForm = () => {
    if (!session) return;
    const nextNo = db.getNextOrderNumber(session.company.id);
    setOrderNumber(nextNo);
    setMerchantId(merchants[0]?.id || '');
    setCourierId('');
    setCustomerName('');
    setCustomerPhone('01');
    setGovernorate('القاهرة (Cairo)');
    setCityArea('');
    setCustomerAddress('');
    setCustomerLandmark('');
    setCodAmount(450);
    setDeliveryDate(new Date().toISOString().split('T')[0]);
    setDeliveryFrom('10:00');
    setDeliveryTo('18:00');
    setNotes('');
    setStatus('pending');
    setCurrentOrder(null);
  };

  const handleOpenAdd = () => {
    if (merchants.length === 0) {
      showToast('warning', isRTL ? 'يرجى إضافة متجر أولاً قبل إنشاء الشحنات' : 'Please add a merchant first');
    }
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (order: Order, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentOrder(order);
    setOrderNumber(order.order_number);
    setMerchantId(order.merchant_id);
    setCourierId(order.courier_id || '');
    setCustomerName(order.customer_name);
    setCustomerPhone(order.customer_phone);
    setGovernorate(order.governorate || 'القاهرة (Cairo)');
    setCityArea(order.city_area || '');
    setCustomerAddress(order.customer_address);
    setCustomerLandmark(order.customer_landmark || '');
    setCodAmount(Number(order.cod_amount) || 0);
    setDeliveryDate(order.delivery_date || new Date().toISOString().split('T')[0]);
    setDeliveryFrom(order.delivery_from || '10:00');
    setDeliveryTo(order.delivery_to || '18:00');
    setNotes(order.notes || '');
    setStatus(order.status);
    setIsEditModalOpen(true);
  };

  const handleOpenDetails = (order: Order) => {
    setCurrentOrder(order);
    setOrderEvents(db.getOrderEvents(order.id));
    const ret = session ? db.getReturnByOrderId(session.company.id, order.id) : null;
    setCurrentOrderReturn(ret || null);
    setIsDetailsModalOpen(true);
  };

  const handleOpenAssign = (order: Order, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentOrder(order);
    setSelectedCourierIdForAssign(order.courier_id || '');
    setIsAssignModalOpen(true);
  };

  const handleOpenCancel = (order: Order, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentOrder(order);
    setIsCancelModalOpen(true);
  };

  const handleOpenDelete = (order: Order, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentOrder(order);
    setIsDeleteModalOpen(true);
  };

  const handleOpenFailureModal = (order: Order) => {
    setCurrentOrder(order);
    setFailureReason('customer_unavailable');
    setFailureNotes('');
    setIsFailureModalOpen(true);
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    if (!orderNumber || !merchantId || !customerName.trim() || !customerPhone.trim() || !customerAddress.trim()) {
      showToast('warning', isRTL ? 'يرجى استكمال الحقول الإلزامية للشحنة' : 'Please fill all required fields');
      return;
    }

    try {
      db.createOrder(session.company.id, {
        merchant_id: merchantId,
        courier_id: courierId || null,
        order_number: orderNumber,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        governorate,
        city_area: cityArea.trim(),
        customer_address: customerAddress.trim(),
        customer_landmark: customerLandmark.trim(),
        cod_amount: Number(codAmount) || 0,
        delivery_date: deliveryDate,
        delivery_from: deliveryFrom,
        delivery_to: deliveryTo,
        notes: notes.trim(),
      });

      showToast('success', isRTL ? 'تم إنشاء الشحنة بنجاح!' : 'Order created successfully', `رقم: ${orderNumber}`);
      setIsAddModalOpen(false);
      resetForm();
      loadData();
    } catch (err: any) {
      showToast('error', isRTL ? 'تعذر إنشاء الشحنة' : 'Failed to create order', err.message);
    }
  };

  const handleUpdateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !currentOrder) return;

    try {
      db.updateOrder(session.company.id, currentOrder.id, {
        merchant_id: merchantId,
        courier_id: courierId || null,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        governorate,
        city_area: cityArea.trim(),
        customer_address: customerAddress.trim(),
        customer_landmark: customerLandmark.trim(),
        cod_amount: Number(codAmount) || 0,
        delivery_date: deliveryDate,
        delivery_from: deliveryFrom,
        delivery_to: deliveryTo,
        notes: notes.trim(),
        status: (courierId && currentOrder.status === 'pending') ? 'assigned' : status,
      });

      showToast('success', isRTL ? 'تم حفظ تعديلات الشحنة بنجاح' : 'Order updated successfully');
      setIsEditModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast('error', isRTL ? 'خطأ في حفظ التعديلات' : 'Update error', err.message);
    }
  };

  const handleAssignCourierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !currentOrder) return;

    try {
      db.updateOrderStatus(session.company.id, currentOrder.id, selectedCourierIdForAssign ? 'assigned' : 'pending', {
        courierId: selectedCourierIdForAssign || null
      });

      showToast('success', isRTL ? 'تم تعيين مندوب التوصيل للشحنة بنجاح' : 'Courier assigned successfully');
      setIsAssignModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast('error', isRTL ? 'تعذر تعيين المندوب' : 'Failed to assign courier', err.message);
    }
  };

  const handleStatusChangeRequest = (order: Order, newStatus: OrderStatus) => {
    if (!session) return;
    if (newStatus === 'failed') {
      handleOpenFailureModal(order);
      return;
    }

    try {
      db.updateOrderStatus(session.company.id, order.id, newStatus);
      showToast('success', isRTL ? `تم تحديث حالة الشحنة إلى ${newStatus}` : `Status updated to ${newStatus}`);
      loadData();
    } catch (err: any) {
      showToast('warning', isRTL ? 'انتقال حالة غير مسموح' : 'Invalid status transition', err.message);
    }
  };

  const handleFailureSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !currentOrder) return;

    if (failureReason === 'other' && !failureNotes.trim()) {
      showToast('warning', isRTL ? 'يرجى كتابة تفاصيل سبب التعثر عند اختيار سبب آخر' : 'Please provide notes for Other reason');
      return;
    }

    try {
      db.updateOrderStatus(session.company.id, currentOrder.id, 'failed', {
        failureReason: failureReason,
        failureNotes: failureNotes.trim()
      });

      showToast('info', isRTL ? 'تم تسجيل تعثر التسليم بنجاح' : 'Delivery failure recorded');
      setIsFailureModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast('error', isRTL ? 'خطأ' : 'Error', err.message);
    }
  };

  const handleCancelOrderSubmit = () => {
    if (!session || !currentOrder) return;
    try {
      db.updateOrderStatus(session.company.id, currentOrder.id, 'cancelled');
      showToast('info', isRTL ? 'تم إلغاء الشحنة' : 'Order cancelled');
      setIsCancelModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast('warning', isRTL ? 'لا يمكن الإلغاء' : 'Cannot cancel', err.message);
    }
  };

  const handleDeleteOrderSubmit = () => {
    if (!session || !currentOrder) return;
    try {
      db.deleteOrder(session.company.id, currentOrder.id);
      showToast('info', isRTL ? 'تم حذف الشحنة من السجل' : 'Order deleted');
      setIsDeleteModalOpen(false);
      setIsDetailsModalOpen(false);
      setCurrentOrder(null);
      loadData();
    } catch (err: any) {
      showToast('error', isRTL ? 'تعذر الحذف' : 'Failed to delete', err.message);
    }
  };

  // Filtered orders calculation
  const filteredOrders = orders.filter(o => {
    const matchesSearch =
      o.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer_phone.includes(searchTerm) ||
      o.customer_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.city_area && o.city_area.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    const matchesCustomerResponse =
      customerResponseFilter === 'all' ||
      (o.customer_response_status || 'pending') === customerResponseFilter;
    const matchesMerchant = merchantFilter === 'all' || o.merchant_id === merchantFilter;
    const matchesCourier = courierFilter === 'all' || (courierFilter === 'unassigned' ? !o.courier_id : o.courier_id === courierFilter);
    const matchesDate = !dateFilter || o.delivery_date === dateFilter;

    return matchesSearch && matchesStatus && matchesCustomerResponse && matchesMerchant && matchesCourier && matchesDate;
  });

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'delivered':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800"><CheckCircle2 className="w-3 h-3 text-emerald-600" />{t.statusDelivered}</span>;
      case 'out_for_delivery':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800"><Truck className="w-3 h-3 text-blue-600" />{t.statusOutForDelivery}</span>;
      case 'assigned':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800"><UserCheck className="w-3 h-3 text-indigo-600" />{t.statusAssigned}</span>;
      case 'failed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800"><AlertTriangle className="w-3 h-3 text-rose-600" />{t.statusFailed}</span>;
      case 'cancelled':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700"><Ban className="w-3 h-3 text-slate-500" />{t.statusCancelled}</span>;
      case 'pending':
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800"><Clock className="w-3 h-3 text-amber-600" />{t.statusPending}</span>;
    }
  };

  const getCustomerResponseBadge = (responseStatus?: CustomerResponseStatus) => {
    switch (responseStatus) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>{t.customerResponseConfirmed}</span>
          </span>
        );
      case 'reschedule_requested':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
            <CalendarClock className="w-3 h-3 text-amber-700" />
            <span>{t.customerResponseRescheduled}</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            <span>{t.customerResponseCancelled}</span>
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{t.customerResponsePending}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-amber-600" />
            <span>{t.ordersTitle}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t.ordersSubtitle}
          </p>
        </div>

        <button
          id="create-order-btn"
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t.createOrderButton}</span>
        </button>
      </div>

      {/* Search & Multi-Filters Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search */}
          <div className="relative w-full md:max-w-md">
            <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              id="search-orders-input"
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={t.searchOrdersPlaceholder}
              className="block w-full ps-10 pe-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all text-slate-900"
            />
          </div>

          {/* Status filter pill group */}
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs shrink-0">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  statusFilter === 'all' ? 'bg-white text-amber-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.filterAll} ({orders.length})
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  statusFilter === 'pending' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                معلق ({orders.filter(o => o.status === 'pending').length})
              </button>
              <button
                onClick={() => setStatusFilter('assigned')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  statusFilter === 'assigned' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                معين ({orders.filter(o => o.status === 'assigned').length})
              </button>
              <button
                onClick={() => setStatusFilter('out_for_delivery')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  statusFilter === 'out_for_delivery' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                بالطريق ({orders.filter(o => o.status === 'out_for_delivery').length})
              </button>
              <button
                onClick={() => setStatusFilter('delivered')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  statusFilter === 'delivered' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                مكتمل ({orders.filter(o => o.status === 'delivered').length})
              </button>
              <button
                onClick={() => setStatusFilter('failed')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  statusFilter === 'failed' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                تعثر ({orders.filter(o => o.status === 'failed').length})
              </button>
            </div>
          </div>
        </div>

        {/* Secondary dropdown filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 text-xs">
          
          {/* Filter by Merchant */}
          <div className="flex items-center gap-1.5">
            <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={merchantFilter}
              onChange={e => setMerchantFilter(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800"
            >
              <option value="all">{t.allMerchants}</option>
              {merchants.map(m => (
                <option key={m.id} value={m.id}>{m.store_name}</option>
              ))}
            </select>
          </div>

          {/* Filter by Courier */}
          <div className="flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={courierFilter}
              onChange={e => setCourierFilter(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800"
            >
              <option value="all">{t.allCouriers}</option>
              <option value="unassigned">{t.unassigned}</option>
              {couriers.map(c => (
                <option key={c.id} value={c.id}>{c.full_name} ({c.employee_id})</option>
              ))}
            </select>
          </div>

          {/* Filter by Customer Confirmation Response */}
          <div className="flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={customerResponseFilter}
              onChange={e => setCustomerResponseFilter(e.target.value as any)}
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800"
            >
              <option value="all">كل حالات رد العميل</option>
              <option value="pending">{t.customerResponsePending}</option>
              <option value="confirmed">{t.customerResponseConfirmed}</option>
              <option value="reschedule_requested">{t.customerResponseRescheduled}</option>
              <option value="cancelled">{t.customerResponseCancelled}</option>
            </select>
          </div>

          {/* Filter by Delivery Date */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800"
            />
            {dateFilter && (
              <button
                type="button"
                onClick={() => setDateFilter('')}
                className="text-slate-400 hover:text-slate-600 text-xs px-1 cursor-pointer"
                title="إلغاء فلتر التاريخ"
              >
                ✕
              </button>
            )}
          </div>

        </div>

      </div>

      {/* Orders Table */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-900 text-base mb-1">{t.noOrdersFound}</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
            {t.createFirstOrder}
          </p>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-amber-600 text-white font-bold text-xs rounded-xl hover:bg-amber-700 transition-colors shadow-sm cursor-pointer"
          >
            {t.createOrderButton}
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-slate-500 font-bold">
                  <th className="py-3.5 px-4 text-start">{t.orderNumber}</th>
                  <th className="py-3.5 px-4 text-start">{t.merchant}</th>
                  <th className="py-3.5 px-4 text-start">{t.customerName}</th>
                  <th className="py-3.5 px-4 text-start">{t.customerAddress}</th>
                  <th className="py-3.5 px-4 text-start">{t.assignedCourier}</th>
                  <th className="py-3.5 px-4 text-start">{t.customerResponseTitle}</th>
                  <th className="py-3.5 px-4 text-start">{t.codAmount}</th>
                  <th className="py-3.5 px-4 text-start">{t.orderStatus}</th>
                  <th className="py-3.5 px-4 text-end">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map(order => {
                  const merchant = merchants.find(m => m.id === order.merchant_id);
                  const courier = couriers.find(c => c.id === order.courier_id);

                  return (
                    <tr 
                      key={order.id} 
                      onClick={() => handleOpenDetails(order)}
                      className="hover:bg-amber-50/30 transition-colors cursor-pointer group"
                    >
                      {/* Order Number */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-blue-700 text-xs group-hover:text-blue-800">
                          {order.order_number}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                          {order.delivery_date || new Date(order.created_at).toLocaleDateString('ar-EG')}
                        </span>
                      </td>

                      {/* Merchant */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <Store className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="truncate max-w-[130px]">{merchant?.store_name || 'متجر غير معروف'}</span>
                        </div>
                      </td>

                      {/* Customer Info */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{order.customer_name}</div>
                        <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span dir="ltr">{order.customer_phone}</span>
                        </div>
                      </td>

                      {/* Address & City */}
                      <td className="py-3.5 px-4 max-w-[180px]">
                        <div className="text-slate-700 truncate font-semibold" title={order.customer_address}>
                          {order.city_area ? `${order.city_area} - ` : ''}{order.customer_address}
                        </div>
                        {order.customer_landmark && (
                          <div className="text-[10px] text-slate-400 truncate">
                            علامة: {order.customer_landmark}
                          </div>
                        )}
                      </td>

                      {/* Assigned Courier */}
                      <td className="py-3.5 px-4" onClick={e => e.stopPropagation()}>
                        {courier ? (
                          <button
                            type="button"
                            onClick={(e) => handleOpenAssign(order, e)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/60 font-semibold text-[11px] transition-colors cursor-pointer"
                            title="تغيير المندوب"
                          >
                            <Truck className="w-3 h-3 text-emerald-600" />
                            <span>{courier.full_name}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => handleOpenAssign(order, e)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold text-[11px] transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3 text-amber-600" />
                            <span>تعيين مندوب</span>
                          </button>
                        )}
                      </td>

                      {/* Customer Confirmation Status */}
                      <td className="py-3.5 px-4" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-col gap-1 items-start">
                          {getCustomerResponseBadge(order.customer_response_status)}
                          {order.customer_reschedule_date && (
                            <span className="text-[10px] text-amber-800 font-medium">
                              الموعد: {order.customer_reschedule_date}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* COD Amount */}
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">
                        {Number(order.cod_amount).toLocaleString()} {t.currency}
                      </td>

                      {/* Status Selector */}
                      <td className="py-3.5 px-4" onClick={e => e.stopPropagation()}>
                        <select
                          value={order.status}
                          disabled={order.status === 'delivered' || order.status === 'cancelled'}
                          onChange={e => handleStatusChangeRequest(order, e.target.value as OrderStatus)}
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                            order.status === 'delivered'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 cursor-not-allowed opacity-90'
                              : order.status === 'out_for_delivery'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : order.status === 'assigned'
                              ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                              : order.status === 'failed'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : order.status === 'cancelled'
                              ? 'bg-slate-100 text-slate-600 border-slate-300 cursor-not-allowed'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          <option value="pending">معلق (Pending)</option>
                          <option value="assigned">معين (Assigned)</option>
                          <option value="out_for_delivery">خرج للتوصيل</option>
                          <option value="delivered">تم التسليم</option>
                          <option value="failed">تعذر التسليم</option>
                          <option value="cancelled">ملغي</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-end" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {/* WhatsApp Button */}
                          <button
                            type="button"
                            onClick={(e) => handleSendWhatsApp(order, e)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title={t.sendWhatsAppPrompt}
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>

                          {/* Copy Link Button */}
                          <button
                            type="button"
                            onClick={(e) => handleCopyLink(order, e)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title={t.copyCustomerLink}
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleOpenDetails(order)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title={t.viewOrder}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleOpenEdit(order, e)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title={t.editOrder}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {order.status !== 'cancelled' && order.status !== 'delivered' && (
                            <button
                              onClick={(e) => handleOpenCancel(order, e)}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              title={t.cancelOrder}
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={(e) => handleOpenDelete(order, e)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW ORDER COMPLETE DETAILS MODAL */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title={currentOrder ? `${t.orderDetailsTitle}: ${currentOrder.order_number}` : t.orderDetailsTitle}
        subtitle="عرض تفصيلي لبيانات الشحنة، العميل، المتجر، ومسار التوصيل والتحصيل"
      >
        {currentOrder && (() => {
          const merchant = merchants.find(m => m.id === currentOrder.merchant_id);
          const courier = couriers.find(c => c.id === currentOrder.courier_id);

          return (
            <div className="space-y-4 text-xs">
              
              {/* Order Header Summary Banner */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 block font-mono">رقم الشحنة / Waybill</span>
                  <div className="text-lg font-black text-amber-400 font-mono">{currentOrder.order_number}</div>
                  <span className="text-[11px] text-slate-300">
                    تاريخ الإنشاء: {new Date(currentOrder.created_at).toLocaleString('ar-EG')}
                  </span>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {getStatusBadge(currentOrder.status)}
                </div>
              </div>

              {/* Status Visual Timeline */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-[11px] font-bold text-slate-600 mb-2">مسار تقدم الشحنة:</div>
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <div className={`flex items-center gap-1 ${['pending', 'assigned', 'out_for_delivery', 'delivered'].includes(currentOrder.status) ? 'text-blue-600' : 'text-slate-400'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>تم الإنشاء</span>
                  </div>
                  <span className="text-slate-300">──</span>
                  <div className={`flex items-center gap-1 ${['assigned', 'out_for_delivery', 'delivered'].includes(currentOrder.status) ? 'text-indigo-600' : 'text-slate-400'}`}>
                    <Truck className="w-3.5 h-3.5" />
                    <span>تم التعيين</span>
                  </div>
                  <span className="text-slate-300">──</span>
                  <div className={`flex items-center gap-1 ${['out_for_delivery', 'delivered'].includes(currentOrder.status) ? 'text-blue-600' : 'text-slate-400'}`}>
                    <Clock3 className="w-3.5 h-3.5" />
                    <span>خرج للتوصيل</span>
                  </div>
                  <span className="text-slate-300">──</span>
                  <div className={`flex items-center gap-1 ${currentOrder.status === 'delivered' ? 'text-emerald-600' : currentOrder.status === 'failed' ? 'text-rose-600' : 'text-slate-400'}`}>
                    {currentOrder.status === 'failed' ? <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>{currentOrder.status === 'failed' ? 'تعثر التسليم' : 'التسليم'}</span>
                  </div>
                </div>
              </div>

              {/* Recipient Customer & Merchant Information Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* Customer Information */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                    <User className="w-3.5 h-3.5 text-amber-600" />
                    <span>{t.customerInfoSection}</span>
                  </h4>

                  <div>
                    <span className="text-[10px] text-slate-400 block">{t.customerName}</span>
                    <span className="font-bold text-slate-900">{currentOrder.customer_name}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block">{t.customerPhone}</span>
                    <a href={`tel:${currentOrder.customer_phone}`} className="font-mono font-bold text-blue-700 hover:underline flex items-center gap-1" dir="ltr">
                      <Phone className="w-3 h-3" />
                      <span>{currentOrder.customer_phone}</span>
                    </a>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block">{t.customerAddress}</span>
                    <span className="text-slate-700 font-medium">
                      {currentOrder.governorate ? `${currentOrder.governorate} - ` : ''}
                      {currentOrder.city_area ? `${currentOrder.city_area} - ` : ''}
                      {currentOrder.customer_address}
                    </span>
                    {currentOrder.customer_landmark && (
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        علامة مميزة: {currentOrder.customer_landmark}
                      </span>
                    )}
                  </div>
                </div>

                {/* Merchant & Logistics */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                    <Store className="w-3.5 h-3.5 text-blue-600" />
                    <span>{t.merchantInfoSection}</span>
                  </h4>

                  <div>
                    <span className="text-[10px] text-slate-400 block">{t.storeName}</span>
                    <span className="font-bold text-slate-900">{merchant?.store_name || 'غير معروف'}</span>
                    <span className="text-[11px] text-slate-500 block">المسؤول: {merchant?.owner_name}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block">{t.assignedCourier}</span>
                    {courier ? (
                      <div className="inline-flex items-center gap-1 text-emerald-800 font-bold">
                        <Truck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{courier.full_name} ({courier.employee_id})</span>
                      </div>
                    ) : (
                      <span className="text-amber-700 font-bold">{t.unassigned}</span>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block">{t.deliveryWindow}</span>
                    <span className="font-medium text-slate-700">
                      {currentOrder.delivery_date} ({currentOrder.delivery_from || '10:00'} - {currentOrder.delivery_to || '18:00'})
                    </span>
                  </div>
                </div>

              </div>

              {/* Financial COD card */}
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-emerald-800 font-bold block">{t.paymentInfoSection}</span>
                  <span className="text-lg font-black text-emerald-900">
                    {Number(currentOrder.cod_amount).toLocaleString()} {t.currency}
                  </span>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                  currentOrder.status === 'delivered' ? 'bg-emerald-600 text-white' : 'bg-emerald-200/60 text-emerald-900'
                }`}>
                  {currentOrder.status === 'delivered' ? 'تم التحصيل الفعلي' : 'مطلوب تحصيلها عند التسليم'}
                </span>
              </div>

              {/* Failure details section (if failed) */}
              {currentOrder.status === 'failed' && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5 text-rose-900">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>{t.failureReasonDetails}</span>
                  </div>
                  <p className="font-semibold text-xs">
                    {currentOrder.failure_reason ? (FAILURE_REASONS.find(f => f.key === currentOrder.failure_reason)?.labelAr || currentOrder.failure_reason) : 'غير محدد'}
                  </p>
                  {currentOrder.failure_notes && (
                    <p className="text-[11px] text-rose-800 bg-white/70 p-2 rounded-lg border border-rose-200">
                      <strong>ملاحظات:</strong> {currentOrder.failure_notes}
                    </p>
                  )}
                </div>
              )}

              {/* Internal Notes */}
              {currentOrder.notes && (
                <div className="p-3 rounded-xl bg-slate-100 text-slate-700">
                  <strong>{t.notesSection}:</strong> {currentOrder.notes}
                </div>
              )}

              {/* Customer Confirmation & Self-Service Section (Phase 3) */}
              <div className="p-4 bg-gradient-to-r from-blue-50/80 to-emerald-50/60 border border-blue-200/80 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-xs sm:text-sm">
                        {t.customerResponseTitle}
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        رابط آمن ومباشر للعميل لتأكيد الاستلام أو طلب تغيير الموعد
                      </p>
                    </div>
                  </div>
                  <div>
                    {getCustomerResponseBadge(currentOrder.customer_response_status)}
                  </div>
                </div>

                {/* Reschedule details if requested by customer */}
                {currentOrder.customer_response_status === 'reschedule_requested' && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5 text-amber-900">
                    <div className="font-bold flex items-center gap-1.5 text-xs">
                      <CalendarClock className="w-4 h-4 text-amber-700" />
                      <span>{t.customerSelectedDate}: <strong>{currentOrder.customer_reschedule_date}</strong></span>
                      {currentOrder.customer_reschedule_window && (
                        <span className="text-[11px] font-normal text-amber-800">
                          ({currentOrder.customer_reschedule_window})
                        </span>
                      )}
                    </div>
                    {currentOrder.customer_reschedule_note && (
                      <p className="text-[11px] text-amber-800 bg-white/70 p-2 rounded-lg border border-amber-200">
                        <strong>{t.customerNote}:</strong> {currentOrder.customer_reschedule_note}
                      </p>
                    )}
                  </div>
                )}

                {/* Customer Short Link & Quick Actions */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                  <div className="flex-1 font-mono text-[11px] text-slate-600 truncate px-2 py-1 bg-slate-50 rounded-lg border border-slate-200" dir="ltr">
                    {`${window.location.origin}/s/${currentOrder.confirmation_token || currentOrder.id}`}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyLink(currentOrder)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{t.copyCustomerLink}</span>
                    </button>
                    <a
                      href={`/s/${currentOrder.confirmation_token || currentOrder.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{t.openCustomerLink}</span>
                    </a>
                  </div>
                </div>

                {/* WhatsApp Action and timestamp */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSendWhatsApp(currentOrder)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>{t.sendWhatsAppPrompt}</span>
                  </button>

                  {currentOrder.whatsapp_sent_at && (
                    <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>آخر إرسال واتساب: {new Date(currentOrder.whatsapp_sent_at).toLocaleString('ar-EG')}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Order Events Timeline / Audit Trail */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                  <History className="w-3.5 h-3.5 text-slate-600" />
                  <span>{t.timelineEventsTitle}</span>
                </h4>

                {orderEvents.length === 0 ? (
                  <p className="text-[11px] text-slate-400 text-center py-2">{t.noEventsYet}</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {orderEvents.map(evt => (
                      <div key={evt.id} className="p-2 bg-white rounded-lg border border-slate-200 flex items-start justify-between gap-2 text-[11px]">
                        <div>
                          <div className="font-bold text-slate-800">
                            {evt.event_type === 'link_generated' ? 'إنشاء رابط التتبع' :
                             evt.event_type === 'whatsapp_sent' ? 'إرسال رابط عبر واتساب' :
                             evt.event_type === 'courier_assigned' || evt.event_type === 'assigned' || evt.event_type === 'order_assigned' ? 'تعيين مندوب' :
                             evt.event_type === 'out_for_delivery' ? 'خروج للتوصيل' :
                             evt.event_type === 'delivered' ? 'تم التوصيل' :
                             evt.event_type === 'failed' ? 'تعثر التوصيل' :
                             evt.event_type === 'customer_confirmed' ? 'تأكيد العميل للاستلام' :
                             evt.event_type === 'customer_rescheduled' ? 'طلب العميل تأجيل الموعد' :
                             evt.event_type === 'customer_cancelled' ? 'طلب العميل إلغاء الشحنة' :
                             evt.event_type}
                          </div>
                          {evt.notes && (
                            <p className="text-slate-600 text-[10px] mt-0.5">{evt.notes}</p>
                          )}
                          <span className="text-[9px] text-slate-400">بواسطة: {evt.actor_name}</span>
                        </div>
                        <span className="text-[9px] text-slate-400 font-mono shrink-0">
                          {new Date(evt.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Returns Management Section */}
              <div className="p-4 bg-gradient-to-r from-rose-50/80 to-amber-50/50 border border-rose-200/80 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold">
                      <RotateCcw className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-xs sm:text-sm">
                        {t.returnsTitle}
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        {t.futureReturnsDesc}
                      </p>
                    </div>
                  </div>
                </div>

                {currentOrderReturn ? (
                  <div className="p-3 bg-white rounded-xl border border-rose-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-rose-700 text-xs">{currentOrderReturn.return_number}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-800">
                          {currentOrderReturn.status}
                        </span>
                      </div>
                      <div className="font-mono font-bold text-xs text-slate-900">
                        {Number(currentOrderReturn.total_return_amount).toLocaleString()} {t.currency}
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-600 flex items-center justify-between border-t border-slate-100 pt-2">
                      <span className="text-slate-500">
                        السبب: <strong>{currentOrderReturn.return_reason}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsReturnInvoiceModalOpen(true)}
                        className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>{t.printReturnInvoice}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-3 bg-white/80 rounded-xl border border-rose-100">
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        {['delivered', 'failed'].includes(currentOrder.status) ? 'الشحنة مؤهلة لإنشاء طلب إرجاع' : 'طلب الإرجاع غير متاح حالياً'}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {['delivered', 'failed'].includes(currentOrder.status) 
                          ? 'يمكنك تسجيل طلب إرجاع وتعيين مندوب لاستلام المرتجع واحتساب التكاليف' 
                          : 'يتاح الإرجاع فقط بعد إتمام تسليم الشحنة أو تسجيل تعثرها'}
                      </div>
                    </div>

                    {['delivered', 'failed'].includes(currentOrder.status) && (
                      <button
                        type="button"
                        onClick={() => setIsCreateReturnModalOpen(true)}
                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{t.createReturn}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDetailsModalOpen(false);
                      handleOpenAssign(currentOrder);
                    }}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-xl font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>تعيين مندوب</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDetailsModalOpen(false);
                      handleOpenEdit(currentOrder);
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>{t.edit}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold cursor-pointer"
                >
                  {t.close}
                </button>
              </div>

            </div>
          );
        })()}
      </Modal>

      {/* CREATE ORDER MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={t.createOrderButton}
        subtitle="إنشاء بوليصة شحنة جديدة وتحديد بيانات العميل والتحصيل النقدي COD"
      >
        <form onSubmit={handleCreateOrder} className="space-y-3.5 text-xs max-h-[75vh] overflow-y-auto px-1">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t.orderNumber} (تلقائي) *</label>
              <input
                type="text"
                required
                value={orderNumber}
                onChange={e => setOrderNumber(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-blue-700 text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{t.merchant} *</label>
              <select
                value={merchantId}
                onChange={e => setMerchantId(e.target.value)}
                required
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold"
              >
                {merchants.length === 0 && <option value="">لا توجد متاجر - يرجى إضافة متجر</option>}
                {merchants.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.store_name} ({m.owner_name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Customer Details Section */}
          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-3">
            <span className="font-bold text-amber-900 text-xs block">{t.customerInfoSection}</span>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t.customerName} *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="اسم المستلم"
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t.customerPhone} *</label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t.governorate} *</label>
                <select
                  value={governorate}
                  onChange={e => setGovernorate(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-900"
                >
                  {EGYPT_GOVERNORATES.map(gov => (
                    <option key={gov} value={gov}>{gov}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t.cityArea}</label>
                <input
                  type="text"
                  value={cityArea}
                  onChange={e => setCityArea(e.target.value)}
                  placeholder="مثال: التجمع الخامس / شبرا / سموحة"
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{t.customerAddress} التفصيلي *</label>
              <input
                type="text"
                required
                value={customerAddress}
                onChange={e => setCustomerAddress(e.target.value)}
                placeholder="الشارع، رقم العقار، رقم الشقة أو الدور..."
                className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{t.customerLandmark}</label>
              <input
                type="text"
                value={customerLandmark}
                onChange={e => setCustomerLandmark(e.target.value)}
                placeholder="بجوار صيدلية أو مسجد أو مدرسة..."
                className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-900"
              />
            </div>
          </div>

          {/* Financial & Logistics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t.assignedCourier} (اختياري)</label>
              <select
                value={courierId}
                onChange={e => setCourierId(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
              >
                <option value="">-- {t.unassigned} --</option>
                {couriers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} ({c.employee_id} - {c.area})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{t.codAmount} (ج.م) *</label>
              <input
                type="number"
                min="0"
                step="10"
                required
                value={codAmount}
                onChange={e => setCodAmount(Number(e.target.value))}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-emerald-800 text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t.deliveryDate}</label>
              <input
                type="date"
                value={deliveryDate}
                onChange={e => setDeliveryDate(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{t.deliveryFrom}</label>
              <input
                type="time"
                value={deliveryFrom}
                onChange={e => setDeliveryFrom(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{t.deliveryTo}</label>
              <input
                type="time"
                value={deliveryTo}
                onChange={e => setDeliveryTo(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">{t.notes}</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="تعليمات خاصة بالتسليم أو مواعيد مفضلة..."
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-sm cursor-pointer"
            >
              {t.save}
            </button>
          </div>

        </form>
      </Modal>

      {/* EDIT ORDER MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={t.editOrder}
      >
        <form onSubmit={handleUpdateOrder} className="space-y-3.5 text-xs max-h-[75vh] overflow-y-auto px-1">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t.orderNumber}</label>
              <input
                type="text"
                disabled
                value={orderNumber}
                className="w-full p-2 bg-slate-100 border border-slate-300 rounded-xl font-mono font-bold text-slate-600"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{t.merchant} *</label>
              <select
                value={merchantId}
                onChange={e => setMerchantId(e.target.value)}
                required
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold"
              >
                {merchants.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.store_name} ({m.owner_name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Customer Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t.customerName} *</label>
              <input
                type="text"
                required
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{t.customerPhone} *</label>
              <input
                type="tel"
                required
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t.governorate}</label>
              <select
                value={governorate}
                onChange={e => setGovernorate(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
              >
                {EGYPT_GOVERNORATES.map(gov => (
                  <option key={gov} value={gov}>{gov}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{t.cityArea}</label>
              <input
                type="text"
                value={cityArea}
                onChange={e => setCityArea(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">{t.customerAddress} *</label>
            <input
              type="text"
              required
              value={customerAddress}
              onChange={e => setCustomerAddress(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">{t.customerLandmark}</label>
            <input
              type="text"
              value={customerLandmark}
              onChange={e => setCustomerLandmark(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t.assignedCourier}</label>
              <select
                value={courierId}
                onChange={e => setCourierId(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
              >
                <option value="">-- {t.unassigned} --</option>
                {couriers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} ({c.employee_id} - {c.area})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{t.codAmount} (ج.م) *</label>
              <input
                type="number"
                min="0"
                step="10"
                required
                value={codAmount}
                onChange={e => setCodAmount(Number(e.target.value))}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-emerald-800 text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t.deliveryDate}</label>
              <input
                type="date"
                value={deliveryDate}
                onChange={e => setDeliveryDate(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{t.deliveryFrom}</label>
              <input
                type="time"
                value={deliveryFrom}
                onChange={e => setDeliveryFrom(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{t.deliveryTo}</label>
              <input
                type="time"
                value={deliveryTo}
                onChange={e => setDeliveryTo(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">{t.notes}</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm cursor-pointer"
            >
              {t.saveChanges}
            </button>
          </div>

        </form>
      </Modal>

      {/* ASSIGN COURIER MODAL */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title={t.assignCourierModalTitle}
        subtitle="تعيين أو تغيير مندوب التوصيل الموكل إليه تسليم هذه الشحنة"
      >
        <form onSubmit={handleAssignCourierSubmit} className="space-y-4 text-xs">
          {currentOrder && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="font-mono font-bold text-blue-700">{currentOrder.order_number}</span>
              <p className="font-semibold text-slate-800">العميل: {currentOrder.customer_name}</p>
              <p className="text-[11px] text-slate-500">العنوان: {currentOrder.customer_address}</p>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">اختر المندوب من فريق العمل *</label>
            <select
              value={selectedCourierIdForAssign}
              onChange={e => setSelectedCourierIdForAssign(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
            >
              <option value="">-- {t.unassigned} (إلغاء التعيين) --</option>
              {couriers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.full_name} ({c.employee_id} - منطقة: {c.area}) - {c.status === 'active' ? 'نشط' : 'غير نشط'}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAssignModalOpen(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm cursor-pointer"
            >
              {t.save}
            </button>
          </div>
        </form>
      </Modal>

      {/* FAILURE REASON MODAL */}
      <Modal
        isOpen={isFailureModalOpen}
        onClose={() => setIsFailureModalOpen(false)}
        title={t.failureReasonModalTitle}
        subtitle={t.selectFailureReasonPrompt}
      >
        <form onSubmit={handleFailureSubmit} className="space-y-4 text-xs">
          {currentOrder && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1 text-rose-900">
              <span className="font-mono font-bold text-rose-800">{currentOrder.order_number}</span>
              <p className="font-semibold">المستلم: {currentOrder.customer_name} ({currentOrder.customer_phone})</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="block font-bold text-slate-700">حدد السبب الدقيق لتعثر التسليم *</label>
            <div className="space-y-1.5">
              {(Object.keys(FAILURE_REASONS) as DeliveryFailureReason[]).map(key => (
                <label 
                  key={key} 
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                    failureReason === key ? 'bg-rose-50 border-rose-300 text-rose-900 font-bold' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="failure_reason"
                    value={key}
                    checked={failureReason === key}
                    onChange={() => setFailureReason(key)}
                    className="text-rose-600 focus:ring-rose-500"
                  />
                  <span>{FAILURE_REASONS[key]}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">{t.failureNotesLabel}</label>
            <textarea
              rows={3}
              value={failureNotes}
              onChange={e => setFailureNotes(e.target.value)}
              placeholder={t.failureNotesPlaceholder}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsFailureModalOpen(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-sm cursor-pointer"
            >
              تسجيل تعثر الشحنة
            </button>
          </div>
        </form>
      </Modal>

      {/* CANCEL ORDER CONFIRMATION MODAL */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title={t.cancelOrder}
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold">{t.confirmCancelOrder}</p>
              <p className="text-[11px] mt-0.5">الشحنة: {currentOrder?.order_number} ({currentOrder?.customer_name})</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCancelModalOpen(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={handleCancelOrderSubmit}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-sm cursor-pointer"
            >
              تأكيد الإلغاء
            </button>
          </div>
        </div>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="حذف الشحنة نهائياً"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <p className="font-bold">هل أنت متأكد من حذف هذه الشحنة نهائياً من قاعدة البيانات؟</p>
              <p className="text-[11px] mt-0.5">رقم الشحنة: {currentOrder?.order_number}</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={handleDeleteOrderSubmit}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-sm cursor-pointer"
            >
              {t.delete}
            </button>
          </div>
        </div>
      </Modal>

      {/* CREATE RETURN MODAL */}
      <CreateReturnModal
        isOpen={isCreateReturnModalOpen}
        onClose={() => setIsCreateReturnModalOpen(false)}
        onSuccess={(newReturn) => {
          loadData();
          setCurrentOrderReturn(newReturn);
        }}
        targetOrder={currentOrder}
        companyId={session?.company?.id || ''}
      />

      {/* RETURN INVOICE MODAL */}
      {currentOrderReturn && (
        <ReturnInvoiceModal
          isOpen={isReturnInvoiceModalOpen}
          onClose={() => setIsReturnInvoiceModalOpen(false)}
          returnRecord={currentOrderReturn}
          order={currentOrder}
          merchant={merchants.find(m => m.id === currentOrder?.merchant_id) || null}
          courier={couriers.find(c => c.id === currentOrderReturn.courier_id) || null}
          companyName={session?.company?.name || 'Delixa Logistics'}
          companyPhone={session?.company?.phone}
          companyAddress={session?.company?.address}
        />
      )}

    </div>
  );
};
