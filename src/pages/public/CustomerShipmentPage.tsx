import React, { useState, useEffect } from 'react';
import { db, subscribeOrderUpdates } from '../../lib/db';
import { Order, Merchant, Company } from '../../types';
import { 
  Package, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  MapPin, 
  DollarSign, 
  AlertCircle, 
  XCircle, 
  Building2, 
  Phone, 
  Truck, 
  ShieldCheck, 
  ArrowRight, 
  Send,
  MessageSquare,
  Sparkles,
  Info,
  CalendarCheck2,
  CalendarClock
} from 'lucide-react';

interface CustomerShipmentPageProps {
  token: string;
  navigate: (path: string) => void;
}

export const CustomerShipmentPage: React.FC<CustomerShipmentPageProps> = ({ token, navigate }) => {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const isAr = lang === 'ar';

  const [loading, setLoading] = useState<boolean>(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [activeTab, setActiveTab] = useState<'details' | 'reschedule' | 'cancel'>('details');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Reschedule inputs
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const afterTomorrowStr = new Date(Date.now() + 172800000).toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState<string>(tomorrowStr);
  const [selectedSlot, setSelectedSlot] = useState<{ from: string; to: string }>({ from: '12:00', to: '16:00' });
  const [customerNote, setCustomerNote] = useState<string>('');

  // Cancel dialog
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);

  // Fetch Order by Token
  const loadOrder = async () => {
    if (!token) {
      setErrorMessage(isAr ? 'رابط الشحنة غير صالح' : 'Invalid shipment link');
      setLoading(false);
      return;
    }

    const res = await db.getOrderByToken(token);
    if (!res) {
      setErrorMessage(
        isAr
          ? 'لم يتم العثور على الشحنة. قد يكون الرابط خاطئاً أو منتهي الصلاحية.'
          : 'Shipment not found. The link may be incorrect or expired.'
      );
      setOrder(null);
      setMerchant(null);
      setCompany(null);
    } else {
      setOrder(res.order);
      setMerchant(res.merchant || null);
      setCompany(res.company || null);
      setErrorMessage(null);

      // Record link opened event
      await db.recordCustomerLinkOpened(token);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadOrder();

    // Subscribe to real-time events for this shipment
    const unsubscribe = subscribeOrderUpdates((updatedOrderId) => {
      if (!updatedOrderId || (order && order.id === updatedOrderId)) {
        loadOrder();
      }
    });

    return () => unsubscribe();
  }, [token]);

  // Handle Confirm Delivery
  const handleConfirm = async () => {
    if (!token || isSubmitting) return;
    setIsSubmitting(true);
    setSuccessNotice(null);

    try {
      const res = await db.customerConfirmDelivery(token);
      if (res.success && res.order) {
        setOrder(res.order);
        setSuccessNotice(isAr ? 'تم تأكيد موعد الاستلام بنجاح! مندوبنا سيتواصل معك.' : 'Delivery confirmed successfully!');
      } else {
        alert(res.error || 'حدث خطأ أثناء التأكيد');
      }
    } catch (e: any) {
      alert(e.message || 'حدث خطأ غير متوقع');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Reschedule Delivery
  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || isSubmitting) return;
    setIsSubmitting(true);
    setSuccessNotice(null);

    try {
      const res = await db.customerRescheduleDelivery(
        token,
        selectedDate,
        selectedSlot.from,
        selectedSlot.to,
        customerNote
      );

      if (res.success && res.order) {
        setOrder(res.order);
        setActiveTab('details');
        setSuccessNotice(
          isAr
            ? 'تم إرسال طلب تعديل الموعد بنجاح! سيتم التنسيق معك وفق الموعد الجديد.'
            : 'Reschedule request submitted successfully!'
        );
      } else {
        alert(res.error || 'حدث خطأ أثناء إرسال طلب التعديل');
      }
    } catch (e: any) {
      alert(e.message || 'حدث خطأ غير متوقع');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Cancel Delivery
  const handleCancel = async () => {
    if (!token || isSubmitting) return;
    setIsSubmitting(true);
    setSuccessNotice(null);

    try {
      const res = await db.customerCancelDelivery(token);
      if (res.success && res.order) {
        setOrder(res.order);
        setShowCancelModal(false);
        setActiveTab('details');
        setSuccessNotice(isAr ? 'تم إلغاء الشحنة بناءً على طلبك.' : 'Shipment cancelled upon your request.');
      } else {
        alert(res.error || 'حدث خطأ أثناء إلغاء الشحنة');
      }
    } catch (e: any) {
      alert(e.message || 'حدث خطأ غير متوقع');
    } finally {
      setIsSubmitting(false);
    }
  };

  const timeSlots = [
    { labelAr: 'صباحاً (10:00 ص - 02:00 م)', labelEn: 'Morning (10:00 AM - 02:00 PM)', from: '10:00', to: '14:00' },
    { labelAr: 'ظهراً (12:00 م - 04:00 م)', labelEn: 'Afternoon (12:00 PM - 04:00 PM)', from: '12:00', to: '16:00' },
    { labelAr: 'عصراً (02:00 م - 06:00 م)', labelEn: 'Late Afternoon (02:00 PM - 06:00 PM)', from: '14:00', to: '18:00' },
    { labelAr: 'مساءً (04:00 م - 08:00 م)', labelEn: 'Evening (04:00 PM - 08:00 PM)', from: '16:00', to: '20:00' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4" dir={isAr ? 'rtl' : 'ltr'}>
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-lg border border-slate-200">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h3 className="font-bold text-slate-800 text-lg mb-1">{isAr ? 'جاري تجهيز بيانات الشحنة...' : 'Loading shipment details...'}</h3>
          <p className="text-slate-500 text-sm">{isAr ? 'يرجى الانتظار لحظات' : 'Please wait a moment'}</p>
        </div>
      </div>
    );
  }

  if (errorMessage || !order) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4" dir={isAr ? 'rtl' : 'ltr'}>
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-lg border border-slate-200">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">{isAr ? 'تعذر العثور على الشحنة' : 'Shipment Not Found'}</h2>
          <p className="text-slate-600 text-sm mb-6 leading-relaxed">
            {errorMessage || (isAr ? 'الرابط الذي قمت بفتحه غير صحيح أو تم تحديثه.' : 'The link is invalid or expired.')}
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-xl transition shadow-sm text-sm"
          >
            {isAr ? 'العودة للصفحة الرئيسية' : 'Return to Home'}
          </button>
        </div>
      </div>
    );
  }

  const isConfirmed = order.customer_response_status === 'confirmed';
  const isRescheduled = order.customer_response_status === 'reschedule_requested';
  const isCustomerCancelled = order.customer_response_status === 'cancelled' || order.status === 'cancelled';
  const isDelivered = order.status === 'delivered';

  return (
    <div className="min-h-screen bg-slate-100/80 text-slate-800 pb-12" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Top Navigation & Branding Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm font-bold text-lg">
              {company?.name ? company.name.charAt(0) : 'D'}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-slate-900 text-base leading-tight">
                  {company?.name || 'Delixa Logistics'}
                </h1>
                <span title="شركة موثقة">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                </span>
              </div>
              <p className="text-xs text-slate-500">{isAr ? 'خدمات الشحن والتوصيل السريع' : 'Fast Delivery Services'}</p>
            </div>
          </div>

          {/* Language Toggle */}
          <button
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 transition shadow-2xs"
          >
            {lang === 'ar' ? 'English' : 'عربي'}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-4">
        {/* Success Notice Banner */}
        {successNotice && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 flex items-start gap-3 shadow-sm animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-sm font-medium">{successNotice}</div>
          </div>
        )}

        {/* Dynamic Status Notification Card */}
        <div className={`rounded-2xl p-5 border shadow-sm ${
          isDelivered
            ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
            : isConfirmed
            ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
            : isRescheduled
            ? 'bg-amber-50 border-amber-200 text-amber-950'
            : isCustomerCancelled
            ? 'bg-rose-50 border-rose-200 text-rose-950'
            : 'bg-blue-50 border-blue-200 text-blue-950'
        }`}>
          <div className="flex items-start gap-3.5">
            <div className="mt-0.5">
              {isDelivered && <CheckCircle2 className="w-6 h-6 text-emerald-600" />}
              {!isDelivered && isConfirmed && <CheckCircle2 className="w-6 h-6 text-emerald-600" />}
              {!isDelivered && isRescheduled && <CalendarClock className="w-6 h-6 text-amber-600" />}
              {!isDelivered && isCustomerCancelled && <XCircle className="w-6 h-6 text-rose-600" />}
              {!isDelivered && !isConfirmed && !isRescheduled && !isCustomerCancelled && (
                <Clock className="w-6 h-6 text-blue-600 animate-pulse" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-base mb-1">
                {isDelivered
                  ? (isAr ? 'تم تسليم الشحنة بنجاح' : 'Shipment Delivered')
                  : isConfirmed
                  ? (isAr ? 'تم تأكيد موعد استلام شحنتك بنجاح' : 'Delivery Confirmed by Customer')
                  : isRescheduled
                  ? (isAr ? 'تم تسجيل طلب تعديل موعد التوصيل' : 'Reschedule Requested')
                  : isCustomerCancelled
                  ? (isAr ? 'تم إلغاء الشحنة' : 'Shipment Cancelled')
                  : (isAr ? 'يرجى تأكيد موعد استلام شحنتك' : 'Please Confirm Delivery Schedule')}
              </h2>
              <p className="text-sm leading-relaxed opacity-90">
                {isDelivered
                  ? (isAr ? 'نتمنى أن تكون تجربتك مميزة. شكراً لثقتكم بنا وبمتجر الشريك.' : 'Thank you for receiving your shipment with us.')
                  : isConfirmed
                  ? (isAr ? `مندوبنا في طريقه إليك في الموعد المحدد (${order.delivery_date} بين ${order.delivery_from} و ${order.delivery_to}). يرجى التأكد من التواجد وتجهيز المبلغ.` : `Our courier will deliver your package on ${order.delivery_date} between ${order.delivery_from} and ${order.delivery_to}.`)
                  : isRescheduled
                  ? (isAr ? `تاريخ التوصيل المطلوب الجديد: (${order.customer_selected_date || selectedDate} بين ${order.customer_selected_from || '12:00'} و ${order.customer_selected_to || '16:00'}). سيتم التنسيق معك وتحديث خط السير.` : `Requested new delivery date: ${order.customer_selected_date}. Our dispatch team is updating your route.`)
                  : isCustomerCancelled
                  ? (isAr ? 'تم تسجيل إلغاء الطلب في نظام الشحن. إذا كان هذا عن طريق الخطأ، يرجى التواصل مع خدمة العملاء.' : 'Order has been cancelled. Contact support if this was an error.')
                  : (isAr ? 'لضمان وصول المندوب في الوقت الأنسب لك وبدون أي تأخير، يرجى الضغط على زر تأكيد الاستلام أدناه أو اختيار موعد آخر.' : 'Please confirm your availability to receive your order during the scheduled delivery window.')}
              </p>
            </div>
          </div>
        </div>

        {/* Primary Shipment Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          {/* Header of Card */}
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-xs font-semibold text-slate-500 block mb-0.5">{isAr ? 'رقم الشحنة' : 'Order Tracking'}</span>
              <span className="font-mono font-bold text-slate-900 text-lg">{order.order_number}</span>
            </div>

            {merchant && (
              <div className="text-end">
                <span className="text-xs font-semibold text-slate-500 block mb-0.5">{isAr ? 'مرسل من متجر' : 'Shipped from'}</span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-800 border border-blue-100 rounded-full font-bold text-xs">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  {merchant.store_name}
                </span>
              </div>
            )}
          </div>

          {/* COD Payment Highlight */}
          <div className="p-5 bg-gradient-to-r from-emerald-50/70 via-white to-blue-50/40 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold text-emerald-900 block">{isAr ? 'المطلوب دفعه عند الاستلام (COD)' : 'Cash on Delivery Amount'}</span>
                  <span className="text-xs text-slate-500">{isAr ? 'الدفع نقداً للمندوب عند تسليم الشحنة' : 'Pay cash to courier upon delivery'}</span>
                </div>
              </div>
              <div className="text-end">
                <span className="text-2xl font-black text-emerald-700 tracking-tight">{Number(order.cod_amount).toFixed(2)}</span>
                <span className="text-xs font-bold text-emerald-800 ms-1">{isAr ? 'ج.م' : 'EGP'}</span>
              </div>
            </div>
          </div>

          {/* Scheduled Delivery Window Info */}
          <div className="p-5 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500 block">{isAr ? 'تاريخ التوصيل المجدول' : 'Scheduled Delivery Date'}</span>
                <span className="font-bold text-slate-900 text-sm">
                  {order.delivery_date || todayStr} {order.delivery_date === todayStr ? (isAr ? '(اليوم)' : '(Today)') : ''}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500 block">{isAr ? 'نافذة وقت الوصول المتوقع' : 'Estimated Arrival Window'}</span>
                <span className="font-bold text-slate-900 text-sm" dir="ltr">
                  {order.delivery_from} - {order.delivery_to}
                </span>
              </div>
            </div>
          </div>

          {/* Customer Address Details */}
          <div className="p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <span className="text-xs font-medium text-slate-500 block">{isAr ? 'عنوان ومكان الاستلام' : 'Delivery Address'}</span>
                <p className="font-bold text-slate-900 text-sm leading-snug">{order.customer_address}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-600">
                  {order.city_area && <span className="px-2 py-0.5 bg-slate-100 rounded-md">{order.city_area}</span>}
                  {order.governorate && <span className="px-2 py-0.5 bg-slate-100 rounded-md">{order.governorate}</span>}
                  {order.customer_landmark && (
                    <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md">
                      {isAr ? 'علامة مميزة:' : 'Landmark:'} {order.customer_landmark}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Action Choices (If Not Delivered & Not Cancelled) */}
        {!isDelivered && !isCustomerCancelled && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              {isAr ? 'إجراءات العميل لتأكيد الشحنة' : 'Customer Actions'}
            </h3>

            {/* Quick One-Click Confirmation Button */}
            {!isConfirmed && activeTab === 'details' && (
              <button
                id="btn-customer-confirm"
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold py-3.5 px-4 rounded-xl transition shadow-md flex items-center justify-center gap-2 text-base cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-5 h-5" />
                {isSubmitting ? (isAr ? 'جاري التأكيد...' : 'Confirming...') : (isAr ? 'تأكيد استلام الشحنة في الموعد المحدد' : 'Confirm Delivery in Scheduled Window')}
              </button>
            )}

            {/* Options Navigation Tabs */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setActiveTab(activeTab === 'reschedule' ? 'details' : 'reschedule')}
                className={`py-2.5 px-3 rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition ${
                  activeTab === 'reschedule'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <CalendarClock className="w-4 h-4" />
                {isAr ? 'طلب موعد آخر للتوصيل' : 'Reschedule Delivery'}
              </button>

              <button
                onClick={() => setShowCancelModal(true)}
                className="py-2.5 px-3 rounded-xl font-medium text-xs sm:text-sm bg-slate-50 hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-200 hover:border-red-200 flex items-center justify-center gap-2 transition"
              >
                <XCircle className="w-4 h-4" />
                {isAr ? 'طلب إلغاء الشحنة' : 'Cancel Order'}
              </button>
            </div>

            {/* Reschedule Drawer / Form */}
            {activeTab === 'reschedule' && (
              <form onSubmit={handleReschedule} className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <CalendarCheck2 className="w-4 h-4 text-blue-600" />
                    {isAr ? 'حدد موعد التوصيل المناسب لك' : 'Select your preferred delivery time'}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setActiveTab('details')}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    {isAr ? 'إلغاء' : 'Close'}
                  </button>
                </div>

                {/* Date Selection Shortcuts */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    {isAr ? 'اختر اليوم المفضل:' : 'Select Day:'}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedDate(todayStr)}
                      className={`py-2 px-2 rounded-lg text-xs font-bold border text-center transition ${
                        selectedDate === todayStr
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {isAr ? 'اليوم' : 'Today'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedDate(tomorrowStr)}
                      className={`py-2 px-2 rounded-lg text-xs font-bold border text-center transition ${
                        selectedDate === tomorrowStr
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {isAr ? 'غداً' : 'Tomorrow'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedDate(afterTomorrowStr)}
                      className={`py-2 px-2 rounded-lg text-xs font-bold border text-center transition ${
                        selectedDate === afterTomorrowStr
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {isAr ? 'بعد غد' : 'Day After'}
                    </button>
                  </div>

                  {/* Manual Date Input */}
                  <input
                    type="date"
                    min={todayStr}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full mt-2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800"
                  />
                </div>

                {/* Time Slot Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    {isAr ? 'اختر الفترة الزمنية المناسبة:' : 'Select Time Window:'}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {timeSlots.map((slot, index) => {
                      const isSelected = selectedSlot.from === slot.from && selectedSlot.to === slot.to;
                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setSelectedSlot({ from: slot.from, to: slot.to })}
                          className={`p-2.5 rounded-lg border text-start transition flex items-center justify-between text-xs ${
                            isSelected
                              ? 'bg-blue-50 border-blue-600 text-blue-900 font-bold'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span>{isAr ? slot.labelAr : slot.labelEn}</span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 ms-1" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Customer Preference Note */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isAr ? 'ملاحظة للمندوب أو خدمة العملاء (اختياري):' : 'Note for Courier / Support (Optional):'}
                  </label>
                  <textarea
                    rows={2}
                    value={customerNote}
                    onChange={(e) => setCustomerNote(e.target.value)}
                    placeholder={isAr ? 'مثال: يرجى الاتصال بي قبل الوصول بـ 15 دقيقة، أو التسليم لشخص آخر...' : 'e.g., Call me 15 mins before arrival...'}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Submit Reschedule */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {isSubmitting ? (isAr ? 'جاري إرسال الطلب...' : 'Submitting...') : (isAr ? 'إرسال طلب تعديل الموعد' : 'Save New Schedule')}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Company Support & Contact Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm text-center space-y-3">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {isAr ? 'هل تحتاج لمساعدة بخصوص شحنتك؟' : 'Need help with your delivery?'}
          </h4>
          <p className="text-xs text-slate-600">
            {isAr
              ? `فريق خدمة عملاء ${company?.name || 'Delixa'} جاهز للرد على استفساراتك.`
              : 'Our customer support team is here to assist you.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            {company?.phone && (
              <a
                href={`tel:${company.phone}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold transition shadow-2xs"
              >
                <Phone className="w-3.5 h-3.5 text-blue-600" />
                <span>{company.phone}</span>
              </a>
            )}

            {company?.phone && (
              <a
                href={`https://wa.me/2${company.phone.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition shadow-2xs"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isAr ? 'محادثة واتساب' : 'WhatsApp Chat'}</span>
              </a>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center pt-4 text-xs text-slate-400">
          <p>Delixa Last-Mile Delivery Platform &bull; {new Date().getFullYear()}</p>
        </footer>
      </main>

      {/* Confirmation Modal for Order Cancellation */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4 animate-scale-in">
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8" />
            </div>

            <div>
              <h3 className="font-bold text-slate-900 text-lg mb-1">{isAr ? 'تأكيد إلغاء الشحنة' : 'Confirm Order Cancellation'}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {isAr
                  ? 'هل أنت متأكد من رغبتك في إلغاء هذه الشحنة؟ سيتم إشعار متجر التاجر ومندوب التوصيل بالإلغاء.'
                  : 'Are you sure you want to cancel this delivery? The merchant and courier will be notified.'}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                {isAr ? 'تراجع' : 'No, Keep It'}
              </button>

              <button
                type="button"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? (isAr ? 'جاري الإلغاء...' : 'Cancelling...') : (isAr ? 'نعم، إلغاء الشحنة' : 'Yes, Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
