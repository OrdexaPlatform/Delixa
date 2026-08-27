import React, { useState, useEffect } from 'react';
import { db, subscribeOrderUpdates } from '../../lib/db';
import { PublicShipmentView } from '../../types';
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
  Send,
  MessageSquare,
  Sparkles,
  CalendarCheck2,
  CalendarClock,
  RotateCcw,
  Store,
  HelpCircle,
  Clock3
} from 'lucide-react';
import { DelixaLogo } from '../../components/common/DelixaLogo';

interface CustomerShipmentPageProps {
  token: string;
  navigate: (path: string) => void;
}

export const CustomerShipmentPage: React.FC<CustomerShipmentPageProps> = ({ token, navigate }) => {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const isAr = lang === 'ar';

  const [loading, setLoading] = useState<boolean>(true);
  const [shipment, setShipment] = useState<PublicShipmentView | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Interaction & Form states
  const [activeTab, setActiveTab] = useState<'details' | 'reschedule'>('details');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Reschedule Form inputs
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const afterTomorrowStr = new Date(Date.now() + 172800000).toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState<string>(tomorrowStr);
  const [selectedSlot, setSelectedSlot] = useState<{ from: string; to: string }>({ from: '12:00', to: '16:00' });
  const [customerNote, setCustomerNote] = useState<string>('');

  // Cancel Modal states
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [cancelReasonPreset, setCancelReasonPreset] = useState<string>('تغيير في الخطط أو الميزانية');
  const [cancelReasonCustom, setCancelReasonCustom] = useState<string>('');

  // Fetch Shipment Details from Secure Backend API with Fallback
  const loadShipment = async () => {
    const cleanToken = (token || '').trim();
    if (!cleanToken) {
      setErrorCode('INVALID_TOKEN');
      setErrorMessage(isAr ? 'رابط الشحنة غير صالح أو مفقود' : 'Invalid or missing shipment link');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/customer/shipment/${encodeURIComponent(cleanToken)}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      const data = await response.json();

      if (response.ok && data.success && data.shipment) {
        setShipment(data.shipment);
        setErrorCode(null);
        setErrorMessage(null);
        setLoading(false);
        return;
      }

      if (response.status === 410 || data.code === 'EXPIRED') {
        setErrorCode('EXPIRED');
        setErrorMessage(data.error || (isAr ? 'عذراً، هذا الرابط انتهت صلاحيته' : 'This link has expired'));
        setLoading(false);
        return;
      }

      if (response.status === 404 || data.code === 'NOT_FOUND') {
        // Fallback check in local db if running in mock/demo mode
        const fallback = await db.getOrderByToken(cleanToken);
        if (fallback && fallback.order) {
          const formattedFallback: PublicShipmentView = {
            token: fallback.order.confirmation_token || cleanToken,
            order_number: fallback.order.order_number,
            status: fallback.order.status,
            customer_name: fallback.order.customer_name,
            customer_phone: fallback.order.customer_phone,
            customer_address: fallback.order.customer_address,
            city_area: fallback.order.city_area,
            governorate: fallback.order.governorate,
            customer_landmark: fallback.order.customer_landmark,
            cod_amount: Number(fallback.order.cod_amount) || 0,
            delivery_date: fallback.order.delivery_date,
            delivery_from: fallback.order.delivery_from,
            delivery_to: fallback.order.delivery_to,
            customer_response_status: fallback.order.customer_response_status || 'pending',
            customer_responded_at: fallback.order.customer_responded_at,
            customer_selected_date: fallback.order.customer_selected_date,
            customer_selected_from: fallback.order.customer_selected_from,
            customer_selected_to: fallback.order.customer_selected_to,
            customer_note: fallback.order.customer_note,
            customer_cancellation_reason: (fallback.order as any).customer_cancellation_reason,
            created_at: fallback.order.created_at,
            link_opened_at: fallback.order.link_opened_at,
            last_link_opened_at: fallback.order.last_link_opened_at,
            link_open_count: fallback.order.link_open_count || 1,
            merchant: fallback.merchant ? {
              store_name: fallback.merchant.store_name,
              brand_name: fallback.merchant.brand_name,
              phone: fallback.merchant.phone,
              whatsapp: fallback.merchant.whatsapp,
              logo_url: fallback.merchant.logo_url,
            } : null,
            company: fallback.company ? {
              name: fallback.company.name,
              phone: fallback.company.phone,
            } : null,
          };
          setShipment(formattedFallback);
          setErrorCode(null);
          setErrorMessage(null);
          setLoading(false);
          return;
        }

        setErrorCode('NOT_FOUND');
        setErrorMessage(data.error || (isAr ? 'لم يتم العثور على الشحنة. قد يكون الرابط خاطئاً.' : 'Shipment not found.'));
        setLoading(false);
        return;
      }

      setErrorCode('ERROR');
      setErrorMessage(data.error || (isAr ? 'تعذر جلب تفاصيل الشحنة' : 'Failed to fetch shipment details'));
    } catch (err: any) {
      console.warn('Backend API connection warning, trying fallback client store:', err);
      const fallback = await db.getOrderByToken(cleanToken);
      if (fallback && fallback.order) {
        setShipment({
          token: fallback.order.confirmation_token || cleanToken,
          order_number: fallback.order.order_number,
          status: fallback.order.status,
          customer_name: fallback.order.customer_name,
          customer_phone: fallback.order.customer_phone,
          customer_address: fallback.order.customer_address,
          city_area: fallback.order.city_area,
          governorate: fallback.order.governorate,
          customer_landmark: fallback.order.customer_landmark,
          cod_amount: Number(fallback.order.cod_amount) || 0,
          delivery_date: fallback.order.delivery_date,
          delivery_from: fallback.order.delivery_from,
          delivery_to: fallback.order.delivery_to,
          customer_response_status: fallback.order.customer_response_status || 'pending',
          customer_responded_at: fallback.order.customer_responded_at,
          customer_selected_date: fallback.order.customer_selected_date,
          customer_selected_from: fallback.order.customer_selected_from,
          customer_selected_to: fallback.order.customer_selected_to,
          customer_note: fallback.order.customer_note,
          created_at: fallback.order.created_at,
          merchant: fallback.merchant ? {
            store_name: fallback.merchant.store_name,
            brand_name: fallback.merchant.brand_name,
            phone: fallback.merchant.phone,
            whatsapp: fallback.merchant.whatsapp,
          } : null,
          company: fallback.company ? {
            name: fallback.company.name,
            phone: fallback.company.phone,
          } : null,
        });
        setErrorCode(null);
        setErrorMessage(null);
      } else {
        setErrorCode('NETWORK_ERROR');
        setErrorMessage(isAr ? 'تعذر الاتصال بالخادم، يرجى التحقق من اتصال الإنترنت' : 'Connection error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShipment();

    // Subscribe to live order updates
    const unsubscribe = subscribeOrderUpdates(() => {
      loadShipment();
    });

    return () => unsubscribe();
  }, [token]);

  // Action: Confirm Delivery in Scheduled Window
  const handleConfirm = async () => {
    if (!token || isSubmitting) return;
    setIsSubmitting(true);
    setSuccessNotice(null);

    try {
      const response = await fetch(`/api/customer/shipment/${encodeURIComponent(token)}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: customerNote }),
      });

      const res = await response.json();

      if (response.ok && res.success && res.shipment) {
        setShipment(res.shipment);
        setSuccessNotice(
          isAr
            ? 'تم تأكيد موعد استلام الشحنة بنجاح! مندوب التوصيل في طريقه إليك في الموعد المحدد.'
            : 'Delivery confirmed successfully! Our courier is scheduled for your window.'
        );
      } else {
        // Fallback
        const fbRes = await db.customerConfirmDelivery(token);
        if (fbRes.success && fbRes.order) {
          loadShipment();
          setSuccessNotice(isAr ? 'تم تأكيد موعد الاستلام بنجاح!' : 'Delivery confirmed successfully!');
        } else {
          alert(res.error || fbRes.error || (isAr ? 'حدث خطأ أثناء التأكيد' : 'Confirmation error'));
        }
      }
    } catch (e: any) {
      alert(e.message || 'حدث خطأ غير متوقع');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action: Reschedule Delivery Date & Time Slot
  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || isSubmitting) return;
    setIsSubmitting(true);
    setSuccessNotice(null);

    try {
      const response = await fetch(`/api/customer/shipment/${encodeURIComponent(token)}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_date: selectedDate,
          new_from: selectedSlot.from,
          new_to: selectedSlot.to,
          note: customerNote,
        }),
      });

      const res = await response.json();

      if (response.ok && res.success && res.shipment) {
        setShipment(res.shipment);
        setActiveTab('details');
        setSuccessNotice(
          isAr
            ? `تم تسجيل طلبك بتعديل الموعد إلى ${selectedDate} بنجاح!`
            : `Reschedule request for ${selectedDate} saved!`
        );
      } else {
        // Fallback
        const fbRes = await db.customerRescheduleDelivery(token, selectedDate, selectedSlot.from, selectedSlot.to, customerNote);
        if (fbRes.success) {
          loadShipment();
          setActiveTab('details');
          setSuccessNotice(isAr ? 'تم تعديل الموعد بنجاح!' : 'Rescheduled successfully!');
        } else {
          alert(res.error || fbRes.error || 'حدث خطأ أثناء تعديل الموعد');
        }
      }
    } catch (e: any) {
      alert(e.message || 'حدث خطأ غير متوقع');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action: Cancel Delivery
  const handleCancel = async () => {
    if (!token || isSubmitting) return;
    setIsSubmitting(true);
    setSuccessNotice(null);

    const finalReason = cancelReasonCustom.trim() || cancelReasonPreset;

    try {
      const response = await fetch(`/api/customer/shipment/${encodeURIComponent(token)}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: finalReason }),
      });

      const res = await response.json();

      if (response.ok && res.success && res.shipment) {
        setShipment(res.shipment);
        setShowCancelModal(false);
        setActiveTab('details');
        setSuccessNotice(isAr ? 'تم إلغاء الشحنة بناءً على طلبك.' : 'Shipment cancelled upon your request.');
      } else {
        // Fallback
        const fbRes = await db.customerCancelDelivery(token);
        if (fbRes.success) {
          loadShipment();
          setShowCancelModal(false);
          setActiveTab('details');
          setSuccessNotice(isAr ? 'تم إلغاء الشحنة بنجاح.' : 'Cancelled successfully.');
        } else {
          alert(res.error || fbRes.error || 'حدث خطأ أثناء إلغاء الشحنة');
        }
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

  const cancelReasons = [
    { id: '1', labelAr: 'تغيير في الخطط أو الميزانية', labelEn: 'Change in plans or budget' },
    { id: '2', labelAr: 'تأخر موعد استلام الطلب', labelEn: 'Delivery took too long' },
    { id: '3', labelAr: 'طلب مكرر أو بالخطأ', labelEn: 'Duplicate or accidental order' },
    { id: '4', labelAr: 'غير متواجد في العنوان حالياً', labelEn: 'Away from delivery address' },
    { id: '5', labelAr: 'سبب آخر', labelEn: 'Other reason' },
  ];

  // 1. Loading Skeleton Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4" dir={isAr ? 'rtl' : 'ltr'}>
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-lg border border-slate-200/80">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h3 className="font-bold text-slate-900 text-lg mb-1">{isAr ? 'جاري تحميل بيانات شحنتك...' : 'Loading shipment details...'}</h3>
          <p className="text-slate-500 text-xs">{isAr ? 'يرجى الانتظار لحظة واحدة' : 'Please wait a moment'}</p>
        </div>
      </div>
    );
  }

  // 2. Error / Expired / Not Found Screen
  if (errorCode || !shipment) {
    const isExpired = errorCode === 'EXPIRED';
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4" dir={isAr ? 'rtl' : 'ltr'}>
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-xl border border-slate-200/80">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
            isExpired ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
          }`}>
            {isExpired ? <Clock3 className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            {isExpired
              ? (isAr ? 'انتهت صلاحية الرابط' : 'Link Expired')
              : (isAr ? 'تعذر العثور على الشحنة' : 'Shipment Not Found')}
          </h2>
          <p className="text-slate-600 text-sm mb-6 leading-relaxed">
            {errorMessage || (isAr ? 'الرابط الذي قمت بفتحه غير صحيح أو انتهت صلاحيته.' : 'The link is invalid or has expired.')}
          </p>

          <div className="space-y-2">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition shadow-sm text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{isAr ? 'إعادة المحاولة' : 'Retry'}</span>
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 rounded-xl transition text-sm cursor-pointer"
            >
              {isAr ? 'العودة للصفحة الرئيسية' : 'Return to Home'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isConfirmed = shipment.customer_response_status === 'confirmed';
  const isRescheduled = shipment.customer_response_status === 'reschedule_requested';
  const isCustomerCancelled = shipment.customer_response_status === 'cancelled' || shipment.status === 'cancelled';
  const isDelivered = shipment.status === 'delivered';

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-800 pb-16 selection:bg-blue-600 selection:text-white" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Sticky Branding Header */}
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30 shadow-xs">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DelixaLogo size="sm" badgeText="DELIVERY" />
            <div className="border-s border-slate-200 ps-3">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-900 text-xs sm:text-sm leading-tight">
                  {shipment.company?.name || 'شركة الشحن والتوصيل'}
                </span>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-[11px] text-slate-500 font-medium">بوابة تأكيد استلام الشحنة</p>
            </div>
          </div>

          {/* Language Toggle */}
          <button
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 transition cursor-pointer min-h-[38px]"
          >
            {lang === 'ar' ? 'English' : 'عربي'}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-2xl mx-auto px-4 pt-5 space-y-4">
        {/* Prominent Store Notification Card */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-3xl p-5 shadow-lg border border-blue-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider font-bold text-blue-300 flex items-center gap-1">
              <Package className="w-3.5 h-3.5" />
              {isAr ? 'إشعار وصول شحنة جديدة' : 'New Shipment Notice'}
            </span>
            <span className="text-xs font-mono font-bold bg-blue-800/80 text-blue-200 px-2.5 py-0.5 rounded-full border border-blue-700">
              #{shipment.order_number}
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black leading-tight text-white">
            {isAr ? (
              <>
                لديك شحنة جاهزة للتسليم من متجر{' '}
                <span className="text-amber-300 underline decoration-amber-400/50">
                  {shipment.merchant?.store_name || shipment.merchant?.brand_name || 'المتجر'}
                </span>
              </>
            ) : (
              <>
                You have a delivery from{' '}
                <span className="text-amber-300">
                  {shipment.merchant?.store_name || shipment.merchant?.brand_name || 'Merchant'}
                </span>
              </>
            )}
          </h2>
          <p className="text-xs text-blue-200/90 mt-1.5">
            {isAr ? 'يرجى مراجعة تفاصيل العنوان والمبلغ وتأكيد الاستلام لتسهيل وصول المندوب إليك.' : 'Please review the delivery details, amount, and confirm your window.'}
          </p>
        </div>
        {/* Dynamic Success Alert Banner */}
        {successNotice && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl p-4 flex items-start gap-3 shadow-xs animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-sm font-bold leading-relaxed">{successNotice}</div>
          </div>
        )}

        {/* Dynamic State Banner */}
        <div className={`rounded-3xl p-5 border shadow-sm transition-all ${
          isDelivered
            ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
            : isConfirmed
            ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
            : isRescheduled
            ? 'bg-amber-50 border-amber-300 text-amber-950'
            : isCustomerCancelled
            ? 'bg-rose-50 border-rose-300 text-rose-950'
            : 'bg-blue-50 border-blue-200 text-blue-950'
        }`}>
          <div className="flex items-start gap-3.5">
            <div className="mt-0.5 shrink-0">
              {isDelivered && <CheckCircle2 className="w-7 h-7 text-emerald-600" />}
              {!isDelivered && isConfirmed && <CheckCircle2 className="w-7 h-7 text-emerald-600" />}
              {!isDelivered && isRescheduled && <CalendarClock className="w-7 h-7 text-amber-600" />}
              {!isDelivered && isCustomerCancelled && <XCircle className="w-7 h-7 text-rose-600" />}
              {!isDelivered && !isConfirmed && !isRescheduled && !isCustomerCancelled && (
                <Clock className="w-7 h-7 text-blue-600 animate-pulse" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="font-extrabold text-base mb-1">
                {isDelivered
                  ? (isAr ? 'تم تسليم الشحنة بنجاح' : 'Shipment Delivered Successfully')
                  : isConfirmed
                  ? (isAr ? 'تم تأكيد موعد استلام شحنتك' : 'Delivery Confirmed by Customer')
                  : isRescheduled
                  ? (isAr ? 'تم تسجيل طلب تعديل موعد التوصيل' : 'Reschedule Requested')
                  : isCustomerCancelled
                  ? (isAr ? 'تم إلغاء الشحنة' : 'Shipment Cancelled')
                  : (isAr ? 'يرجى تأكيد موعد استلام شحنتك اليوم' : 'Please Confirm Delivery Schedule')}
              </h2>
              <p className="text-xs sm:text-sm leading-relaxed opacity-95">
                {isDelivered
                  ? (isAr ? 'نتمنى أن تكون تجربتك ممتازة. شكراً لثقتكم بنا وبالمتجر.' : 'Thank you for receiving your order with us.')
                  : isConfirmed
                  ? (isAr ? `مندوبنا سيتواصل معك للتسليم في الموعد المحدد (${shipment.delivery_date} بين ${shipment.delivery_from} و ${shipment.delivery_to}). يرجى التأكد من التواجد وتجهيز المبلغ المطلوب.` : `Our courier will deliver on ${shipment.delivery_date} between ${shipment.delivery_from} and ${shipment.delivery_to}.`)
                  : isRescheduled
                  ? (isAr ? `الموعد الجديد المطلوب: (${shipment.customer_selected_date || selectedDate} بين ${shipment.customer_selected_from || '12:00'} و ${shipment.customer_selected_to || '16:00'}). سيتم التنسيق معك وتحديث خط السير.` : `Requested date: ${shipment.customer_selected_date}. Dispatch route updated.`)
                  : isCustomerCancelled
                  ? (isAr ? `تم تسجيل إلغاء الطلب في النظام.${shipment.customer_cancellation_reason ? ` (السبب: ${shipment.customer_cancellation_reason})` : ''}` : 'Order has been cancelled.')
                  : (isAr ? 'لضمان وصول المندوب في الوقت الأنسب لك وبدون أي تأخير، يرجى تأكيد الموعد بالضغط على الزر الأخضر أدناه.' : 'Please confirm your availability to receive your order during the scheduled delivery window.')}
              </p>
            </div>
          </div>
        </div>

        {/* Primary Shipment Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Order Header & Store Tag */}
          <div className="p-5 border-b border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">{isAr ? 'رقم الشحنة' : 'Order Tracking'}</span>
              <span className="font-mono font-black text-slate-900 text-lg">#{shipment.order_number}</span>
            </div>

            {shipment.merchant && (
              <div className="text-end">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">{isAr ? 'مرسل من متجر' : 'Store'}</span>
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-blue-50 text-blue-900 border border-blue-200 rounded-full font-bold text-xs">
                  <Store className="w-3.5 h-3.5 text-blue-600" />
                  {shipment.merchant.store_name}
                </span>
              </div>
            )}
          </div>

          {/* COD Payment Highlight */}
          <div className="p-5 bg-gradient-to-r from-emerald-50 via-white to-blue-50/30 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold text-emerald-950 block">{isAr ? 'المطلوب تحصيله عند الاستلام (COD)' : 'Cash on Delivery Amount'}</span>
                  <span className="text-xs text-slate-500">{isAr ? 'الدفع نقداً للمندوب عند تسليم الشحنة' : 'Pay cash to courier upon delivery'}</span>
                </div>
              </div>
              <div className="text-end">
                <span className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">{Number(shipment.cod_amount).toFixed(2)}</span>
                <span className="text-xs font-bold text-emerald-800 ms-1">{isAr ? 'ج.م' : 'EGP'}</span>
              </div>
            </div>
          </div>

          {/* Delivery Schedule Info */}
          <div className="p-5 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500 block">{isAr ? 'تاريخ التوصيل المجدول' : 'Delivery Date'}</span>
                <span className="font-bold text-slate-900 text-sm">
                  {shipment.delivery_date || todayStr} {shipment.delivery_date === todayStr ? (isAr ? '(اليوم)' : '(Today)') : ''}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500 block">{isAr ? 'نافذة وقت الوصول المتوقع' : 'Delivery Window'}</span>
                <span className="font-bold text-slate-900 text-sm" dir="ltr">
                  {shipment.delivery_from || '12:00'} - {shipment.delivery_to || '16:00'}
                </span>
              </div>
            </div>
          </div>

          {/* Customer Address Details */}
          <div className="p-5 space-y-2">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <span className="text-xs font-medium text-slate-500 block">{isAr ? 'عنوان ومكان الاستلام' : 'Delivery Address'}</span>
                <p className="font-bold text-slate-900 text-sm leading-snug">{shipment.customer_address}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-600">
                  {shipment.city_area && <span className="px-2.5 py-0.5 bg-slate-100 font-semibold rounded-lg">{shipment.city_area}</span>}
                  {shipment.governorate && <span className="px-2.5 py-0.5 bg-slate-100 font-semibold rounded-lg">{shipment.governorate}</span>}
                  {shipment.customer_landmark && (
                    <span className="text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-lg font-medium">
                      {isAr ? 'علامة مميزة:' : 'Landmark:'} {shipment.customer_landmark}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls Area (Active when not delivered and not cancelled) */}
        {!isDelivered && !isCustomerCancelled && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              {isAr ? 'خيارات العميل لتأكيد الشحنة' : 'Customer Actions'}
            </h3>

            {/* Quick Confirm Button */}
            {!isConfirmed && activeTab === 'details' && (
              <button
                id="btn-customer-confirm-main"
                type="button"
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-extrabold py-4 px-4 rounded-2xl transition shadow-md flex items-center justify-center gap-2.5 text-base cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-5 h-5" />
                {isSubmitting
                  ? (isAr ? 'جاري تأكيد الشحنة...' : 'Confirming...')
                  : (isAr ? 'تأكيد استلام الشحنة في الموعد المحدد' : 'Confirm Delivery in Scheduled Window')}
              </button>
            )}

            {/* Action Tabs Grid */}
            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
              <button
                id="btn-toggle-reschedule"
                type="button"
                onClick={() => setActiveTab(activeTab === 'reschedule' ? 'details' : 'reschedule')}
                className={`py-3 px-3 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
                  activeTab === 'reschedule'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <CalendarClock className="w-4 h-4" />
                {isAr ? 'طلب موعد آخر للتوصيل' : 'Reschedule Delivery'}
              </button>

              <button
                id="btn-open-cancel-modal"
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="py-3 px-3 rounded-2xl font-bold text-xs sm:text-sm bg-slate-50 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                {isAr ? 'طلب إلغاء الشحنة' : 'Cancel Order'}
              </button>
            </div>

            {/* Reschedule Drawer / Form */}
            {activeTab === 'reschedule' && (
              <form onSubmit={handleReschedule} className="mt-4 p-4.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <CalendarCheck2 className="w-4 h-4 text-blue-600" />
                    {isAr ? 'حدد موعد التوصيل الجديد المناسب لك' : 'Select your preferred delivery time'}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setActiveTab('details')}
                    className="text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                  >
                    {isAr ? 'إغلاق' : 'Close'}
                  </button>
                </div>

                {/* Day Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    {isAr ? 'اختر اليوم المناسب:' : 'Select Day:'}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedDate(todayStr)}
                      className={`py-2.5 px-2 rounded-xl text-xs font-bold border text-center transition cursor-pointer ${
                        selectedDate === todayStr
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {isAr ? 'اليوم' : 'Today'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedDate(tomorrowStr)}
                      className={`py-2.5 px-2 rounded-xl text-xs font-bold border text-center transition cursor-pointer ${
                        selectedDate === tomorrowStr
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {isAr ? 'غداً' : 'Tomorrow'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedDate(afterTomorrowStr)}
                      className={`py-2.5 px-2 rounded-xl text-xs font-bold border text-center transition cursor-pointer ${
                        selectedDate === afterTomorrowStr
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {isAr ? 'بعد غد' : 'Day After'}
                    </button>
                  </div>

                  <input
                    type="date"
                    min={todayStr}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full mt-2.5 bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800"
                  />
                </div>

                {/* Time Slots */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
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
                          className={`p-3 rounded-xl border text-start transition flex items-center justify-between text-xs cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50 border-blue-600 text-blue-950 font-bold'
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

                {/* Customer Note */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isAr ? 'ملاحظة لمندوب الشحن (اختياري):' : 'Note for Courier (Optional):'}
                  </label>
                  <textarea
                    rows={2}
                    value={customerNote}
                    onChange={(e) => setCustomerNote(e.target.value)}
                    placeholder={isAr ? 'مثال: يرجى الاتصال بي قبل الوصول بـ 15 دقيقة...' : 'e.g., Please call 15 minutes before arrival...'}
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Submit Reschedule */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs sm:text-sm transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {isSubmitting ? (isAr ? 'جاري إرسال التعديل...' : 'Submitting...') : (isAr ? 'حفظ وإرسال الموعد الجديد' : 'Save & Submit New Schedule')}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Company & Support Contact Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm text-center space-y-3">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-blue-600" />
            {isAr ? 'هل تحتاج لمساعدة بخصوص شحنتك؟' : 'Need Help with Your Delivery?'}
          </h4>
          <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
            {isAr
              ? `فريق خدمة عملاء ${shipment.company?.name || 'شركة الشحن'} جاهز لمساعدتك في أي وقت.`
              : 'Our customer support team is available to help.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            {shipment.company?.phone && (
              <a
                href={`tel:${shipment.company.phone}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold transition shadow-2xs"
              >
                <Phone className="w-3.5 h-3.5 text-blue-600" />
                <span>{shipment.company.phone}</span>
              </a>
            )}

            {shipment.company?.phone && (
              <a
                href={`https://wa.me/2${shipment.company.phone.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-xl text-xs font-bold transition shadow-2xs"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isAr ? 'محادثة واتساب' : 'WhatsApp Support'}</span>
              </a>
            )}
          </div>
        </div>

        {/* Safe Secure Footer */}
        <footer className="text-center pt-2 text-xs text-slate-400">
          <p>Delixa Last-Mile Logistics Platform &bull; {new Date().getFullYear()}</p>
        </footer>
      </main>

      {/* Cancellation Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4 animate-scale-in">
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8" />
            </div>

            <div>
              <h3 className="font-bold text-slate-900 text-lg mb-1">{isAr ? 'تأكيد إلغاء الشحنة' : 'Confirm Order Cancellation'}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {isAr
                  ? 'يرجى اختيار سبب الإلغاء لإشعار المتجر ومندوب الشحن.'
                  : 'Please select a cancellation reason for the merchant and courier.'}
              </p>
            </div>

            {/* Cancel Reasons Selection */}
            <div className="text-start space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {cancelReasons.map((r) => (
                <label
                  key={r.id}
                  onClick={() => setCancelReasonPreset(r.labelAr)}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                    cancelReasonPreset === r.labelAr
                      ? 'bg-rose-50 border-rose-300 text-rose-950 font-bold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="cancel_reason"
                    checked={cancelReasonPreset === r.labelAr}
                    onChange={() => setCancelReasonPreset(r.labelAr)}
                    className="text-rose-600 focus:ring-rose-500"
                  />
                  <span>{isAr ? r.labelAr : r.labelEn}</span>
                </label>
              ))}
            </div>

            {cancelReasonPreset === 'سبب آخر' && (
              <input
                type="text"
                value={cancelReasonCustom}
                onChange={(e) => setCancelReasonCustom(e.target.value)}
                placeholder={isAr ? 'اكتب سبب الإلغاء هنا...' : 'Type reason here...'}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
              />
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                {isAr ? 'تراجع' : 'Keep Order'}
              </button>

              <button
                type="button"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (isAr ? 'جاري الإلغاء...' : 'Cancelling...') : (isAr ? 'تأكيد الإلغاء' : 'Yes, Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
