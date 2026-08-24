import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../lib/db';
import { 
  CourierCollectionSummary, 
  CourierSettlement, 
  Order, 
  Courier 
} from '../../types';
import { Modal } from '../../components/common/Modal';
import { CourierSettlementReceiptModal } from '../../components/collections/CourierSettlementReceiptModal';
import { 
  Banknote, 
  Coins, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  User, 
  Truck, 
  ArrowUpRight, 
  FileText, 
  Receipt, 
  History, 
  AlertCircle, 
  ArrowDownRight,
  TrendingUp,
  CreditCard,
  RefreshCw,
  Phone,
  MapPin,
  ChevronRight,
  ChevronLeft,
  Eye,
  Check,
  Printer
} from 'lucide-react';

interface CollectionsPageProps {
  navigate?: (path: string) => void;
}

export const CollectionsPage: React.FC<CollectionsPageProps> = ({ navigate }) => {
  const { session } = useAuth();
  const { t, isRTL } = useLanguage();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'balances' | 'history'>('balances');
  const [summaries, setSummaries] = useState<CourierCollectionSummary[]>([]);
  const [settlements, setSettlements] = useState<CourierSettlement[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debtFilter, setDebtFilter] = useState<'all' | 'with_debt' | 'zero_debt'>('all');
  const [courierFilter, setCourierFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Settle Modal State
  const [selectedCourierSummary, setSelectedCourierSummary] = useState<CourierCollectionSummary | null>(null);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [receivedAmountInput, setReceivedAmountInput] = useState<string>('');
  const [settlementNotes, setSettlementNotes] = useState<string>('');
  const [settlementError, setSettlementError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Courier Details Modal State
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [detailCourierSummary, setDetailCourierSummary] = useState<CourierCollectionSummary | null>(null);
  const [detailTab, setDetailTab] = useState<'orders' | 'settlements'>('orders');

  // Receipt / Statement Print Modal State
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptSettlement, setReceiptSettlement] = useState<CourierSettlement | null>(null);
  const [receiptCourier, setReceiptCourier] = useState<Courier | null>(null);
  const [receiptSummary, setReceiptSummary] = useState<CourierCollectionSummary | null>(null);

  const handleOpenReceiptForSettlement = (settlementItem: CourierSettlement) => {
    const courier = summaries.find(sm => sm.courier_id === settlementItem.courier_id)?.courier || null;
    setReceiptSettlement(settlementItem);
    setReceiptCourier(courier);
    setReceiptSummary(null);
    setIsReceiptModalOpen(true);
  };

  const handleOpenStatementForCourier = (summaryItem: CourierCollectionSummary) => {
    setReceiptSettlement(null);
    setReceiptCourier(summaryItem.courier);
    setReceiptSummary(summaryItem);
    setIsReceiptModalOpen(true);
  };

  const loadData = async () => {
    if (!session) return;
    const companyId = session.company.id;
    const [allSummaries, allSettlements] = await Promise.all([
      db.getAllCouriersCollections(companyId),
      db.getSettlements(companyId),
    ]);
    setSummaries(allSummaries);
    setSettlements(allSettlements);

    // If detail modal is open, refresh detail courier summary
    if (detailCourierSummary) {
      const refreshed = await db.getCourierCollectionSummary(companyId, detailCourierSummary.courier_id);
      setDetailCourierSummary(refreshed);
    }
  };

  useEffect(() => {
    loadData();

    // Listen to real-time order/settlement sync
    const handleSync = () => loadData();
    window.addEventListener('delixa-realtime-order-sync', handleSync);
    return () => window.removeEventListener('delixa-realtime-order-sync', handleSync);
  }, [session]);

  // Calculations for KPI Cards
  const totalOutstanding = summaries.reduce((sum, c) => sum + c.current_outstanding_balance, 0);
  const couriersWithDebtCount = summaries.filter(c => c.current_outstanding_balance > 0).length;
  const totalDeliveredCod = summaries.reduce((sum, c) => sum + c.total_delivered_cod, 0);
  const totalSettledAmount = settlements.reduce((sum, s) => sum + (Number(s.received_amount) || 0), 0);

  // Filtered Couriers for Tab 1
  const filteredSummaries = summaries.filter(item => {
    const nameMatch = item.courier.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      item.courier.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      item.courier.phone.includes(searchTerm) ||
                      item.courier.area.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!nameMatch) return false;

    if (debtFilter === 'with_debt') {
      return item.current_outstanding_balance > 0;
    }
    if (debtFilter === 'zero_debt') {
      return item.current_outstanding_balance === 0;
    }
    return true;
  });

  // Filtered Settlements for Tab 2
  const filteredSettlements = settlements.filter(s => {
    const courier = summaries.find(sm => sm.courier_id === s.courier_id)?.courier;
    const courierName = courier?.full_name.toLowerCase() || '';
    const empId = courier?.employee_id.toLowerCase() || '';
    const setNum = s.settlement_number.toLowerCase();
    const settledBy = s.settled_by.toLowerCase();

    const matchesSearch = courierName.includes(searchTerm.toLowerCase()) ||
                          empId.includes(searchTerm.toLowerCase()) ||
                          setNum.includes(searchTerm.toLowerCase()) ||
                          settledBy.includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (courierFilter !== 'all' && s.courier_id !== courierFilter) {
      return false;
    }

    if (dateFrom) {
      const fromTime = new Date(dateFrom).getTime();
      if (new Date(s.created_at).getTime() < fromTime) return false;
    }
    if (dateTo) {
      const toTime = new Date(dateTo).setHours(23, 59, 59, 999);
      if (new Date(s.created_at).getTime() > toTime) return false;
    }

    return true;
  });

  // Open Settle Modal
  const handleOpenSettleModal = (summary: CourierCollectionSummary, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedCourierSummary(summary);
    setReceivedAmountInput(String(summary.current_outstanding_balance));
    setSettlementNotes('');
    setSettlementError(null);
    setIsSettleModalOpen(true);
  };

  // Open Details Modal
  const handleOpenDetails = (summary: CourierCollectionSummary) => {
    setDetailCourierSummary(summary);
    setDetailTab('orders');
    setIsDetailsModalOpen(true);
  };

  // Form Validations
  const parsedReceivedAmount = Number(receivedAmountInput);
  const currentExpected = selectedCourierSummary?.current_outstanding_balance || 0;
  const isFullSettlement = !isNaN(parsedReceivedAmount) && parsedReceivedAmount === currentExpected && currentExpected > 0;
  const calculatedRemaining = !isNaN(parsedReceivedAmount) && parsedReceivedAmount > 0 && parsedReceivedAmount <= currentExpected 
    ? Math.max(0, Math.round((currentExpected - parsedReceivedAmount) * 100) / 100)
    : currentExpected;

  const handleConfirmSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !selectedCourierSummary) return;

    setSettlementError(null);

    const amount = Number(receivedAmountInput);
    if (isNaN(amount) || amount <= 0) {
      setSettlementError(t.invalidAmountError || 'يرجى إدخال مبلغ صحيح أكبر من الصفر.');
      return;
    }

    if (amount > selectedCourierSummary.current_outstanding_balance) {
      setSettlementError(t.overpaymentError || 'المبلغ المستلم لا يمكن أن يتجاوز إجمالي التحصيلات المعلقة.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newSettlement = await db.createSettlement(session.company.id, {
        courier_id: selectedCourierSummary.courier_id,
        received_amount: amount,
        settled_by: session.profile.full_name || 'مدير النظام',
        notes: settlementNotes.trim() || undefined,
      });

      showToast('success', t.settlementSuccessToast || 'تم تسجيل تسوية التحصيلات بنجاح وتحديث أرصدة المندوب.');
      setIsSettleModalOpen(false);
      loadData();

      // Open receipt modal immediately for printing/sharing
      if (newSettlement) {
        setReceiptSettlement(newSettlement);
        setReceiptCourier(selectedCourierSummary.courier);
        setReceiptSummary(null);
        setIsReceiptModalOpen(true);
      }
    } catch (err: any) {
      setSettlementError(err.message || 'حدث خطأ أثناء حفظ التسوية');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl border border-blue-100">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                {t.collectionsTitle || 'إدارة تحصيلات المناديب والتسويات النقدية'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {t.collectionsSubtitle || 'متابعة وتدقيق مبالغ الدفع عند الاستلام (COD) المحصلة بواسطة المناديب وتسويتها'}
              </p>
            </div>
          </div>
        </div>

        {/* Action / Refresh */}
        <div className="flex items-center gap-2">
          <button
            id="refresh-collections-btn"
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>تحديث البيانات</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Outstanding Collections */}
        <div 
          id="kpi-outstanding-collections"
          className="bg-white p-5 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/40 via-white to-amber-50/10 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900/80">
              {t.outstandingCourierCollections || 'تحصيلات المناديب المعلقة'}
            </span>
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {totalOutstanding.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-slate-500">{t.currency}</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-800 font-semibold">
            <User className="w-3.5 h-3.5" />
            <span>{couriersWithDebtCount} {t.couriersWithOutstanding || 'مندوب بحوزتهم نقدية معلقة'}</span>
          </div>
        </div>

        {/* Card 2: Total Delivered COD */}
        <div 
          id="kpi-total-delivered-cod"
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">
              {t.totalDeliveredCod || 'إجمالي التحصيلات المسلمة'}
            </span>
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {totalDeliveredCod.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-slate-500">{t.currency}</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            شحنات COD مسلمة بنجاح من التجار
          </p>
        </div>

        {/* Card 3: Total Settled Amount */}
        <div 
          id="kpi-total-settled-amount"
          className="bg-white p-5 rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/40 via-white to-emerald-50/10 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900/80">
              {t.totalSettledAmount || 'إجمالي المبالغ المسواة'}
            </span>
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-800 tracking-tight">
              {totalSettledAmount.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-emerald-600">{t.currency}</span>
          </div>
          <p className="mt-2 text-xs text-emerald-700 font-medium">
            تم توريدها واستلامها في خزينة الشركة
          </p>
        </div>

        {/* Card 4: Settlements Count */}
        <div 
          id="kpi-settlements-count"
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">
              {t.settlementsCount || 'عدد عمليات التسوية'}
            </span>
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <History className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {settlements.length}
            </span>
            <span className="text-xs font-bold text-slate-500">عملية</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            سجل تدقيق مالي غير قابل للتعديل
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          id="tab-couriers-collections"
          onClick={() => setActiveTab('balances')}
          className={`pb-3 px-2 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'balances'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>{t.courierCollections || 'تحصيلات المناديب'}</span>
          <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-700 rounded-full font-bold">
            {summaries.length}
          </span>
        </button>

        <button
          id="tab-settlement-history"
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-2 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'history'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>{t.settlementHistoryTitle || 'سجل التسويات النقدية'}</span>
          <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-700 rounded-full font-bold">
            {settlements.length}
          </span>
        </button>
      </div>

      {/* TAB 1: COURIERS BALANCES */}
      {activeTab === 'balances' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3" />
              <input
                id="search-couriers-collections-input"
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="البحث باسم المندوب، كود الموظف، الهاتف أو المنطقة..."
                className="w-full ps-9 pe-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              <button
                id="filter-debt-all-btn"
                onClick={() => setDebtFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  debtFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t.filterAllCouriersDebt || 'جميع المناديب'} ({summaries.length})
              </button>

              <button
                id="filter-debt-with-btn"
                onClick={() => setDebtFilter('with_debt')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  debtFilter === 'with_debt'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-800 border border-amber-200/60 hover:bg-amber-100'
                }`}
              >
                {t.filterWithDebtOnly || 'بحوزتهم مبالغ معلقة'} ({couriersWithDebtCount})
              </button>

              <button
                id="filter-debt-zero-btn"
                onClick={() => setDebtFilter('zero_debt')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  debtFilter === 'zero_debt'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200/60 hover:bg-emerald-100'
                }`}
              >
                {t.filterClearedDebt || 'تمت تسويتهم (صفر متبقي)'} ({summaries.length - couriersWithDebtCount})
              </button>
            </div>
          </div>

          {/* Couriers Collections Table / Cards */}
          {filteredSummaries.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Banknote className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                {t.noCouriersWithCollections || 'لا توجد بيانات مطابقة للبحث أو الفلتر'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                تأكد من وجود مناديب مسجلين أو شحنات مسلمة بمبالغ تحصيل (COD).
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-start text-xs sm:text-sm">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold text-xs">
                    <tr>
                      <th className="py-3.5 px-4 text-start">المندوب وكود الموظف</th>
                      <th className="py-3.5 px-4 text-start">المنطقة والهاتف</th>
                      <th className="py-3.5 px-4 text-center">شحنات COD المسلمة</th>
                      <th className="py-3.5 px-4 text-end">إجمالي التحصيلات</th>
                      <th className="py-3.5 px-4 text-end">المبالغ المسواة</th>
                      <th className="py-3.5 px-4 text-end font-extrabold text-amber-900">التحصيلات المعلقة حالياً</th>
                      <th className="py-3.5 px-4 text-center">آخر تسوية</th>
                      <th className="py-3.5 px-4 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSummaries.map(item => {
                      const hasOutstanding = item.current_outstanding_balance > 0;
                      return (
                        <tr 
                          key={item.courier_id}
                          id={`courier-collection-row-${item.courier.employee_id}`}
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          {/* Courier Name & ID */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                                {item.courier.full_name.slice(0, 2)}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block">
                                  {item.courier.full_name}
                                </span>
                                <span className="text-[11px] font-mono font-semibold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                                  {item.courier.employee_id}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Area & Phone */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col text-xs text-slate-600">
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="font-medium truncate max-w-[140px]">{item.courier.area}</span>
                              </div>
                              <div className="flex items-center gap-1 mt-0.5 text-slate-500 font-mono">
                                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{item.courier.phone}</span>
                              </div>
                            </div>
                          </td>

                          {/* Delivered COD Orders */}
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                              <Receipt className="w-3 h-3" />
                              {item.delivered_cod_orders_count} شحنة
                            </span>
                          </td>

                          {/* Total Delivered COD */}
                          <td className="py-3.5 px-4 text-end font-semibold text-slate-700">
                            {item.total_delivered_cod.toLocaleString()} {t.currency}
                          </td>

                          {/* Total Settled */}
                          <td className="py-3.5 px-4 text-end font-semibold text-emerald-700">
                            {item.total_settled_amount.toLocaleString()} {t.currency}
                          </td>

                          {/* Current Outstanding Debt */}
                          <td className="py-3.5 px-4 text-end">
                            {hasOutstanding ? (
                              <div className="inline-flex flex-col items-end">
                                <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                                  {item.current_outstanding_balance.toLocaleString()} {t.currency}
                                </span>
                                <span className="text-[10px] text-amber-700 font-semibold mt-0.5">
                                  بحوزة المندوب
                                </span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Check className="w-3 h-3" />
                                مسوى بالكامل (0 {t.currency})
                              </span>
                            )}
                          </td>

                          {/* Last Settlement Date */}
                          <td className="py-3.5 px-4 text-center text-xs text-slate-500">
                            {item.last_settlement_date ? (
                              <div className="flex flex-col items-center">
                                <span className="font-medium text-slate-700">
                                  {new Date(item.last_settlement_date).toLocaleDateString('ar-EG')}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {new Date(item.last_settlement_date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">
                                {t.neverSettled || 'لا توجد تسويات سابقة'}
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {hasOutstanding ? (
                                <button
                                  id={`settle-btn-${item.courier.employee_id}`}
                                  onClick={(e) => handleOpenSettleModal(item, e)}
                                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
                                >
                                  <Coins className="w-3.5 h-3.5" />
                                  <span>{t.settleCollectionsButton || 'تسوية التحصيلات'}</span>
                                </button>
                              ) : (
                                <button
                                  disabled
                                  className="px-2.5 py-1.5 text-xs font-medium text-slate-400 bg-slate-100 rounded-lg cursor-not-allowed"
                                  title="الرصيد مسوى بالكامل ولا توجد مبالغ معلقة"
                                >
                                  {t.noSettlementNeeded || 'لا توجد مبالغ'}
                                </button>
                              )}

                              <button
                                id={`view-details-btn-${item.courier.employee_id}`}
                                onClick={() => handleOpenDetails(item)}
                                className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="عرض تفاصيل الشحنات وسجل التسويات"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              <button
                                id={`print-statement-btn-${item.courier.employee_id}`}
                                onClick={() => handleOpenStatementForCourier(item)}
                                className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="طباعة كشف مديونية المندوب ومشاركتها عبر واتساب"
                              >
                                <Printer className="w-4 h-4" />
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
        </div>
      )}

      {/* TAB 2: SETTLEMENTS AUDIT HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* History Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3" />
              <input
                id="search-settlement-history-input"
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="البحث برقم التسوية (SET-0001)، المندوب، أو المسؤول..."
                className="w-full ps-9 pe-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Courier Filter Dropdown */}
              <select
                id="filter-settlement-courier"
                value={courierFilter}
                onChange={e => setCourierFilter(e.target.value)}
                className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">{t.allCouriers || 'جميع المناديب'}</option>
                {summaries.map(s => (
                  <option key={s.courier_id} value={s.courier_id}>
                    {s.courier.full_name} ({s.courier.employee_id})
                  </option>
                ))}
              </select>

              {/* Date Filters */}
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700"
                title="من تاريخ"
              />
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700"
                title="إلى تاريخ"
              />

              {(courierFilter !== 'all' || dateFrom || dateTo || searchTerm) && (
                <button
                  onClick={() => {
                    setCourierFilter('all');
                    setDateFrom('');
                    setDateTo('');
                    setSearchTerm('');
                  }}
                  className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  {t.clearFilters || 'مسح'}
                </button>
              )}
            </div>
          </div>

          {/* Settlements History Table */}
          {filteredSettlements.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <History className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                {t.noSettlementsFound || 'لا توجد عمليات تسوية سابقة مسجلة'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                عند قيام الإدارة بتسوية تحصيلات أي مندوب، ستظهر المعاملات هنا كسجل تدقيق غير قابل للتعديل أو الحذف.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-start text-xs sm:text-sm">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold text-xs">
                    <tr>
                      <th className="py-3.5 px-4 text-start">{t.settlementNumber || 'رقم التسوية'}</th>
                      <th className="py-3.5 px-4 text-start">{t.courierName || 'المندوب'}</th>
                      <th className="py-3.5 px-4 text-end">{t.expectedAmountLabel || 'المبلغ المستحق'}</th>
                      <th className="py-3.5 px-4 text-end font-extrabold text-emerald-800">{t.amountReceivedLabel || 'المبلغ المستلم'}</th>
                      <th className="py-3.5 px-4 text-end">{t.remainingBalanceLabel || 'المتبقي'}</th>
                      <th className="py-3.5 px-4 text-center">نوع التسوية</th>
                      <th className="py-3.5 px-4 text-start">{t.settledBy || 'بواسطة'}</th>
                      <th className="py-3.5 px-4 text-start">{t.settlementDate || 'التاريخ والتوقيت'}</th>
                      <th className="py-3.5 px-4 text-start">ملاحظات</th>
                      <th className="py-3.5 px-4 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSettlements.map(item => {
                      const courier = summaries.find(sm => sm.courier_id === item.courier_id)?.courier;
                      const isFull = item.remaining_amount === 0;

                      return (
                        <tr 
                          key={item.id}
                          id={`settlement-row-${item.settlement_number}`}
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          {/* Settlement Number */}
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-200/60">
                              #{item.settlement_number}
                            </span>
                          </td>

                          {/* Courier */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900">
                                {courier?.full_name || 'مندوب محذوف'}
                              </span>
                              <span className="text-[11px] font-mono text-slate-500">
                                {courier?.employee_id || ''}
                              </span>
                            </div>
                          </td>

                          {/* Expected Amount */}
                          <td className="py-3.5 px-4 text-end font-medium text-slate-600">
                            {item.expected_amount.toLocaleString()} {t.currency}
                          </td>

                          {/* Received Amount */}
                          <td className="py-3.5 px-4 text-end font-extrabold text-emerald-700 text-sm">
                            +{item.received_amount.toLocaleString()} {t.currency}
                          </td>

                          {/* Remaining */}
                          <td className="py-3.5 px-4 text-end font-semibold">
                            {item.remaining_amount > 0 ? (
                              <span className="text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                                {item.remaining_amount.toLocaleString()} {t.currency}
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-bold">
                                0 {t.currency}
                              </span>
                            )}
                          </td>

                          {/* Badge: Full vs Partial */}
                          <td className="py-3.5 px-4 text-center">
                            {isFull ? (
                              <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                {t.fullSettlementBadge || 'تسوية كاملة'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                {t.partialSettlementBadge || 'تسوية جزئية'}
                              </span>
                            )}
                          </td>

                          {/* Settled By */}
                          <td className="py-3.5 px-4 text-slate-700 font-medium">
                            <div className="flex items-center gap-1 text-xs">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <span>{item.settled_by}</span>
                            </div>
                          </td>

                          {/* Date & Time */}
                          <td className="py-3.5 px-4 text-xs text-slate-500">
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-700">
                                {new Date(item.created_at).toLocaleDateString('ar-EG')}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {new Date(item.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </td>

                          {/* Notes */}
                          <td className="py-3.5 px-4 text-xs text-slate-500 max-w-[180px] truncate">
                            {item.notes || <span className="text-slate-400 italic">بدون ملاحظات</span>}
                          </td>

                          {/* Actions: Print / WhatsApp Receipt */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              id={`print-settlement-btn-${item.settlement_number}`}
                              onClick={() => handleOpenReceiptForSettlement(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-lg transition-colors cursor-pointer"
                              title="طباعة إيصال التسوية أو مشاركته عبر واتساب"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>إيصال</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: SETTLE COLLECTIONS (ADMIN ONLY)                 */}
      {/* ========================================================= */}
      <Modal
        isOpen={isSettleModalOpen}
        onClose={() => !isSubmitting && setIsSettleModalOpen(false)}
        title={t.settlementModalTitle || 'تسوية نقدية تحصيلات المندوب'}
        maxWidth="md"
      >
        {selectedCourierSummary && (
          <form onSubmit={handleConfirmSettlement} className="space-y-4">
            {/* Courier Info Header */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
                  {selectedCourierSummary.courier.full_name.slice(0, 2)}
                </div>
                <div>
                  <span className="font-bold text-slate-900 text-sm block">
                    {selectedCourierSummary.courier.full_name}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                    <span className="font-mono font-semibold bg-slate-200/80 px-1.5 py-0.2 rounded text-slate-700">
                      {selectedCourierSummary.courier.employee_id}
                    </span>
                    <span>• {selectedCourierSummary.courier.area}</span>
                  </div>
                </div>
              </div>

              <div className="text-end">
                <span className="text-[11px] text-slate-500 block">شحنات COD المسلمة</span>
                <span className="text-xs font-bold text-blue-700">
                  {selectedCourierSummary.delivered_cod_orders_count} شحنة
                </span>
              </div>
            </div>

            {/* Current Outstanding Debt Callout */}
            <div className="p-4 bg-amber-50/80 rounded-xl border border-amber-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-amber-900 block">
                  {t.expectedAmountLabel || 'إجمالي المبلغ المستحق حالياً'}
                </span>
                <span className="text-[11px] text-amber-700">
                  مبالغ الدفع عند الاستلام المحصلة وغير المسواة
                </span>
              </div>
              <div className="text-end">
                <span className="text-2xl font-black text-amber-950 tracking-tight">
                  {selectedCourierSummary.current_outstanding_balance.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-amber-800 ms-1">{t.currency}</span>
              </div>
            </div>

            {/* Amount Received Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  {t.amountReceivedLabel || 'المبلغ المستلم الفعلي (ج.م)'} <span className="text-red-500">*</span>
                </label>
                {/* Auto-fill full settlement button */}
                <button
                  type="button"
                  id="auto-fill-full-settlement-btn"
                  onClick={() => {
                    setReceivedAmountInput(String(selectedCourierSummary.current_outstanding_balance));
                    setSettlementError(null);
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline"
                >
                  تسوية كاملة ({selectedCourierSummary.current_outstanding_balance.toLocaleString()} {t.currency})
                </button>
              </div>

              <div className="relative">
                <input
                  id="amount-received-input"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedCourierSummary.current_outstanding_balance}
                  value={receivedAmountInput}
                  onChange={e => {
                    setReceivedAmountInput(e.target.value);
                    setSettlementError(null);
                  }}
                  placeholder={t.amountReceivedPlaceholder || 'أدخل المبلغ المستلم...'}
                  required
                  className="w-full ps-3 pe-12 py-2.5 bg-white border border-slate-300 rounded-xl text-base font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
                <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  {t.currency}
                </span>
              </div>
            </div>

            {/* Dynamic Calculation Preview: Remaining Balance */}
            <div className="p-3 bg-slate-100 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600">
                {t.remainingBalanceLabel || 'الرصيد المتبقي بعد التسوية'}:
              </span>
              <div className="flex items-center gap-2">
                <span className={`font-bold text-sm ${calculatedRemaining === 0 ? 'text-emerald-700' : 'text-amber-800'}`}>
                  {calculatedRemaining.toLocaleString()} {t.currency}
                </span>
                {isFullSettlement ? (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">
                    {t.fullSettlementBadge || 'تسوية كاملة'}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800">
                    {t.partialSettlementBadge || 'تسوية جزئية'}
                  </span>
                )}
              </div>
            </div>

            {/* Notes Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {t.settlementNotesLabel || 'ملاحظات التسوية (اختياري)'}
              </label>
              <textarea
                id="settlement-notes-input"
                rows={2}
                value={settlementNotes}
                onChange={e => setSettlementNotes(e.target.value)}
                placeholder={t.settlementNotesPlaceholder || 'مثال: تسوية تحصيلات نهاية اليوم / تسوية جزئية بناءً على طلب المندوب...'}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>

            {/* Error Message */}
            {settlementError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{settlementError}</span>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                id="cancel-settlement-btn"
                disabled={isSubmitting}
                onClick={() => setIsSettleModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                {t.cancel}
              </button>

              <button
                type="submit"
                id="confirm-settlement-submit-btn"
                disabled={isSubmitting || !receivedAmountInput || parsedReceivedAmount <= 0 || parsedReceivedAmount > selectedCourierSummary.current_outstanding_balance}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'جاري الحفظ...' : (t.confirmSettlementButton || 'تأكيد استلام النقدية والتسوية')}</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 2: COURIER DETAILS (ORDERS & SETTLEMENT HISTORY)     */}
      {/* ========================================================= */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title="تفاصيل تحصيلات وشحنات المندوب"
        maxWidth="2xl"
      >
        {detailCourierSummary && (
          <div className="space-y-4">
            {/* Courier Header Card */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm shrink-0">
                  {detailCourierSummary.courier.full_name.slice(0, 2)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {detailCourierSummary.courier.full_name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <span className="font-mono font-semibold bg-slate-200 px-1.5 py-0.2 rounded text-slate-700">
                      {detailCourierSummary.courier.employee_id}
                    </span>
                    <span>• {detailCourierSummary.courier.area}</span>
                    <span>• {detailCourierSummary.courier.phone}</span>
                  </div>
                </div>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
                <span className="text-xs text-slate-500 font-semibold">التحصيلات المعلقة حالياً</span>
                <span className={`text-xl font-black ${detailCourierSummary.current_outstanding_balance > 0 ? 'text-amber-800' : 'text-emerald-700'}`}>
                  {detailCourierSummary.current_outstanding_balance.toLocaleString()} {t.currency}
                </span>
              </div>
            </div>

            {/* Sub-tabs in Details Modal */}
            <div className="flex border-b border-slate-200 gap-3">
              <button
                id="detail-tab-orders"
                onClick={() => setDetailTab('orders')}
                className={`pb-2.5 px-2 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                  detailTab === 'orders'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>{t.deliveredCodOrdersListTitle || 'الشحنات المسلمة المحصلة'} ({detailCourierSummary.delivered_cod_orders_count})</span>
              </button>

              <button
                id="detail-tab-settlements"
                onClick={() => setDetailTab('settlements')}
                className={`pb-2.5 px-2 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                  detailTab === 'settlements'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>سجل تسويات هذا المندوب ({detailCourierSummary.settlements_count})</span>
              </button>
            </div>

            {/* Sub-Tab 1: Delivered COD Orders List */}
            {detailTab === 'orders' && (
              <div className="space-y-2">
                {detailCourierSummary.delivered_cod_orders.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    {t.noDeliveredCodOrders || 'لا توجد شحنات مسلمة بمبالغ تحصيل مسجلة لهذا المندوب.'}
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200">
                    <table className="w-full text-start text-xs">
                      <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 font-bold">
                        <tr>
                          <th className="py-2.5 px-3 text-start">رقم الشحنة</th>
                          <th className="py-2.5 px-3 text-start">العميل</th>
                          <th className="py-2.5 px-3 text-start">تاريخ التسليم</th>
                          <th className="py-2.5 px-3 text-end font-bold text-slate-900">مبلغ التحصيل (COD)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detailCourierSummary.delivered_cod_orders.map(order => (
                          <tr key={order.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                              #{order.order_number}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-semibold text-slate-900 block">{order.customer_name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{order.customer_phone}</span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              {order.delivery_date || new Date(order.updated_at).toLocaleDateString('ar-EG')}
                            </td>
                            <td className="py-2.5 px-3 text-end font-bold text-slate-900">
                              {Number(order.cod_amount).toLocaleString()} {t.currency}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Sub-Tab 2: Courier Past Settlements */}
            {detailTab === 'settlements' && (
              <div className="space-y-2">
                {(() => {
                  const courierSettlements = settlements.filter(s => s.courier_id === detailCourierSummary.courier_id);
                  if (courierSettlements.length === 0) {
                    return (
                      <div className="py-8 text-center text-xs text-slate-500">
                        {t.neverSettled || 'لا توجد تسويات سابقة مسجلة لهذا المندوب.'}
                      </div>
                    );
                  }
                  return (
                    <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200">
                      <table className="w-full text-start text-xs">
                        <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 font-bold">
                          <tr>
                            <th className="py-2.5 px-3 text-start">رقم التسوية</th>
                            <th className="py-2.5 px-3 text-end">المستحق</th>
                            <th className="py-2.5 px-3 text-end text-emerald-800">المستلم</th>
                            <th className="py-2.5 px-3 text-end">المتبقي</th>
                            <th className="py-2.5 px-3 text-start">المسؤول</th>
                            <th className="py-2.5 px-3 text-start">التاريخ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {courierSettlements.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                                #{item.settlement_number}
                              </td>
                              <td className="py-2.5 px-3 text-end text-slate-600">
                                {item.expected_amount.toLocaleString()} {t.currency}
                              </td>
                              <td className="py-2.5 px-3 text-end font-bold text-emerald-700">
                                +{item.received_amount.toLocaleString()} {t.currency}
                              </td>
                              <td className="py-2.5 px-3 text-end font-semibold">
                                {item.remaining_amount === 0 ? '0' : item.remaining_amount.toLocaleString()} {t.currency}
                              </td>
                              <td className="py-2.5 px-3 text-slate-700">
                                {item.settled_by}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                                {new Date(item.created_at).toLocaleDateString('ar-EG')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Footer */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {detailCourierSummary.current_outstanding_balance > 0 ? (
                  <button
                    id="open-settle-from-detail-btn"
                    onClick={() => {
                      setIsDetailsModalOpen(false);
                      handleOpenSettleModal(detailCourierSummary);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer"
                  >
                    <Coins className="w-4 h-4" />
                    <span>{t.settleCollectionsButton || 'تسوية التحصيلات الآن'}</span>
                  </button>
                ) : (
                  <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    لا توجد مبالغ معلقة بحوزة هذا المندوب
                  </span>
                )}

                <button
                  id="print-statement-from-detail-btn"
                  onClick={() => {
                    handleOpenStatementForCourier(detailCourierSummary);
                  }}
                  className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-slate-500" />
                  <span>طباعة كشف المديونية</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsDetailsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors ms-auto cursor-pointer"
              >
                {t.close || 'إغلاق'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 3: COURIER SETTLEMENT RECEIPT / DEBT STATEMENT      */}
      {/* ========================================================= */}
      <CourierSettlementReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        settlement={receiptSettlement}
        courier={receiptCourier}
        courierSummary={receiptSummary}
        companyName={session?.company.name || 'DELIXA'}
        companyPhone={session?.company.phone}
        companyAddress={session?.company.address}
        companyLogoUrl={session?.company.logo_url}
      />
    </div>
  );
};
