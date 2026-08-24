import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/db';
import { 
  Merchant, 
  MerchantFinancialSummary, 
  MerchantTransaction, 
  MerchantSettlement 
} from '../../types';
import { Modal } from '../common/Modal';
import { 
  Building2, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CreditCard, 
  History, 
  Printer, 
  Send, 
  Mail, 
  Plus, 
  CheckCircle2, 
  AlertTriangle,
  Calendar,
  FileText,
  Clock,
  RotateCcw,
  Package,
  TrendingUp,
  ShieldCheck
} from 'lucide-react';

interface MerchantLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  merchant: Merchant | null;
  companyId: string;
  companyName: string;
  companyPhone?: string;
  companyAddress?: string;
  companyLogoUrl?: string;
  onUpdate?: () => void;
}

export const MerchantLedgerModal: React.FC<MerchantLedgerModalProps> = ({
  isOpen,
  onClose,
  merchant,
  companyId,
  companyName,
  companyPhone,
  companyAddress,
  companyLogoUrl,
  onUpdate
}) => {
  const { t, isRTL } = useLanguage();
  const { showToast } = useToast();
  const { session } = useAuth();

  const [activeTab, setActiveTab] = useState<'summary' | 'transactions' | 'settlements' | 'statement'>('summary');
  const [summary, setSummary] = useState<MerchantFinancialSummary | null>(null);
  const [transactions, setTransactions] = useState<MerchantTransaction[]>([]);
  const [settlements, setSettlements] = useState<MerchantSettlement[]>([]);
  
  // Modals for Actions
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);

  // Settlement Form
  const [settlementAmount, setSettlementAmount] = useState<number | string>('');
  const [settlementType, setSettlementType] = useState<'payout_to_merchant' | 'collection_from_merchant'>('payout_to_merchant');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'vodafone_cash' | 'instapay' | 'cheque'>('cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [settlementNotes, setSettlementNotes] = useState('');

  // Adjustment Form
  const [adjustmentAmount, setAdjustmentAmount] = useState<number | string>('');
  const [adjustmentType, setAdjustmentType] = useState<'credit' | 'debit'>('credit');
  const [adjustmentCategory, setAdjustmentCategory] = useState<'bonus' | 'penalty' | 'correction' | 'fee' | 'other'>('bonus');
  const [adjustmentDescription, setAdjustmentDescription] = useState('');

  const loadLedgerData = async () => {
    if (!merchant || !companyId) return;
    const [sum, txs, sets] = await Promise.all([
      db.getMerchantFinancialSummary(companyId, merchant.id),
      db.getMerchantTransactions(companyId, merchant.id),
      db.getMerchantSettlements(companyId, merchant.id),
    ]);
    
    setSummary(sum);
    setTransactions(txs);
    setSettlements(sets);
    if (sum) {
      if (sum.net_balance > 0) {
        setSettlementType('payout_to_merchant');
        setSettlementAmount(sum.net_balance);
      } else if (sum.net_balance < 0) {
        setSettlementType('collection_from_merchant');
        setSettlementAmount(Math.abs(sum.net_balance));
      } else {
        setSettlementAmount('');
      }
    }
  };

  useEffect(() => {
    if (isOpen && merchant) {
      loadLedgerData();
    }
  }, [isOpen, merchant, companyId]);

  if (!merchant) return null;

  const handleCreateSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(settlementAmount);
    if (!amount || amount <= 0) {
      showToast('warning', 'يرجى إدخال مبلغ تسوية صالح أكبر من صفر');
      return;
    }

    try {
      await db.createMerchantSettlement(companyId, {
        merchant_id: merchant.id,
        amount,
        settlementType: settlementType as any,
        payment_method: paymentMethod,
        reference_number: referenceNumber.trim() || undefined,
        notes: settlementNotes.trim() || undefined,
        settled_by: session?.profile.full_name || 'Admin',
      });

      showToast(
        'success',
        'تم تسجيل التسوية المالية بنجاح',
        `المبلغ: ${amount.toLocaleString()} ج.م | التاجر: ${merchant.store_name}`
      );

      setIsSettlementModalOpen(false);
      setSettlementNotes('');
      setReferenceNumber('');
      loadLedgerData();
      onUpdate?.();
    } catch (err: any) {
      showToast('error', 'خطأ في حفظ التسوية', err.message);
    }
  };

  const handleCreateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(adjustmentAmount);
    if (!amount || amount <= 0) {
      showToast('warning', 'يرجى إدخال مبلغ صالح أكبر من صفر');
      return;
    }
    if (!adjustmentDescription.trim()) {
      showToast('warning', 'يرجى كتابة سبب أو وصف القيد اليدوي');
      return;
    }

    try {
      await db.addMerchantTransaction(companyId, {
        merchant_id: merchant.id,
        direction: adjustmentType,
        transaction_type: adjustmentType === 'credit' ? 'CREDIT_TO_MERCHANT' : 'DEBIT_FROM_MERCHANT',
        reference_type: 'manual',
        amount,
        description: `قيد يدوي (${adjustmentCategory}): ${adjustmentDescription.trim()}`,
        created_by: session?.profile.full_name || 'Admin',
      });

      showToast(
        'success',
        'تم إضافة القيد المالي للحساب',
        `${adjustmentType === 'credit' ? 'إيداع / استحقاق' : 'خصم / مديونية'}: ${amount.toLocaleString()} ج.م`
      );

      setIsAdjustmentModalOpen(false);
      setAdjustmentAmount('');
      setAdjustmentDescription('');
      loadLedgerData();
      onUpdate?.();
    } catch (err: any) {
      showToast('error', 'خطأ في إضافة القيد', err.message);
    }
  };

  const handlePrintStatement = () => {
    window.print();
  };

  const handleSendWhatsApp = () => {
    const phone = merchant.whatsapp || merchant.phone;
    if (!phone || !summary) return;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const fullPhone = cleanPhone.startsWith('0') ? `2${cleanPhone}` : cleanPhone;

    const message = `*كشف الحساب المالي — ${companyName}*
التاجر: ${merchant.store_name}
التاريخ: ${new Date().toLocaleDateString('ar-EG')}
--------------------------------
إجمالي مستحقات الشحنات المسلمة: ${summary.total_cod_earned.toLocaleString()} ج.م
إجمالي مديونيات المرتجعات والرسوم: ${summary.total_returns_debited.toLocaleString()} ج.م
إجمالي التسويات المدفوعة: ${summary.total_settled_paid.toLocaleString()} ج.م
--------------------------------
*الرصيد الصافي الحالي:* ${summary.net_balance.toLocaleString()} ج.م (${summary.net_balance >= 0 ? 'مستحق للمتجر' : 'مديونية على المتجر'})

شاكرين حسن تعاونكم معنا.`;

    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleSendEmail = () => {
    if (!merchant.email || !summary) return;
    const subject = `كشف حساب مالي - ${merchant.store_name} - ${companyName}`;
    const body = `كشف الحساب المالي
التاجر: ${merchant.store_name}
إجمالي المستحقات: ${summary.total_cod_earned.toLocaleString()} ج.م
إجمالي المديونيات: ${summary.total_returns_debited.toLocaleString()} ج.م
إجمالي المسدد: ${summary.total_settled_paid.toLocaleString()} ج.م
الرصيد الصافي: ${summary.net_balance.toLocaleString()} ج.م`;

    window.open(`mailto:${merchant.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`دفتر الحسابات والتسويات المالية — ${merchant.store_name}`}
      subtitle={`الحساب المالي للتاجر • كود: ${merchant.id.slice(0, 8)}`}
      maxWidth="max-w-5xl"
    >
      <div className="space-y-6">

        {/* Top Header Card with Net Balance Banner */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* 1. Due to Merchant */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-200">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-800 mb-1">
                <span className="flex items-center gap-1.5">
                  <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                  مستحق للتاجر (COD المسلم)
                </span>
              </div>
              <div className="text-2xl font-black font-mono text-emerald-700 mt-1">
                {summary.total_cod_earned.toLocaleString()} <span className="text-xs font-normal">{t.currency}</span>
              </div>
              <p className="text-[10px] text-emerald-600 mt-1">
                من إجمالي {summary.total_delivered_orders} شحنة مسلمة
              </p>
            </div>

            {/* 2. Debited from Merchant */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-50 to-amber-50/50 border border-rose-200">
              <div className="flex items-center justify-between text-xs font-bold text-rose-800 mb-1">
                <span className="flex items-center gap-1.5">
                  <ArrowUpRight className="w-4 h-4 text-rose-600" />
                  مديونيات على التاجر (مرتجعات)
                </span>
              </div>
              <div className="text-2xl font-black font-mono text-rose-700 mt-1">
                {summary.total_returns_debited.toLocaleString()} <span className="text-xs font-normal">{t.currency}</span>
              </div>
              <p className="text-[10px] text-rose-600 mt-1">
                تكاليف شحن مرتجعات وخصومات
              </p>
            </div>

            {/* 3. Net Financial Position */}
            <div className={`p-4 rounded-2xl border ${
              summary.net_balance >= 0 
                ? 'bg-slate-900 text-white border-slate-800' 
                : 'bg-rose-950 text-white border-rose-900'
            }`}>
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-1">
                <span className="flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-blue-400" />
                  صافي الموقف المالي (Net Balance)
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  summary.net_balance >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                }`}>
                  {summary.net_balance >= 0 ? 'مستحق للمتجر' : 'مديونية عليه'}
                </span>
              </div>
              <div className={`text-2xl font-black font-mono mt-1 ${
                summary.net_balance >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {summary.net_balance.toLocaleString()} <span className="text-xs font-normal text-slate-300">{t.currency}</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                تم تسوية وصرف: {summary.total_settled_paid.toLocaleString()} {t.currency}
              </p>
            </div>

          </div>
        )}

        {/* Action Controls & Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          
          {/* Tab Navigation */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'summary' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الملخص والعمليات
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'transactions' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>سجل الحركات</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px]">{transactions.length}</span>
            </button>
            <button
              onClick={() => setActiveTab('settlements')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'settlements' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>التسويات المسددة</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px]">{settlements.length}</span>
            </button>
            <button
              onClick={() => setActiveTab('statement')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'statement' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>كشف الحساب المعتمد</span>
            </button>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAdjustmentModalOpen(true)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة قيد يدوي</span>
            </button>

            <button
              onClick={() => setIsSettlementModalOpen(true)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>تسجيل تسوية مالية</span>
            </button>
          </div>

        </div>

        {/* TAB 1: SUMMARY & QUICK OVERVIEW */}
        {activeTab === 'summary' && summary && (
          <div className="space-y-6 text-xs">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Merchant Details Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 pb-2 border-b border-slate-200">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span>بيانات التاجر والتواصل المالي</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">المتجر / البراند:</span>
                    <span className="font-bold text-slate-900">{merchant.store_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">المسؤول:</span>
                    <span className="font-bold text-slate-800">{merchant.owner_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">الهاتف:</span>
                    <span className="font-bold text-slate-800 font-mono" dir="ltr">{merchant.phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">واتساب:</span>
                    <span className="font-bold text-emerald-700 font-mono" dir="ltr">{merchant.whatsapp || merchant.phone}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block">العنوان:</span>
                    <span className="text-slate-700">{merchant.address}</span>
                  </div>
                </div>
              </div>

              {/* Settlement Progress & Settlement Stats */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 pb-2 border-b border-slate-200">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>مؤشرات التسويات والسيولة</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                    <span className="text-slate-500 block">إجمالي التسويات المصروفة:</span>
                    <span className="font-bold font-mono text-slate-900 text-sm">{summary.total_settled_paid.toLocaleString()} {t.currency}</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                    <span className="text-slate-500 block">عدد حركات التسوية:</span>
                    <span className="font-bold font-mono text-slate-900 text-sm">{settlements.length}</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                    <span className="text-slate-500 block">إجمالي الشحنات:</span>
                    <span className="font-bold font-mono text-slate-900 text-sm">{summary.total_orders}</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                    <span className="text-slate-500 block">حركات المرتجعات:</span>
                    <span className="font-bold font-mono text-rose-700 text-sm">{summary.total_returns_debited > 0 ? `-${summary.total_returns_debited.toLocaleString()}` : '0'} {t.currency}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Recent 5 Transactions Snapshot */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-blue-600" />
                  <span>أحدث الحركات المالية المسجلة</span>
                </h4>
                <button
                  onClick={() => setActiveTab('transactions')}
                  className="text-xs text-blue-600 hover:underline font-bold"
                >
                  عرض كافة الحركات ({transactions.length})
                </button>
              </div>

              {transactions.length === 0 ? (
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center text-slate-500">
                  لا توجد حركات مالية مسجلة بعد لهذا التاجر.
                </div>
              ) : (
                <div className="overflow-hidden border border-slate-200 rounded-2xl">
                  <table className="w-full text-start text-xs">
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold">
                      <tr>
                        <th className="py-2.5 px-3 text-start">التاريخ</th>
                        <th className="py-2.5 px-3 text-start">نوع الحركة</th>
                        <th className="py-2.5 px-3 text-start">الوصف والبيان</th>
                        <th className="py-2.5 px-3 text-end">القيمة</th>
                        <th className="py-2.5 px-3 text-end">الرصيد التراكمي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transactions.slice(0, 5).map(tx => (
                        <tr key={tx.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                            {new Date(tx.created_at).toLocaleDateString('ar-EG')}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                              tx.type === 'credit' 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : 'bg-rose-100 text-rose-800'
                            }`}>
                              {tx.type === 'credit' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                              {tx.type === 'credit' ? 'استحقاق / إضافة' : 'خصم / مديونية'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-800 max-w-xs truncate">
                            {tx.description}
                          </td>
                          <td className="py-2.5 px-3 text-end font-mono font-bold">
                            <span className={tx.type === 'credit' ? 'text-emerald-700' : 'text-rose-700'}>
                              {tx.type === 'credit' ? '+' : '-'}{Number(tx.amount).toLocaleString()} {t.currency}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-end font-mono font-bold text-slate-900">
                            {Number(tx.running_balance).toLocaleString()} {t.currency}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 2: FULL TRANSACTIONS LIST */}
        {activeTab === 'transactions' && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700">إجمالي الحركات: {transactions.length}</span>
              <span className="text-[11px] text-slate-500">جميع قيود الحسابات غير قابلة للحذف لضمان الدقة المحاسبية</span>
            </div>

            {transactions.length === 0 ? (
              <div className="p-8 bg-slate-50 border border-slate-200 rounded-2xl text-center text-slate-500">
                لا توجد حركات مالية مسجلة بعد.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl max-h-96 overflow-y-auto">
                <table className="w-full text-start text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3 text-start">التاريخ والوقت</th>
                      <th className="py-2.5 px-3 text-start">النوع</th>
                      <th className="py-2.5 px-3 text-start">التصنيف</th>
                      <th className="py-2.5 px-3 text-start">البيان والتفاصيل</th>
                      <th className="py-2.5 px-3 text-start">بواسطة</th>
                      <th className="py-2.5 px-3 text-end">القيمة</th>
                      <th className="py-2.5 px-3 text-end">الرصيد بعد الحركة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {new Date(tx.created_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            tx.type === 'credit' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {tx.type === 'credit' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                            {tx.type === 'credit' ? 'إيداع (+)' : 'خصم (-)'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-600 whitespace-nowrap">
                          {tx.category === 'order_cod' && 'تحصيل شحنة'}
                          {tx.category === 'return_fee' && 'تكلفة مرتجع'}
                          {tx.category === 'settlement' && 'تسوية وصرف'}
                          {tx.category === 'manual_adjustment' && 'تعديل يدوي'}
                          {tx.category === 'bonus' && 'مكافأة / بونص'}
                          {tx.category === 'penalty' && 'غرامة'}
                          {tx.category === 'shipping_fee' && 'أجرة شحن'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-800">
                          {tx.description}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-500 whitespace-nowrap">
                          {tx.created_by}
                        </td>
                        <td className="py-2.5 px-3 text-end font-mono font-bold whitespace-nowrap">
                          <span className={tx.type === 'credit' ? 'text-emerald-700' : 'text-rose-700'}>
                            {tx.type === 'credit' ? '+' : '-'}{Number(tx.amount).toLocaleString()} {t.currency}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-end font-mono font-bold text-slate-900 whitespace-nowrap">
                          {Number(tx.running_balance).toLocaleString()} {t.currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SETTLEMENTS LIST */}
        {activeTab === 'settlements' && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700">سجل التسويات المصروفة والمحصلة ({settlements.length})</span>
              <button
                onClick={() => setIsSettlementModalOpen(true)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>تسجيل تسوية جديدة</span>
              </button>
            </div>

            {settlements.length === 0 ? (
              <div className="p-8 bg-slate-50 border border-slate-200 rounded-2xl text-center text-slate-500">
                لا توجد تسويات مالية مسجلة بعد لهذا التاجر.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-start text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold">
                    <tr>
                      <th className="py-2.5 px-3 text-start">رقم التسوية</th>
                      <th className="py-2.5 px-3 text-start">التاريخ</th>
                      <th className="py-2.5 px-3 text-start">نوع العملية</th>
                      <th className="py-2.5 px-3 text-start">طريقة الدفع</th>
                      <th className="py-2.5 px-3 text-start">رقم المرجع / الإيصال</th>
                      <th className="py-2.5 px-3 text-start">المسؤول</th>
                      <th className="py-2.5 px-3 text-end">المبلغ المسدد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {settlements.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                          {s.settlement_number}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                          {new Date(s.settlement_date).toLocaleDateString('ar-EG')}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.type === 'payout_to_merchant' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {s.type === 'payout_to_merchant' ? 'صرف مستحقات للتاجر' : 'تحصيل مديونية من التاجر'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {s.payment_method === 'cash' && 'نقداً (كاش)'}
                          {s.payment_method === 'bank_transfer' && 'تحويل بنكي'}
                          {s.payment_method === 'vodafone_cash' && 'فودافون كاش'}
                          {s.payment_method === 'instapay' && 'إنستاباي (InstaPay)'}
                          {s.payment_method === 'cheque' && 'شيك بنكي'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                          {s.reference_number || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-500">
                          {s.created_by}
                        </td>
                        <td className="py-2.5 px-3 text-end font-mono font-black text-slate-900">
                          {Number(s.amount).toLocaleString()} {t.currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: OFFICIAL FINANCIAL STATEMENT (PRINTABLE & SHAREABLE) */}
        {activeTab === 'statement' && summary && (
          <div className="space-y-4 text-xs">
            
            {/* Share & Print Bar */}
            <div className="flex flex-wrap items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl gap-3 print:hidden">
              <div className="flex items-center gap-2 text-slate-600">
                <Printer className="w-4 h-4 text-blue-600" />
                <span>كشف حساب مالي تفصيلي ورسمي معتمد للتاجر</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSendWhatsApp}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-1.5 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>واتساب</span>
                </button>

                {merchant.email && (
                  <button
                    onClick={handleSendEmail}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-lg flex items-center gap-1.5 transition-all"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>إيميل</span>
                  </button>
                )}

                <button
                  onClick={handlePrintStatement}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center gap-2 transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة كشف الحساب</span>
                </button>
              </div>
            </div>

            {/* Printable Document Container */}
            <div id="printable-merchant-statement" className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0">
              
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
                <div className="flex items-center gap-3">
                  {companyLogoUrl ? (
                    <img
                      src={companyLogoUrl}
                      alt={companyName}
                      className="w-12 h-12 rounded-xl object-contain border border-slate-200 bg-white p-1"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
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

                <div className="text-start sm:text-end">
                  <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                    كشف حساب تاجر معتمد
                  </div>
                  <div className="text-base font-black text-slate-900 mt-0.5">
                    {merchant.store_name}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1.5 justify-start sm:justify-end mt-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>تاريخ الإصدار: {new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                </div>
              </div>

              {/* Merchant Account Overview Box */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-5 border-b border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block">اسم التاجر:</span>
                  <span className="font-bold text-slate-900">{merchant.owner_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">رقم الهاتف:</span>
                  <span className="font-bold text-slate-900 font-mono" dir="ltr">{merchant.phone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">إجمالي الشحنات:</span>
                  <span className="font-bold text-slate-900 font-mono">{summary.total_orders}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">حالة الحساب:</span>
                  <span className="font-bold text-emerald-700">نشط ومعتمد</span>
                </div>
              </div>

              {/* Financial Balance Summary Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-5">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <span className="text-[11px] text-slate-500 block">إجمالي المستحقات (COD المسلم)</span>
                  <span className="text-base font-black font-mono text-slate-900">{summary.total_cod_earned.toLocaleString()} {t.currency}</span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <span className="text-[11px] text-slate-500 block">إجمالي الخصومات والتسويات</span>
                  <span className="text-base font-black font-mono text-slate-900">{(summary.total_returns_debited + summary.total_settled_paid).toLocaleString()} {t.currency}</span>
                </div>

                <div className="p-3 bg-slate-900 text-white rounded-xl text-center">
                  <span className="text-[11px] text-slate-300 block">الرصيد الصافي المتبقي</span>
                  <span className="text-base font-black font-mono text-emerald-400">{summary.net_balance.toLocaleString()} {t.currency}</span>
                </div>
              </div>

              {/* Transactions Table for Statement */}
              <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-start text-[11px]">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                    <tr>
                      <th className="p-2 text-start">التاريخ</th>
                      <th className="p-2 text-start">البيان / الحركة</th>
                      <th className="p-2 text-end">مدين (-)</th>
                      <th className="p-2 text-end">دائن (+)</th>
                      <th className="p-2 text-end">الرصيد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map(tx => (
                      <tr key={tx.id}>
                        <td className="p-2 font-mono text-slate-500">
                          {new Date(tx.created_at).toLocaleDateString('ar-EG')}
                        </td>
                        <td className="p-2 text-slate-800">
                          {tx.description}
                        </td>
                        <td className="p-2 text-end font-mono text-rose-700 font-bold">
                          {tx.type === 'debit' ? Number(tx.amount).toLocaleString() : '—'}
                        </td>
                        <td className="p-2 text-end font-mono text-emerald-700 font-bold">
                          {tx.type === 'credit' ? Number(tx.amount).toLocaleString() : '—'}
                        </td>
                        <td className="p-2 text-end font-mono font-bold text-slate-900">
                          {Number(tx.running_balance).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Signatures */}
              <div className="pt-8 mt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs">
                <div>
                  <div className="font-bold text-slate-700 mb-10">ختم وتوقيع إدارة الحسابات</div>
                  <div className="border-t border-slate-300 pt-1 text-[11px] text-slate-400">{companyName}</div>
                </div>
                <div>
                  <div className="font-bold text-slate-700 mb-10">توقيع واستلام التاجر / المتجر</div>
                  <div className="border-t border-slate-300 pt-1 text-[11px] text-slate-400">{merchant.owner_name}</div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-8 text-center text-[10px] text-slate-400 border-t border-slate-100 pt-3">
                تم إصدار هذا الكشف المالي إلكترونياً عبر منظومة {companyName || 'Delixa'} للشحن واللوجستيات • {new Date().toISOString()}
              </div>

            </div>
          </div>
        )}

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

      {/* CREATE SETTLEMENT MODAL */}
      <Modal
        isOpen={isSettlementModalOpen}
        onClose={() => setIsSettlementModalOpen(false)}
        title="تسجيل تسوية مالية للتاجر"
        subtitle={`صرف مستحقات أو تحصيل مديونية — ${merchant.store_name}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateSettlement} className="space-y-4 text-xs">
          
          <div>
            <label className="block font-bold text-slate-700 mb-1">نوع التسوية المالية *</label>
            <select
              value={settlementType}
              onChange={e => setSettlementType(e.target.value as any)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
            >
              <option value="payout_to_merchant">صرف مستحقات للتاجر (Payout To Merchant)</option>
              <option value="collection_from_merchant">تحصيل مديونية من التاجر (Collection From Merchant)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">مبلغ التسوية ({t.currency}) *</label>
            <input
              type="number"
              min="0.5"
              step="0.5"
              required
              value={settlementAmount}
              onChange={e => setSettlementAmount(e.target.value)}
              placeholder="0.00"
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-base focus:ring-2 focus:ring-blue-600 text-slate-900"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">طريقة الدفع / التحويل *</label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value as any)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
            >
              <option value="cash">نقداً (كاش / خزينة)</option>
              <option value="instapay">إنستاباي (InstaPay)</option>
              <option value="vodafone_cash">فودافون كاش / محفظة إلكترونية</option>
              <option value="bank_transfer">تحويل بنكي</option>
              <option value="cheque">شيك بنكي</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">رقم المرجع / رقم التحويل / الإيصال</label>
            <input
              type="text"
              value={referenceNumber}
              onChange={e => setReferenceNumber(e.target.value)}
              placeholder="مثال: TXN-89382 أو رقم إيصال الخزينة"
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">ملاحظات التسوية</label>
            <textarea
              rows={2}
              value={settlementNotes}
              onChange={e => setSettlementNotes(e.target.value)}
              placeholder="أي تفاصيل أو شروط خاصة بالتسوية..."
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsSettlementModalOpen(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm cursor-pointer"
            >
              تأكيد وتسجيل التسوية
            </button>
          </div>

        </form>
      </Modal>

      {/* MANUAL ADJUSTMENT MODAL */}
      <Modal
        isOpen={isAdjustmentModalOpen}
        onClose={() => setIsAdjustmentModalOpen(false)}
        title="إضافة قيد مالي يدوي"
        subtitle={`تسجيل تسوية يدوية، مكافأة أو خصم — ${merchant.store_name}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateAdjustment} className="space-y-4 text-xs">
          
          <div>
            <label className="block font-bold text-slate-700 mb-1">نوع التأثير المالي *</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAdjustmentType('credit')}
                className={`p-2.5 rounded-xl border text-center font-bold transition-all ${
                  adjustmentType === 'credit'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                + إضافة / استحقاق للتاجر
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType('debit')}
                className={`p-2.5 rounded-xl border text-center font-bold transition-all ${
                  adjustmentType === 'debit'
                    ? 'border-rose-600 bg-rose-50 text-rose-800 ring-2 ring-rose-500/20'
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                - خصم / مديونية على التاجر
              </button>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">تصنيف القيد *</label>
            <select
              value={adjustmentCategory}
              onChange={e => setAdjustmentCategory(e.target.value as any)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
            >
              <option value="bonus">مكافأة / بونص ترويجي</option>
              <option value="penalty">غرامة تأخير أو تلفيات</option>
              <option value="fee">رسوم خدمات إضافية / تغليف</option>
              <option value="correction">تصحيح حسابي / تسوية فروق</option>
              <option value="other">أخرى</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">المبلغ ({t.currency}) *</label>
            <input
              type="number"
              min="0.5"
              step="0.5"
              required
              value={adjustmentAmount}
              onChange={e => setAdjustmentAmount(e.target.value)}
              placeholder="0.00"
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-base focus:ring-2 focus:ring-blue-600 text-slate-900"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">البيان والسبب التفصيلي *</label>
            <textarea
              rows={2}
              required
              value={adjustmentDescription}
              onChange={e => setAdjustmentDescription(e.target.value)}
              placeholder="اكتب سبب القيد المالي بوضوح..."
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAdjustmentModalOpen(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm cursor-pointer"
            >
              حفظ القيد المالي
            </button>
          </div>

        </form>
      </Modal>

    </Modal>
  );
};
