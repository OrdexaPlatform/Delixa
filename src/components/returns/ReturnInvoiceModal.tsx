import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { ReturnRecord, Order, Merchant, Courier } from '../../types';
import { RETURN_REASONS } from '../../lib/db';
import { Modal } from '../common/Modal';
import { 
  Printer, 
  RotateCcw, 
  Store, 
  User, 
  MapPin, 
  Phone, 
  Calendar, 
  DollarSign, 
  Truck, 
  FileText, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertTriangle,
  Building2,
  Barcode,
  Share2,
  Send,
  Mail,
  ShieldCheck
} from 'lucide-react';

interface ReturnInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnRecord: ReturnRecord | null;
  order: Order | null;
  merchant: Merchant | null;
  courier: Courier | null;
  companyName: string;
  companyPhone?: string;
  companyAddress?: string;
  companyLogoUrl?: string;
}

export const ReturnInvoiceModal: React.FC<ReturnInvoiceModalProps> = ({
  isOpen,
  onClose,
  returnRecord,
  order,
  merchant,
  courier,
  companyName,
  companyPhone,
  companyAddress,
  companyLogoUrl
}) => {
  const { t, isRTL } = useLanguage();

  if (!returnRecord) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = () => {
    const phone = merchant?.whatsapp || merchant?.phone || returnRecord.customer_phone;
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const fullPhone = cleanPhone.startsWith('0') ? `2${cleanPhone}` : cleanPhone;
    
    const message = `*سند إرجاع شحنة — ${companyName}*
رقم الإرجاع: ${returnRecord.return_number}
رقم الشحنة: ${order?.order_number || '—'}
اسم العميل: ${returnRecord.customer_name}
السبب: ${getReasonLabel(returnRecord.return_reason)}
من يتحمل التكلفة: ${getPayerLabel(returnRecord.return_cost_payer)}
المبلغ القابل للاسترداد: ${Number(returnRecord.refundable_amount || returnRecord.return_amount).toLocaleString()} ج.م
تكلفة الإرجاع: ${Number(returnRecord.return_cost_amount || 0).toLocaleString()} ج.م
صافي استرداد العميل: ${Number(returnRecord.customer_net_refund ?? returnRecord.return_amount).toLocaleString()} ج.م
${returnRecord.merchant_charge_amount ? `مديونية التاجر: ${returnRecord.merchant_charge_amount.toLocaleString()} ج.م` : ''}

شكراً لتعاملكم معنا.`;

    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleSendEmail = () => {
    const email = merchant?.email || '';
    const subject = `سند إرجاع شحنة ${returnRecord.return_number} — ${companyName}`;
    const body = `سند إرجاع شحنة رقم ${returnRecord.return_number}
رقم الشحنة الأصلية: ${order?.order_number || '—'}
المتجر: ${merchant?.store_name || '—'}
العميل: ${returnRecord.customer_name}
صافي استرداد العميل: ${Number(returnRecord.customer_net_refund ?? returnRecord.return_amount).toLocaleString()} ج.م`;

    window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
  };

  const getReasonLabel = (reasonKey: string) => {
    const found = RETURN_REASONS.find(r => r.id === reasonKey);
    if (found) {
      return isRTL ? found.label : found.enLabel;
    }
    return reasonKey;
  };

  const getPayerLabel = (payer?: string) => {
    if (payer === 'customer') return 'العميل (Customer)';
    if (payer === 'merchant') return 'التاجر / المتجر (Merchant)';
    return 'بدون تكلفة (No Cost)';
  };

  const getStatusBadge = (status: ReturnRecord['status']) => {
    switch (status) {
      case 'created':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5" />
            {t.statusReturnCreated}
          </span>
        );
      case 'with_courier':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Truck className="w-3.5 h-3.5" />
            {t.statusReturnWithCourier}
          </span>
        );
      case 'returned':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {t.statusReturnReturned}
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" />
            {t.statusReturnCancelled}
          </span>
        );
      default:
        return null;
    }
  };

  const refundableAmt = Number(returnRecord.refundable_amount ?? returnRecord.return_amount) || 0;
  const returnCostAmt = Number(returnRecord.return_cost_amount ?? 0) || 0;
  const customerNetRefund = Number(returnRecord.customer_net_refund ?? returnRecord.return_amount) || 0;
  const merchantChargeAmt = Number(returnRecord.merchant_charge_amount ?? 0) || 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t.returnInvoiceTitle}
      subtitle={`${returnRecord.return_number} — ${order?.order_number || ''}`}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-6">
        
        {/* Print & Share Action Bar */}
        <div className="flex flex-wrap items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl gap-3 print:hidden">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Printer className="w-4 h-4 text-blue-600" />
            <span>طباعة وإرسال سند وإشعار الإرجاع كفاتورة رسمية</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSendWhatsApp}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
              title="إرسال عبر واتساب"
            >
              <Send className="w-3.5 h-3.5" />
              <span>واتساب</span>
            </button>

            {merchant?.email && (
              <button
                onClick={handleSendEmail}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
                title="إرسال عبر البريد الإلكتروني"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>إيميل</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>{t.printReturnInvoice}</span>
            </button>
          </div>
        </div>

        {/* Official Return Invoice Document */}
        <div id="printable-return-invoice" className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
            <div>
              <div className="flex items-center gap-3">
                {companyLogoUrl ? (
                  <img
                    src={companyLogoUrl}
                    alt={companyName}
                    className="w-12 h-12 rounded-xl object-contain border border-slate-200 bg-white p-1"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
                    D
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-black text-slate-900 leading-none">
                    {companyName || 'Delixa Shipping'}
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {companyAddress ? `${companyAddress} • ` : ''}{companyPhone || ''}
                  </p>
                </div>
              </div>
            </div>

            <div className="text-start sm:text-end">
              <div className="text-xs font-bold text-rose-600 uppercase tracking-wider">
                {t.returnInvoiceTitle}
              </div>
              <div className="text-xl font-black font-mono text-slate-900 mt-0.5">
                {returnRecord.return_number}
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-1.5 justify-start sm:justify-end mt-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{new Date(returnRecord.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>

          {/* Status & Barcode Ribbon */}
          <div className="py-4 flex flex-wrap items-center justify-between border-b border-slate-100 gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-500">{t.returnStatus}:</span>
              {getStatusBadge(returnRecord.status)}
            </div>

            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 font-mono text-xs text-slate-700">
              <Barcode className="w-5 h-5 text-slate-400" />
              <span>{returnRecord.return_number}</span>
            </div>
          </div>

          {/* Grid: 3 Columns Information Snapshot */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-b border-slate-200 text-xs">
            
            {/* Column 1: Merchant / Store */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs text-blue-700 border-b border-slate-200 pb-2">
                <Store className="w-4 h-4" />
                <span>{t.merchantInfoSection}</span>
              </div>
              <div className="text-sm font-bold text-slate-900">{merchant?.store_name || '—'}</div>
              {merchant?.brand_name && <div className="text-[11px] text-blue-600 font-semibold">العلامة: {merchant.brand_name}</div>}
              <div className="text-slate-600">المسؤول: {merchant?.owner_name || '—'}</div>
              <div className="text-slate-600 font-mono">الهاتف: {merchant?.phone || '—'}</div>
              <div className="text-slate-500 text-[11px] leading-relaxed">{merchant?.address || '—'}</div>
            </div>

            {/* Column 2: Customer / Sender of return */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs text-emerald-700 border-b border-slate-200 pb-2">
                <User className="w-4 h-4" />
                <span>{t.returnCustomerInfo}</span>
              </div>
              <div className="text-sm font-bold text-slate-900">{returnRecord.customer_name}</div>
              <div className="text-slate-600 font-mono">الهاتف: {returnRecord.customer_phone}</div>
              <div className="text-slate-600 text-[11px] leading-relaxed flex items-start gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                <span>{returnRecord.return_address}</span>
              </div>
            </div>

            {/* Column 3: Original Order & Courier */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs text-indigo-700 border-b border-slate-200 pb-2">
                <FileText className="w-4 h-4" />
                <span>{t.originalOrderDetails}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">{t.orderNumber}:</span>
                <span className="font-mono font-bold text-blue-700">{order?.order_number || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">حالة الشحنة الأصلية:</span>
                <span className="font-bold text-slate-800">{order?.status || '—'}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-500">{t.assignedReturnCourier}:</span>
                <span className="font-bold text-slate-900">{courier ? `${courier.full_name} (${courier.employee_id})` : t.unassignedReturnCourier}</span>
              </div>
            </div>

          </div>

          {/* Reason & Notes Card */}
          <div className="py-5 border-b border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-100">
              <div className="font-bold text-rose-900 mb-1 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>{t.returnReason}:</span>
                <span className="font-extrabold text-rose-700 underline underline-offset-2">
                  {getReasonLabel(returnRecord.return_reason)}
                </span>
              </div>
              {returnRecord.other_reason && (
                <p className="text-slate-700 mt-1 text-[11px] leading-relaxed">
                  <span className="font-bold">التفاصيل:</span> {returnRecord.other_reason}
                </p>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-500" />
                <span>{t.returnNotes}:</span>
              </div>
              <p className="text-slate-600 text-[11px] italic">
                {returnRecord.notes || 'لا توجد ملاحظات إضافية مسجلة.'}
              </p>
            </div>
          </div>

          {/* Financial Breakdown & Cost Payer Table */}
          <div className="py-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                {t.returnFinancialInfo} وقواعد تحمّل التكلفة
              </h3>
              <span className="text-xs font-bold px-2.5 py-1 rounded bg-blue-50 text-blue-800 border border-blue-200">
                تحمّل التكلفة: {getPayerLabel(returnRecord.return_cost_payer)}
              </span>
            </div>
            
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4 text-start">البند / البيان المالي</th>
                    <th className="py-2.5 px-4 text-end">القيمة ({t.currency})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-3 px-4 text-slate-800 font-medium">
                      المبلغ القابل للاسترداد (قيمة الشحنة)
                    </td>
                    <td className="py-3 px-4 text-end font-mono font-bold text-slate-900">
                      {refundableAmt.toLocaleString()} {t.currency}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-slate-800 font-medium">
                      تكلفة نقل وإعادة الشحنة (Return Cost)
                    </td>
                    <td className="py-3 px-4 text-end font-mono font-bold text-slate-900">
                      {returnCostAmt.toLocaleString()} {t.currency}
                    </td>
                  </tr>
                  <tr className="bg-emerald-50/50">
                    <td className="py-3 px-4 text-emerald-950 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      صافي المبلغ المسترد للعميل (Customer Net Refund)
                    </td>
                    <td className="py-3 px-4 text-end font-mono font-black text-emerald-700 text-sm">
                      {customerNetRefund.toLocaleString()} {t.currency}
                    </td>
                  </tr>
                  {merchantChargeAmt > 0 && (
                    <tr className="bg-indigo-50/50">
                      <td className="py-3 px-4 text-indigo-950 font-bold flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                        مديونية مقيدة على حساب التاجر (Merchant Debit)
                      </td>
                      <td className="py-3 px-4 text-end font-mono font-black text-indigo-700 text-sm">
                        +{merchantChargeAmt.toLocaleString()} {t.currency}
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-slate-900 text-white font-bold">
                  <tr>
                    <td className="py-3.5 px-4 text-sm font-black">
                      إجمالي قيمة حركة الإرجاع
                    </td>
                    <td className="py-3.5 px-4 text-end text-base font-black font-mono text-emerald-400">
                      {Number(returnRecord.total_return_amount).toLocaleString()} {t.currency}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Signatures & Execution Section */}
          <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs text-center">
            <div className="p-4 rounded-xl border border-dashed border-slate-300">
              <div className="font-bold text-slate-700 mb-10">
                توقيع واستلام المتجر (Merchant Receiver)
              </div>
              <div className="border-t border-slate-300 pt-2 text-[11px] text-slate-500">
                {merchant?.owner_name || 'الاسم والتوقيع والتاريخ'}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-dashed border-slate-300">
              <div className="font-bold text-slate-700 mb-10">
                توقيع مندوب الشحن (Courier Signature)
              </div>
              <div className="border-t border-slate-300 pt-2 text-[11px] text-slate-500">
                {courier?.full_name || 'مندوب التوصيل'} — {courier?.employee_id || ''}
              </div>
            </div>
          </div>

          {/* Document Footer */}
          <div className="mt-8 text-center text-[10px] text-slate-400 border-t border-slate-100 pt-4">
            تم إصدار هذا السند إلكترونياً عبر منصة {companyName || 'Delixa'} لإدارة عمليات الشحن والتوصيل • {new Date().toISOString()}
          </div>

        </div>

        {/* Modal Close Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-100 print:hidden">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
          >
            {t.close}
          </button>
        </div>

      </div>
    </Modal>
  );
};
