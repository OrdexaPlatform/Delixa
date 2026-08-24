import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Courier, CourierSettlement, CourierCollectionSummary } from '../../types';
import { Modal } from '../common/Modal';
import { 
  Printer, 
  Send, 
  Receipt, 
  User, 
  MapPin, 
  Phone, 
  Calendar, 
  Building2, 
  CheckCircle2, 
  Coins, 
  FileText,
  Clock,
  ShieldCheck,
  CreditCard
} from 'lucide-react';

interface CourierSettlementReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  settlement: CourierSettlement | null;
  courier: Courier | null;
  courierSummary?: CourierCollectionSummary | null;
  companyName: string;
  companyPhone?: string;
  companyAddress?: string;
  companyLogoUrl?: string;
}

export const CourierSettlementReceiptModal: React.FC<CourierSettlementReceiptModalProps> = ({
  isOpen,
  onClose,
  settlement,
  courier,
  courierSummary,
  companyName,
  companyPhone,
  companyAddress,
  companyLogoUrl
}) => {
  const { t, isRTL } = useLanguage();

  if (!settlement && !courierSummary) return null;

  const targetCourier = courier || courierSummary?.courier;
  const isSettlementReceipt = !!settlement;

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = () => {
    if (!targetCourier?.phone) return;
    const cleanPhone = targetCourier.phone.replace(/[^0-9]/g, '');
    const fullPhone = cleanPhone.startsWith('0') ? `2${cleanPhone}` : cleanPhone;

    let message = '';
    if (settlement) {
      message = `*إيصال تسوية تحصيلات نقدية — ${companyName}*
رقم التسوية: #${settlement.settlement_number}
اسم المندوب: ${targetCourier.full_name} (${targetCourier.employee_id})
المبلغ المستحق: ${Number(settlement.expected_amount).toLocaleString()} ج.م
المبلغ المستلم والمُسوى: ${Number(settlement.received_amount).toLocaleString()} ج.م
الرصيد المتبقي بحوزة المندوب: ${Number(settlement.remaining_amount).toLocaleString()} ج.م
المسؤول: ${settlement.settled_by}
التاريخ: ${new Date(settlement.created_at).toLocaleString('ar-EG')}
${settlement.notes ? `ملاحظات: ${settlement.notes}\n` : ''}
شكراً لالتزامكم.`;
    } else if (courierSummary) {
      message = `*كشف مديونية وتحصيلات المندوب — ${companyName}*
المندوب: ${targetCourier.full_name} (${targetCourier.employee_id})
المنطقة: ${targetCourier.area}
إجمالي الشحنات المسلمة: ${courierSummary.delivered_cod_orders_count}
إجمالي مبالغ COD المسلمة: ${courierSummary.total_delivered_cod.toLocaleString()} ج.م
إجمالي المبالغ المسواة سابقاً: ${courierSummary.total_settled_amount.toLocaleString()} ج.م
*الرصيد المعلق حالياً بحوزة المندوب: ${courierSummary.current_outstanding_balance.toLocaleString()} ج.م*

التاريخ: ${new Date().toLocaleDateString('ar-EG')}`;
    }

    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isSettlementReceipt ? 'إيصال تسوية تحصيلات المندوب' : 'كشف مديونية وتحصيلات المندوب'}
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Action Buttons Top Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 print:hidden">
          <span className="text-xs font-semibold text-slate-500">
            {isSettlementReceipt ? `رقم الإيصال: #${settlement?.settlement_number}` : `كشف حساب المندوب: ${targetCourier?.full_name}`}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSendWhatsApp}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>إرسال واتساب</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة الإيصال</span>
            </button>
          </div>
        </div>

        {/* Printable Document Sheet */}
        <div 
          id="courier-settlement-receipt-sheet"
          className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-300 shadow-sm print:border-none print:shadow-none print:p-0 space-y-6 text-xs"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5">
            <div className="flex items-center gap-3">
              {companyLogoUrl ? (
                <img
                  src={companyLogoUrl}
                  alt={companyName}
                  className="w-14 h-14 rounded-xl object-contain border border-slate-200"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center text-xl">
                  {companyName.slice(0, 2)}
                </div>
              )}
              <div>
                <h1 className="text-lg font-black text-slate-900">{companyName}</h1>
                <p className="text-[11px] text-slate-500 font-medium">نظام DELIXA لإدارة الشحن والتوصيل</p>
                {companyPhone && (
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">{companyPhone}</p>
                )}
                {companyAddress && (
                  <p className="text-[11px] text-slate-500 mt-0.5">{companyAddress}</p>
                )}
              </div>
            </div>

            <div className="text-end">
              <div className="inline-block px-3 py-1 bg-slate-100 rounded-lg text-slate-800 font-black text-xs border border-slate-200">
                {isSettlementReceipt ? 'إيصال تسوية نقدية' : 'كشف مديونية مندوب'}
              </div>
              {isSettlementReceipt && settlement && (
                <div className="font-mono font-bold text-blue-700 text-sm mt-1">
                  #{settlement.settlement_number}
                </div>
              )}
              <div className="text-slate-500 text-[10px] mt-1 font-mono">
                {new Date(settlement?.created_at || Date.now()).toLocaleString('ar-EG')}
              </div>
            </div>
          </div>

          {/* Courier Info Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-[11px] font-bold text-slate-500 block mb-1">بيانات المندوب:</span>
              <div className="font-bold text-slate-900 text-sm">{targetCourier?.full_name}</div>
              <div className="text-slate-600 mt-0.5">
                كود الموظف: <span className="font-mono font-bold text-slate-800">{targetCourier?.employee_id}</span>
              </div>
              <div className="text-slate-600 mt-0.5">
                الهاتف: <span className="font-mono">{targetCourier?.phone}</span>
              </div>
            </div>

            <div className="sm:text-end">
              <span className="text-[11px] font-bold text-slate-500 block mb-1">المنطقة والمسؤول:</span>
              <div className="font-bold text-slate-900">{targetCourier?.area}</div>
              {isSettlementReceipt && settlement && (
                <div className="text-slate-600 mt-0.5">
                  المسؤول المستلم: <span className="font-bold text-slate-800">{settlement.settled_by}</span>
                </div>
              )}
              <div className="text-slate-500 text-[11px] mt-0.5">
                تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}
              </div>
            </div>
          </div>

          {/* Settlement Numbers Breakdown */}
          {isSettlementReceipt && settlement ? (
            <div className="space-y-3">
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold pb-2">
                      <th className="text-start py-2">البيان</th>
                      <th className="text-end py-2">المبلغ (ج.م)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-2.5 text-slate-700 font-medium">
                        إجمالي النقدية المستحقة بحوزة المندوب قبل التسوية
                      </td>
                      <td className="py-2.5 text-end font-mono font-semibold text-slate-900">
                        {Number(settlement.expected_amount).toLocaleString()} ج.م
                      </td>
                    </tr>
                    <tr className="bg-emerald-50/60 font-bold">
                      <td className="py-2.5 text-emerald-800">
                        المبلغ المستلم فعلياً من المندوب (المُسوى)
                      </td>
                      <td className="py-2.5 text-end font-mono text-emerald-800 text-sm">
                        +{Number(settlement.received_amount).toLocaleString()} ج.م
                      </td>
                    </tr>
                    <tr className="font-bold">
                      <td className="py-2.5 text-slate-800">
                        الرصيد المتبقي بحوزة المندوب بعد هذه التسوية
                      </td>
                      <td className={`py-2.5 text-end font-mono text-sm ${settlement.remaining_amount > 0 ? 'text-amber-800' : 'text-emerald-700'}`}>
                        {Number(settlement.remaining_amount).toLocaleString()} ج.م
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {settlement.notes && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700">
                  <span className="font-bold text-slate-900 block mb-0.5">ملاحظات:</span>
                  <p>{settlement.notes}</p>
                </div>
              )}
            </div>
          ) : courierSummary ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] font-bold text-slate-500">شحنات COD المسلمة</span>
                  <p className="text-base font-black text-slate-900 mt-0.5">{courierSummary.delivered_cod_orders_count}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] font-bold text-slate-500">إجمالي المحصل</span>
                  <p className="text-base font-black text-slate-900 mt-0.5">{courierSummary.total_delivered_cod.toLocaleString()} ج.م</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                  <span className="text-[10px] font-bold text-emerald-700">المسوى سابقاً</span>
                  <p className="text-base font-black text-emerald-800 mt-0.5">{courierSummary.total_settled_amount.toLocaleString()} ج.م</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center">
                  <span className="text-[10px] font-bold text-amber-800">المعلق حالياً</span>
                  <p className="text-base font-black text-amber-900 mt-0.5">{courierSummary.current_outstanding_balance.toLocaleString()} ج.م</p>
                </div>
              </div>

              {/* Orders preview */}
              {courierSummary.delivered_cod_orders.length > 0 && (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-100 px-3 py-2 font-bold text-slate-700 text-xs">
                    بيان الشحنات المسلمة بمبالغ دفع عند الاستلام ({courierSummary.delivered_cod_orders.length})
                  </div>
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                      <tr>
                        <th className="p-2 text-start">رقم الشحنة</th>
                        <th className="p-2 text-start">العميل</th>
                        <th className="p-2 text-start">تاريخ التسليم</th>
                        <th className="p-2 text-end">مبلغ التحصيل (COD)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {courierSummary.delivered_cod_orders.map(order => (
                        <tr key={order.id}>
                          <td className="p-2 font-mono font-bold text-blue-700">#{order.order_number}</td>
                          <td className="p-2 text-slate-800">{order.customer_name}</td>
                          <td className="p-2 text-slate-500 font-mono">{order.delivery_date || order.created_at.split('T')[0]}</td>
                          <td className="p-2 text-end font-mono font-bold text-slate-900">{Number(order.cod_amount).toLocaleString()} ج.م</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-200 mt-6">
            <div className="text-center">
              <span className="block font-bold text-slate-700 mb-10">توقيع المندوب المستلم / المسلّم</span>
              <div className="border-t border-slate-400 mx-auto w-40 pt-1 text-slate-500 text-[10px]">
                {targetCourier?.full_name}
              </div>
            </div>

            <div className="text-center">
              <span className="block font-bold text-slate-700 mb-10">توقيع مسؤول الخزينة / الحسابات</span>
              <div className="border-t border-slate-400 mx-auto w-40 pt-1 text-slate-500 text-[10px]">
                {settlement?.settled_by || 'مسؤول الحسابات'}
              </div>
            </div>
          </div>

          {/* Security & Authenticity Stamp */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 pt-3">
            <div className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>مستند رسمي صادر عبر نظام DELIXA لإدارة الشحن</span>
            </div>
            <span className="font-mono">VERIFIED SYSTEM DOCUMENT</span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </Modal>
  );
};
