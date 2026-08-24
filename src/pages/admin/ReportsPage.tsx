import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { db, RETURN_REASONS } from '../../lib/db';
import { Order, Merchant, Courier, ReturnRecord } from '../../types';
import {
  BarChart3,
  Calendar,
  Download,
  Filter,
  FileSpreadsheet,
  Package,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Truck,
  Store,
  DollarSign,
  Search,
  ChevronDown,
  TrendingUp,
  Clock,
  CheckCheck,
  CalendarClock,
  XCircle,
  FileText,
  Printer,
  Sparkles,
} from 'lucide-react';

type ReportTab = 'orders' | 'confirmations' | 'couriers' | 'merchants' | 'returns';
type DatePreset = 'all' | 'today' | 'yesterday' | 'last7days' | 'thisMonth' | 'custom';

export const ReportsPage: React.FC = () => {
  const { session } = useAuth();
  const { t, isRTL } = useLanguage();
  const { showToast } = useToast();
  const companyId = session?.company?.id || '';

  const [activeTab, setActiveTab] = useState<ReportTab>('orders');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedMerchant, setSelectedMerchant] = useState<string>('all');
  const [selectedCourier, setSelectedCourier] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Raw data
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [allReturns, setAllReturns] = useState<ReturnRecord[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);

  const loadData = async () => {
    if (!companyId) return;
    const [ords, rets, mers, crs] = await Promise.all([
      db.getOrders(companyId),
      db.getReturns(companyId),
      db.getMerchants(companyId),
      db.getCouriers(companyId),
    ]);
    setAllOrders(ords);
    setAllReturns(rets);
    setMerchants(mers);
    setCouriers(crs);
  };

  useEffect(() => {
    loadData();

    const handleSync = () => loadData();
    window.addEventListener('delixa-realtime-order-sync', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('delixa-realtime-order-sync', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [companyId]);

  // Date Presets Handler
  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const yStr = yesterday.toISOString().split('T')[0];
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === 'last7days') {
      const past7 = new Date(now);
      past7.setDate(now.getDate() - 7);
      setStartDate(past7.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(todayStr);
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Maps for quick lookups
  const merchantsMap = useMemo(() => {
    const map = new Map<string, Merchant>();
    merchants.forEach(m => map.set(m.id, m));
    return map;
  }, [merchants]);

  const couriersMap = useMemo(() => {
    const map = new Map<string, Courier>();
    couriers.forEach(c => map.set(c.id, c));
    return map;
  }, [couriers]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return allOrders.filter(o => {
      // Date filter
      if (startDate) {
        const orderDate = (o.delivery_date || o.created_at).split('T')[0];
        if (orderDate < startDate) return false;
      }
      if (endDate) {
        const orderDate = (o.delivery_date || o.created_at).split('T')[0];
        if (orderDate > endDate) return false;
      }
      // Merchant filter
      if (selectedMerchant !== 'all' && o.merchant_id !== selectedMerchant) {
        return false;
      }
      // Courier filter
      if (selectedCourier !== 'all' && o.courier_id !== selectedCourier) {
        return false;
      }
      // Status filter
      if (selectedStatus !== 'all' && o.status !== selectedStatus) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesOrder = o.order_number.toLowerCase().includes(q);
        const matchesCustomer = o.customer_name.toLowerCase().includes(q) || o.customer_phone.includes(q);
        const matchesAddress = o.customer_address.toLowerCase().includes(q);
        if (!matchesOrder && !matchesCustomer && !matchesAddress) return false;
      }
      return true;
    });
  }, [allOrders, startDate, endDate, selectedMerchant, selectedCourier, selectedStatus, searchQuery]);

  // Filtered Returns
  const filteredReturns = useMemo(() => {
    return allReturns.filter(r => {
      if (startDate) {
        const returnDate = r.created_at.split('T')[0];
        if (returnDate < startDate) return false;
      }
      if (endDate) {
        const returnDate = r.created_at.split('T')[0];
        if (returnDate > endDate) return false;
      }
      if (selectedMerchant !== 'all' && r.merchant_id !== selectedMerchant) {
        return false;
      }
      if (selectedCourier !== 'all' && r.courier_id !== selectedCourier) {
        return false;
      }
      if (selectedStatus !== 'all' && r.status !== selectedStatus) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesNum = r.return_number.toLowerCase().includes(q);
        const matchesCust = r.customer_name.toLowerCase().includes(q) || r.customer_phone.includes(q);
        if (!matchesNum && !matchesCust) return false;
      }
      return true;
    });
  }, [allReturns, startDate, endDate, selectedMerchant, selectedCourier, selectedStatus, searchQuery]);

  // Metrics Computations for Orders
  const orderMetrics = useMemo(() => {
    const total = filteredOrders.length;
    const delivered = filteredOrders.filter(o => o.status === 'delivered').length;
    const failed = filteredOrders.filter(o => o.status === 'failed').length;
    const outForDelivery = filteredOrders.filter(o => o.status === 'out_for_delivery').length;
    const assigned = filteredOrders.filter(o => o.status === 'assigned').length;
    const pending = filteredOrders.filter(o => o.status === 'pending').length;
    const cancelled = filteredOrders.filter(o => o.status === 'cancelled').length;

    const totalCod = filteredOrders.reduce((sum, o) => sum + (Number(o.cod_amount) || 0), 0);
    const deliveredCod = filteredOrders
      .filter(o => o.status === 'delivered')
      .reduce((sum, o) => sum + (Number(o.cod_amount) || 0), 0);

    const successRate = total > 0 ? Math.round((delivered / (delivered + failed || 1)) * 100) : 0;

    return {
      total,
      delivered,
      failed,
      outForDelivery,
      assigned,
      pending,
      cancelled,
      totalCod,
      deliveredCod,
      successRate,
    };
  }, [filteredOrders]);

  // Customer Confirmation Metrics
  const confirmationMetrics = useMemo(() => {
    const total = filteredOrders.length;
    const confirmed = filteredOrders.filter(o => o.customer_response_status === 'confirmed').length;
    const reschedule = filteredOrders.filter(o => o.customer_response_status === 'reschedule_requested').length;
    const cancelled = filteredOrders.filter(o => o.customer_response_status === 'cancelled').length;
    const noResponse = filteredOrders.filter(o => !o.customer_response_status || o.customer_response_status === 'pending' || (o.customer_response_status as string) === 'no_response').length;
    const whatsappSent = filteredOrders.filter(o => !!o.confirmation_sent_at).length;

    const rate = total > 0 ? Math.round(((confirmed + reschedule) / total) * 100) : 0;

    return {
      total,
      confirmed,
      reschedule,
      cancelled,
      noResponse,
      whatsappSent,
      rate,
    };
  }, [filteredOrders]);

  // Courier Aggregated Report
  const courierReports = useMemo(() => {
    return couriers.map(c => {
      const courierOrders = filteredOrders.filter(o => o.courier_id === c.id);
      const delivered = courierOrders.filter(o => o.status === 'delivered').length;
      const failed = courierOrders.filter(o => o.status === 'failed').length;
      const outForDelivery = courierOrders.filter(o => o.status === 'out_for_delivery').length;
      const assigned = courierOrders.length;
      const collectedCod = courierOrders
        .filter(o => o.status === 'delivered')
        .reduce((sum, o) => sum + (Number(o.cod_amount) || 0), 0);

      const successRate = (delivered + failed) > 0 ? Math.round((delivered / (delivered + failed)) * 100) : 0;

      const courierReturns = filteredReturns.filter(r => r.courier_id === c.id);
      const activeReturns = courierReturns.filter(r => r.status === 'with_courier').length;
      const completedReturns = courierReturns.filter(r => r.status === 'returned').length;

      return {
        id: c.id,
        name: c.full_name,
        employeeId: c.employee_id,
        phone: c.phone,
        area: c.area,
        status: c.status,
        assigned,
        delivered,
        failed,
        outForDelivery,
        collectedCod,
        successRate,
        activeReturns,
        completedReturns,
      };
    });
  }, [couriers, filteredOrders, filteredReturns]);

  // Merchant Aggregated Report
  const merchantReports = useMemo(() => {
    return merchants.map(m => {
      const merchantOrders = filteredOrders.filter(o => o.merchant_id === m.id);
      const delivered = merchantOrders.filter(o => o.status === 'delivered').length;
      const failed = merchantOrders.filter(o => o.status === 'failed').length;
      const total = merchantOrders.length;
      const totalCod = merchantOrders.reduce((sum, o) => sum + (Number(o.cod_amount) || 0), 0);
      const deliveredCod = merchantOrders
        .filter(o => o.status === 'delivered')
        .reduce((sum, o) => sum + (Number(o.cod_amount) || 0), 0);
      const successRate = (delivered + failed) > 0 ? Math.round((delivered / (delivered + failed)) * 100) : 0;

      const merchantReturns = filteredReturns.filter(r => r.merchant_id === m.id);
      const returnCount = merchantReturns.length;
      const returnAmount = merchantReturns.reduce((sum, r) => sum + (Number(r.total_return_amount) || 0), 0);

      return {
        id: m.id,
        name: m.store_name,
        owner: m.owner_name,
        phone: m.phone,
        status: m.status,
        total,
        delivered,
        failed,
        totalCod,
        deliveredCod,
        successRate,
        returnCount,
        returnAmount,
      };
    });
  }, [merchants, filteredOrders, filteredReturns]);

  // Returns Aggregated Report Metrics
  const returnMetrics = useMemo(() => {
    const total = filteredReturns.length;
    const created = filteredReturns.filter(r => r.status === 'created').length;
    const withCourier = filteredReturns.filter(r => r.status === 'with_courier').length;
    const returned = filteredReturns.filter(r => r.status === 'returned').length;
    const cancelled = filteredReturns.filter(r => r.status === 'cancelled').length;

    const totalAmount = filteredReturns.reduce((sum, r) => sum + (Number(r.total_return_amount) || 0), 0);
    const completedAmount = filteredReturns
      .filter(r => r.status === 'returned')
      .reduce((sum, r) => sum + (Number(r.total_return_amount) || 0), 0);

    return {
      total,
      created,
      withCourier,
      returned,
      cancelled,
      totalAmount,
      completedAmount,
    };
  }, [filteredReturns]);

  // Export CSV Handler
  const handleExportCSV = () => {
    let filename = `delixa_${activeTab}_report_${new Date().toISOString().split('T')[0]}.csv`;
    let csvRows: string[][] = [];

    if (activeTab === 'orders') {
      csvRows.push([
        'رقم الشحنة (Order Number)',
        'العميل (Customer)',
        'الهاتف (Phone)',
        'العنوان (Address)',
        'المتجر (Merchant)',
        'المندوب (Courier)',
        'مبلغ التحصيل (COD)',
        'حالة الشحنة (Status)',
        'تأكيد العميل (Customer Response)',
        'تاريخ التوصيل (Delivery Date)',
        'نافذة التوصيل (Window)',
      ]);

      filteredOrders.forEach(o => {
        const merchant = merchantsMap.get(o.merchant_id)?.store_name || '-';
        const courier = o.courier_id ? couriersMap.get(o.courier_id)?.full_name || '-' : 'غير معين';
        csvRows.push([
          `#${o.order_number}`,
          o.customer_name,
          o.customer_phone,
          o.customer_address,
          merchant,
          courier,
          `${o.cod_amount}`,
          o.status,
          o.customer_response_status || 'no_response',
          o.delivery_date || o.created_at.split('T')[0],
          `${o.delivery_from || ''} - ${o.delivery_to || ''}`,
        ]);
      });
    } else if (activeTab === 'confirmations') {
      csvRows.push([
        'رقم الشحنة',
        'العميل',
        'الهاتف',
        'حالة الاستجابة',
        'الموعد المقرر',
        'الموعد المطلوب من العميل',
        'نافذة العميل',
        'ملاحظة العميل',
        'تاريخ الإرسال عبر واتساب',
        'تاريخ الاستجابة',
      ]);

      filteredOrders.forEach(o => {
        csvRows.push([
          `#${o.order_number}`,
          o.customer_name,
          o.customer_phone,
          o.customer_response_status || 'لم يستجب بعد',
          o.delivery_date || '-',
          o.customer_selected_date || '-',
          `${o.customer_selected_from || ''} - ${o.customer_selected_to || ''}`,
          o.customer_note || '-',
          o.confirmation_sent_at || '-',
          o.customer_responded_at || '-',
        ]);
      });
    } else if (activeTab === 'couriers') {
      csvRows.push([
        'اسم المندوب',
        'كود الموظف',
        'الهاتف',
        'المنطقة',
        'إجمالي الشحنات المسندة',
        'المسلمة بنجاح',
        'المتعثرة',
        'قيد التوصيل الآن',
        'نسبة التسليم الناجح (%)',
        'إجمالي المبالغ المحصلة (ج.م)',
        'المرتجعات المسندة',
        'المرتجعات المستلمة',
      ]);

      courierReports.forEach(c => {
        csvRows.push([
          c.name,
          c.employeeId,
          c.phone,
          c.area,
          `${c.assigned}`,
          `${c.delivered}`,
          `${c.failed}`,
          `${c.outForDelivery}`,
          `${c.successRate}%`,
          `${c.collectedCod}`,
          `${c.activeReturns}`,
          `${c.completedReturns}`,
        ]);
      });
    } else if (activeTab === 'merchants') {
      csvRows.push([
        'اسم المتجر',
        'المالك',
        'الهاتف',
        'إجمالي الشحنات',
        'المسلمة',
        'المتعثرة',
        'نسبة النجاح (%)',
        'إجمالي قيمة الشحنات (ج.م)',
        'المبالغ المحصلة المسلمة (ج.م)',
        'عدد المرتجعات',
        'إجمالي قيمة المرتجعات (ج.م)',
      ]);

      merchantReports.forEach(m => {
        csvRows.push([
          m.name,
          m.owner,
          m.phone,
          `${m.total}`,
          `${m.delivered}`,
          `${m.failed}`,
          `${m.successRate}%`,
          `${m.totalCod}`,
          `${m.deliveredCod}`,
          `${m.returnCount}`,
          `${m.returnAmount}`,
        ]);
      });
    } else if (activeTab === 'returns') {
      csvRows.push([
        'رقم الإرجاع',
        'رقم الشحنة الأصلية',
        'العميل',
        'الهاتف',
        'عنوان الإرجاع',
        'المتجر',
        'المندوب المستلم',
        'سبب الإرجاع',
        'قيمة المنتج المرتجع',
        'تكلفة الشحن',
        'إجمالي المبلغ المسترد',
        'الحالة',
        'تاريخ الإنشاء',
      ]);

      filteredReturns.forEach(r => {
        const order = allOrders.find(o => o.id === r.order_id);
        const merchant = merchantsMap.get(r.merchant_id)?.store_name || '-';
        const courier = r.courier_id ? couriersMap.get(r.courier_id)?.full_name || '-' : 'غير مسند';
        csvRows.push([
          `#${r.return_number}`,
          order ? `#${order.order_number}` : '-',
          r.customer_name,
          r.customer_phone,
          r.return_address,
          merchant,
          courier,
          r.return_reason,
          `${r.return_amount}`,
          `${r.return_shipping_cost}`,
          `${r.total_return_amount}`,
          r.status,
          r.created_at.split('T')[0],
        ]);
      });
    }

    // Convert array to CSV with BOM for Arabic support
    const csvContent =
      '\uFEFF' +
      csvRows
        .map(row =>
          row
            .map(cell => {
              const str = `${cell || ''}`.replace(/"/g, '""');
              return `"${str}"`;
            })
            .join(',')
        )
        .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('success', isRTL ? 'تم تصدير التقرير بنجاح' : 'Report exported successfully');
  };

  const tabs: { id: ReportTab; label: string; icon: React.ElementType }[] = [
    { id: 'orders', label: 'تقرير الشحنات والتسليم', icon: Package },
    { id: 'confirmations', label: 'تقرير تأكيدات العملاء', icon: CheckCheck },
    { id: 'couriers', label: 'تقرير أداء المناديب', icon: Truck },
    { id: 'merchants', label: 'تقرير حسابات المتاجر', icon: Store },
    { id: 'returns', label: 'تقرير المرتجعات', icon: RotateCcw },
  ];

  return (
    <div className="space-y-6 pb-12">
      
      {/* 1. Header Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              <span>{t.navReports}</span>
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
              Operational Reporting Engine
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            تقارير تشغيلية فورية، كشوف حسابات المتاجر، نسب الإنجاز وتصدير ملفات Excel / CSV
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="export-csv-btn"
            onClick={handleExportCSV}
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
            title="تصدير التقرير الحالي كملف CSV متوافق مع Excel"
          >
            <Download className="w-4 h-4" />
            <span>تصدير CSV (Excel)</span>
          </button>
        </div>
      </div>

      {/* 2. Universal Date Filters & Filter Control Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        
        {/* Top: Date Preset Buttons */}
        <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-slate-100 text-xs">
          <span className="font-bold text-slate-600 flex items-center gap-1.5 me-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>النطاق الزمني:</span>
          </span>

          {[
            { id: 'all', label: 'كافة الفترات' },
            { id: 'today', label: 'اليوم' },
            { id: 'yesterday', label: 'أمس' },
            { id: 'last7days', label: 'آخر 7 أيام' },
            { id: 'thisMonth', label: 'هذا الشهر' },
            { id: 'custom', label: 'تاريخ مخصص' },
          ].map(p => (
            <button
              key={p.id}
              id={`preset-${p.id}`}
              onClick={() => handlePresetChange(p.id as DatePreset)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                datePreset === p.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Bottom: Secondary Filters Row (Dates, Merchant, Courier, Status, Search) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          
          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">من تاريخ</label>
            <input
              type="date"
              id="report-start-date"
              value={startDate}
              onChange={e => {
                setStartDate(e.target.value);
                setDatePreset('custom');
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">إلى تاريخ</label>
            <input
              type="date"
              id="report-end-date"
              value={endDate}
              onChange={e => {
                setEndDate(e.target.value);
                setDatePreset('custom');
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
            />
          </div>

          {/* Merchant Select */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">المتجر / التاجر</label>
            <select
              id="report-merchant-filter"
              value={selectedMerchant}
              onChange={e => setSelectedMerchant(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            >
              <option value="all">جميع المتاجر ({merchants.length})</option>
              {merchants.map(m => (
                <option key={m.id} value={m.id}>
                  {m.store_name}
                </option>
              ))}
            </select>
          </div>

          {/* Courier Select */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">المندوب</label>
            <select
              id="report-courier-filter"
              value={selectedCourier}
              onChange={e => setSelectedCourier(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            >
              <option value="all">جميع المناديب ({couriers.length})</option>
              {couriers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.full_name} ({c.employee_id})
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">البحث السريع</label>
            <div className="relative">
              <input
                type="text"
                id="report-search-input"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="رقم، عميل، هاتف..."
                className="w-full ps-8 pe-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute start-2.5 top-3" />
            </div>
          </div>

        </div>

      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2 bg-white px-4 pt-2 rounded-t-2xl">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`report-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all shrink-0 cursor-pointer ${
                isActive
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Tab 1: Orders & Delivery Performance Report */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {/* Order Metrics Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500">إجمالي الشحنات</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{orderMetrics.total}</p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-emerald-200 shadow-xs bg-emerald-50/30">
              <span className="text-[11px] font-semibold text-emerald-700">مسلّمة بنجاح</span>
              <p className="text-2xl font-black text-emerald-800 mt-1">{orderMetrics.delivered}</p>
              <span className="text-[10px] text-emerald-600 font-bold">نسبة: {orderMetrics.successRate}%</span>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-xs bg-rose-50/30">
              <span className="text-[11px] font-semibold text-rose-700">شحنات متعثرة</span>
              <p className="text-2xl font-black text-rose-800 mt-1">{orderMetrics.failed}</p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-blue-200 shadow-xs bg-blue-50/30">
              <span className="text-[11px] font-semibold text-blue-700">قيد التوصيل</span>
              <p className="text-2xl font-black text-blue-800 mt-1">{orderMetrics.outForDelivery}</p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500">مبالغ التحصيل COD</span>
              <p className="text-xl font-black text-slate-900 mt-1 font-mono">
                {orderMetrics.totalCod.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-emerald-200 shadow-xs bg-emerald-50/30">
              <span className="text-[11px] font-semibold text-emerald-700">المحصل فعلياً</span>
              <p className="text-xl font-black text-emerald-800 mt-1 font-mono">
                {orderMetrics.deliveredCod.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
              </p>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                سجل الشحنات المطابقة للفلاتر ({filteredOrders.length})
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 text-[11px] font-bold">
                    <th className="p-3 text-start">رقم الشحنة</th>
                    <th className="p-3 text-start">العميل والهاتف</th>
                    <th className="p-3 text-start">المتجر</th>
                    <th className="p-3 text-start">المندوب</th>
                    <th className="p-3 text-start">تاريخ التوصيل</th>
                    <th className="p-3 text-center">حالة الشحنة</th>
                    <th className="p-3 text-center">تأكيد العميل</th>
                    <th className="p-3 text-end">المبلغ (COD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        لا توجد شحنات مطابقة للفلاتر المحددة
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map(order => {
                      const merchant = merchantsMap.get(order.merchant_id);
                      const courier = order.courier_id ? couriersMap.get(order.courier_id) : null;
                      return (
                        <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-mono font-bold text-blue-700">
                            #{order.order_number}
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{order.customer_name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{order.customer_phone}</div>
                          </td>
                          <td className="p-3 text-slate-700 font-semibold">
                            {merchant?.store_name || '-'}
                          </td>
                          <td className="p-3 text-slate-600">
                            {courier ? (
                              <span className="font-semibold text-emerald-800">
                                {courier.full_name}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">غير معين</span>
                            )}
                          </td>
                          <td className="p-3 text-slate-600 font-mono">
                            {order.delivery_date || order.created_at.split('T')[0]}
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                order.status === 'delivered'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : order.status === 'failed'
                                  ? 'bg-rose-100 text-rose-800'
                                  : order.status === 'out_for_delivery'
                                  ? 'bg-blue-100 text-blue-800'
                                  : order.status === 'assigned'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {order.status}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                                order.customer_response_status === 'confirmed'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : order.customer_response_status === 'reschedule_requested'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : order.customer_response_status === 'cancelled'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {order.customer_response_status === 'confirmed'
                                ? 'مؤكدة'
                                : order.customer_response_status === 'reschedule_requested'
                                ? 'طلب تأجيل'
                                : order.customer_response_status === 'cancelled'
                                ? 'ملغاة'
                                : 'لم يستجب'}
                            </span>
                          </td>
                          <td className="p-3 text-end font-mono font-bold text-slate-900">
                            {Number(order.cod_amount).toLocaleString()} ج.م
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. Tab 2: Customer Confirmation & Rescheduling Report */}
      {activeTab === 'confirmations' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500">إجمالي شحنات الرابط</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{confirmationMetrics.total}</p>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-xs">
              <span className="text-[11px] font-semibold text-emerald-700">تأكيد الموعد</span>
              <p className="text-2xl font-black text-emerald-800 mt-1">{confirmationMetrics.confirmed}</p>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 shadow-xs">
              <span className="text-[11px] font-semibold text-amber-700">طلبوا تأجيل / تعديل</span>
              <p className="text-2xl font-black text-amber-800 mt-1">{confirmationMetrics.reschedule}</p>
            </div>
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 shadow-xs">
              <span className="text-[11px] font-semibold text-rose-700">إلغاء من العميل</span>
              <p className="text-2xl font-black text-rose-800 mt-1">{confirmationMetrics.cancelled}</p>
            </div>
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 shadow-xs">
              <span className="text-[11px] font-semibold text-blue-700">معدل التفاعل الإجمالي</span>
              <p className="text-2xl font-black text-blue-800 mt-1">{confirmationMetrics.rate}%</p>
            </div>
          </div>

          {/* Detailed Reschedule & Response Log */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                سجل طلبات واستجابات العملاء
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 text-[11px] font-bold">
                    <th className="p-3 text-start">الشحنة</th>
                    <th className="p-3 text-start">العميل</th>
                    <th className="p-3 text-center">الاستجابة</th>
                    <th className="p-3 text-start">الموعد المطلوب من العميل</th>
                    <th className="p-3 text-start">ملاحظات العميل</th>
                    <th className="p-3 text-end">وقت الاستجابة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.filter(o => o.customer_response_status).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        لا توجد استجابات مسجلة من العملاء في هذا النطاق
                      </td>
                    </tr>
                  ) : (
                    filteredOrders
                      .filter(o => o.customer_response_status)
                      .map(order => (
                        <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-mono font-bold text-blue-700">
                            #{order.order_number}
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{order.customer_name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{order.customer_phone}</div>
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                order.customer_response_status === 'confirmed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : order.customer_response_status === 'reschedule_requested'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {order.customer_response_status === 'confirmed'
                                ? 'تأكيد التسليم'
                                : order.customer_response_status === 'reschedule_requested'
                                ? 'طلب تأجيل'
                                : 'إلغاء'}
                            </span>
                          </td>
                          <td className="p-3">
                            {order.customer_selected_date ? (
                              <div className="font-bold text-indigo-900">
                                {order.customer_selected_date}
                                <span className="text-[10px] text-slate-500 block">
                                  ({order.customer_selected_from} - {order.customer_selected_to})
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="p-3 text-slate-700">
                            {order.customer_note || <span className="text-slate-400 italic">لا توجد ملاحظة</span>}
                          </td>
                          <td className="p-3 text-end font-mono text-slate-500 text-[11px]">
                            {order.customer_responded_at
                              ? new Date(order.customer_responded_at).toLocaleString(isRTL ? 'ar-EG' : 'en-US')
                              : '-'}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. Tab 3: Courier Fleet & COD Performance Report */}
      {activeTab === 'couriers' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                تقرير إنتاجية وتحصيلات المناديب ({courierReports.length} مندوب)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 text-[11px] font-bold">
                    <th className="p-3 text-start">المندوب</th>
                    <th className="p-3 text-start">المنطقة</th>
                    <th className="p-3 text-center">المسندة</th>
                    <th className="p-3 text-center">المسلمة</th>
                    <th className="p-3 text-center">المتعثرة</th>
                    <th className="p-3 text-center">نسبة الإنجاز</th>
                    <th className="p-3 text-center">المرتجعات</th>
                    <th className="p-3 text-end">إجمالي التحصيل COD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {courierReports.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{c.name}</span>
                          <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1 rounded border border-slate-200">
                            {c.employeeId}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{c.phone}</div>
                      </td>
                      <td className="p-3 text-slate-600">{c.area}</td>
                      <td className="p-3 text-center font-bold text-slate-800">{c.assigned}</td>
                      <td className="p-3 text-center font-bold text-emerald-600">{c.delivered}</td>
                      <td className="p-3 text-center font-bold text-rose-600">{c.failed}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            c.successRate >= 80
                              ? 'bg-emerald-100 text-emerald-800'
                              : c.successRate >= 50
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {c.successRate}%
                        </span>
                      </td>
                      <td className="p-3 text-center text-purple-700 font-semibold">
                        {c.activeReturns} قيد الاستلام / {c.completedReturns} منتهية
                      </td>
                      <td className="p-3 text-end font-mono font-bold text-emerald-800 text-sm">
                        {c.collectedCod.toLocaleString()} ج.م
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 7. Tab 4: Merchant Accounts & Statements Report */}
      {activeTab === 'merchants' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                كشف حسابات وحجم شحنات المتاجر الشريكة ({merchantReports.length} متجر)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 text-[11px] font-bold">
                    <th className="p-3 text-start">اسم المتجر</th>
                    <th className="p-3 text-start">المالك والهاتف</th>
                    <th className="p-3 text-center">إجمالي الشحنات</th>
                    <th className="p-3 text-center">مسلّمة</th>
                    <th className="p-3 text-center">متعثرة</th>
                    <th className="p-3 text-center">المرتجعات</th>
                    <th className="p-3 text-end">إجمالي قيمة الشحنات</th>
                    <th className="p-3 text-end">التحصيل المسلّم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {merchantReports.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-bold text-slate-900">{m.name}</td>
                      <td className="p-3">
                        <div className="text-slate-700">{m.owner}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{m.phone}</div>
                      </td>
                      <td className="p-3 text-center font-bold text-slate-800">{m.total}</td>
                      <td className="p-3 text-center font-bold text-emerald-600">{m.delivered}</td>
                      <td className="p-3 text-center font-bold text-rose-600">{m.failed}</td>
                      <td className="p-3 text-center text-purple-700 font-semibold">
                        {m.returnCount} ({m.returnAmount.toLocaleString()} ج.م)
                      </td>
                      <td className="p-3 text-end font-mono text-slate-700">
                        {m.totalCod.toLocaleString()} ج.م
                      </td>
                      <td className="p-3 text-end font-mono font-bold text-emerald-800 text-sm">
                        {m.deliveredCod.toLocaleString()} ج.م
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 8. Tab 5: Returns & Financial Impact Report */}
      {activeTab === 'returns' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500">إجمالي المرتجعات</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{returnMetrics.total}</p>
            </div>
            <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 shadow-xs">
              <span className="text-[11px] font-semibold text-purple-700">قيد الاستلام مع المندوب</span>
              <p className="text-2xl font-black text-purple-800 mt-1">{returnMetrics.withCourier}</p>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-xs">
              <span className="text-[11px] font-semibold text-emerald-700">تم إرجاعها للمتجر</span>
              <p className="text-2xl font-black text-emerald-800 mt-1">{returnMetrics.returned}</p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500">إجمالي مبالغ المرتجعات</span>
              <p className="text-xl font-black text-slate-900 mt-1 font-mono">
                {returnMetrics.totalAmount.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-xs">
              <span className="text-[11px] font-semibold text-emerald-700">قيمة المرتجعات المكتملة</span>
              <p className="text-xl font-black text-emerald-800 mt-1 font-mono">
                {returnMetrics.completedAmount.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
              </p>
            </div>
          </div>

          {/* Returns Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                سجل المرتجعات التفصيلي ({filteredReturns.length})
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 text-[11px] font-bold">
                    <th className="p-3 text-start">رقم الإرجاع</th>
                    <th className="p-3 text-start">العميل والهاتف</th>
                    <th className="p-3 text-start">المتجر</th>
                    <th className="p-3 text-start">المندوب</th>
                    <th className="p-3 text-start">السبب</th>
                    <th className="p-3 text-center">الحالة</th>
                    <th className="p-3 text-end">إجمالي المبلغ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReturns.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        لا توجد مرتجعات مسجلة في هذا النطاق
                      </td>
                    </tr>
                  ) : (
                    filteredReturns.map(r => {
                      const merchant = merchantsMap.get(r.merchant_id);
                      const courier = r.courier_id ? couriersMap.get(r.courier_id) : null;
                      return (
                        <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-mono font-bold text-purple-700">
                            #{r.return_number}
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{r.customer_name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{r.customer_phone}</div>
                          </td>
                          <td className="p-3 text-slate-700 font-semibold">
                            {merchant?.store_name || '-'}
                          </td>
                          <td className="p-3 text-slate-600">
                            {courier ? (
                              <span className="font-semibold text-emerald-800">
                                {courier.full_name}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">غير مسند</span>
                            )}
                          </td>
                          <td className="p-3 text-slate-700">
                            {r.return_reason}
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                r.status === 'returned'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : r.status === 'with_courier'
                                  ? 'bg-purple-100 text-purple-800'
                                  : r.status === 'cancelled'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="p-3 text-end font-mono font-bold text-slate-900">
                            {Number(r.total_return_amount).toLocaleString()} ج.م
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
