import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../lib/db';
import { Merchant, MerchantStatus, Order, MerchantFinancialSummary } from '../../types';
import { Modal } from '../../components/common/Modal';
import { MerchantLedgerModal } from '../../components/merchants/MerchantLedgerModal';
import { 
  Store, 
  Plus, 
  Search, 
  Phone, 
  MapPin, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Eye,
  Package,
  Clock,
  DollarSign,
  User,
  FileText,
  CreditCard,
  Building2,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  Mail,
  Send
} from 'lucide-react';

export const MerchantsPage: React.FC = () => {
  const { session } = useAuth();
  const { t, isRTL } = useLanguage();
  const { showToast } = useToast();

  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [summariesMap, setSummariesMap] = useState<Record<string, MerchantFinancialSummary>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | MerchantStatus>('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);

  const [currentMerchant, setCurrentMerchant] = useState<Merchant | null>(null);

  // Form Fields
  const [storeName, setStoreName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<MerchantStatus>('active');

  const loadData = async () => {
    if (!session) return;
    const companyId = session.company.id;
    const mList = await db.getMerchants(companyId);
    const oList = await db.getOrders(companyId);
    const sList = await db.getAllMerchantsFinancialSummaries(companyId);
    
    const sMap: Record<string, MerchantFinancialSummary> = {};
    sList.forEach(s => { sMap[s.merchant_id] = s; });

    setMerchants(mList);
    setOrders(oList);
    setSummariesMap(sMap);
  };

  useEffect(() => {
    loadData();
  }, [session]);

  const resetForm = () => {
    setStoreName('');
    setBrandName('');
    setOwnerName('');
    setPhone('');
    setWhatsapp('');
    setEmail('');
    setAddress('');
    setNotes('');
    setStatus('active');
    setCurrentMerchant(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (m: Merchant, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentMerchant(m);
    setStoreName(m.store_name);
    setBrandName(m.brand_name || '');
    setOwnerName(m.owner_name);
    setPhone(m.phone);
    setWhatsapp(m.whatsapp || '');
    setEmail(m.email || '');
    setAddress(m.address);
    setNotes(m.notes || '');
    setStatus(m.status);
    setIsEditModalOpen(true);
  };

  const handleOpenDetails = (m: Merchant) => {
    setCurrentMerchant(m);
    setIsDetailsModalOpen(true);
  };

  const handleOpenLedger = (m: Merchant, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentMerchant(m);
    setIsLedgerModalOpen(true);
  };

  const handleOpenDelete = (m: Merchant, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentMerchant(m);
    setIsDeleteModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    if (!storeName.trim() || !ownerName.trim() || !phone.trim() || !address.trim()) {
      showToast('warning', isRTL ? 'يرجى استكمال الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    try {
      await db.createMerchant(session.company.id, {
        store_name: storeName.trim(),
        brand_name: brandName.trim() || undefined,
        owner_name: ownerName.trim(),
        phone: phone.trim(),
        whatsapp: whatsapp.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim(),
        notes: notes.trim(),
        status,
      });

      showToast('success', isRTL ? 'تمت إضافة المتجر بنجاح' : 'Merchant added successfully', storeName);
      setIsAddModalOpen(false);
      resetForm();
      loadData();
    } catch (err: any) {
      showToast('error', isRTL ? 'خطأ في إضافة المتجر' : 'Error adding merchant', err.message);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !currentMerchant) return;

    try {
      await db.updateMerchant(session.company.id, currentMerchant.id, {
        store_name: storeName.trim(),
        brand_name: brandName.trim() || undefined,
        owner_name: ownerName.trim(),
        phone: phone.trim(),
        whatsapp: whatsapp.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim(),
        notes: notes.trim(),
        status,
      });

      showToast('success', isRTL ? 'تم تعديل بيانات المتجر بنجاح' : 'Merchant updated successfully');
      setIsEditModalOpen(false);
      resetForm();
      loadData();
    } catch (err: any) {
      showToast('error', isRTL ? 'خطأ في التعديل' : 'Error updating', err.message);
    }
  };

  const handleDelete = async () => {
    if (!session || !currentMerchant) return;
    try {
      await db.deleteMerchant(session.company.id, currentMerchant.id);
      showToast('info', isRTL ? 'تم حذف المتجر من القائمة' : 'Merchant deleted');
      setIsDeleteModalOpen(false);
      setIsDetailsModalOpen(false);
      setCurrentMerchant(null);
      loadData();
    } catch (err: any) {
      showToast('error', isRTL ? 'تعذر الحذف' : 'Deletion error', err.message);
    }
  };

  const handleToggleStatus = async (m: Merchant, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!session) return;
    const newStatus: MerchantStatus = m.status === 'active' ? 'inactive' : 'active';
    await db.updateMerchant(session.company.id, m.id, { status: newStatus });
    showToast('info', isRTL ? `تم تغيير حالة المتجر إلى ${newStatus === 'active' ? 'نشط' : 'غير نشط'}` : `Merchant status updated to ${newStatus}`);
    loadData();
  };

  // Filter list
  const filteredMerchants = merchants.filter(m => {
    const matchesSearch =
      m.store_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.brand_name && m.brand_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      m.owner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.phone.includes(searchTerm) ||
      m.address.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Helper to get merchant specific orders
  const getMerchantOrders = (merchantId: string) => {
    return orders.filter(o => o.merchant_id === merchantId);
  };

  const getMerchantStats = (merchantId: string) => {
    const mOrders = getMerchantOrders(merchantId);
    const delivered = mOrders.filter(o => o.status === 'delivered').length;
    const totalCod = mOrders.reduce((sum, o) => sum + (Number(o.cod_amount) || 0), 0);
    return { total: mOrders.length, delivered, totalCod };
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <Store className="w-6 h-6 text-blue-600" />
            <span>{t.merchantsTitle}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            إدارة المتاجر وحسابات التجار المالية والتسويات وكشوف الحسابات
          </p>
        </div>

        <button
          id="add-merchant-btn"
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t.addMerchantButton}</span>
        </button>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        
        {/* Search Input */}
        <div className="relative w-full md:max-w-md">
          <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="search-merchants-input"
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={t.searchMerchantsPlaceholder}
            className="block w-full ps-10 pe-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all text-slate-900"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-bold text-slate-500 shrink-0">{t.merchantStatus}:</span>
          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                statusFilter === 'all' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.filterAll} ({merchants.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                statusFilter === 'active' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.filterActive} ({merchants.filter(m => m.status === 'active').length})
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                statusFilter === 'inactive' ? 'bg-white text-slate-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.filterInactive} ({merchants.filter(m => m.status === 'inactive').length})
            </button>
          </div>
        </div>

      </div>

      {/* Merchants Table / Grid */}
      {filteredMerchants.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <Store className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-900 text-base mb-1">{t.noMerchantsFound}</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
            {t.addFirstMerchant}
          </p>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
          >
            {t.addMerchantButton}
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-slate-500 font-bold">
                  <th className="py-3.5 px-4 text-start">{t.storeName}</th>
                  <th className="py-3.5 px-4 text-start">{t.ownerName}</th>
                  <th className="py-3.5 px-4 text-start">{t.phoneLabel}</th>
                  <th className="py-3.5 px-4 text-start">{t.ordersCount}</th>
                  <th className="py-3.5 px-4 text-start">صافي الحساب المالي</th>
                  <th className="py-3.5 px-4 text-start">{t.merchantStatus}</th>
                  <th className="py-3.5 px-4 text-end">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMerchants.map(m => {
                  const stats = getMerchantStats(m.id);
                  const finSummary = summariesMap[m.id];
                  const netBalance = finSummary ? finSummary.net_balance : 0;
                  return (
                    <tr 
                      key={m.id} 
                      onClick={() => handleOpenDetails(m)}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                    >
                      {/* Store Name & Brand preview */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                          <span>{m.store_name}</span>
                        </div>
                        {m.brand_name && (
                          <span className="text-[10px] text-blue-600 font-semibold block">
                            العلامة: {m.brand_name}
                          </span>
                        )}
                        {m.notes && (
                          <p className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5" title={m.notes}>
                            {m.notes}
                          </p>
                        )}
                      </td>

                      {/* Owner Name */}
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {m.owner_name}
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span dir="ltr">{m.phone}</span>
                        </div>
                      </td>

                      {/* Orders Count badge */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs border border-blue-100">
                          <Package className="w-3 h-3 text-blue-600" />
                          <span>{stats.total}</span>
                        </span>
                      </td>

                      {/* Net Financial Position Badge */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={(e) => handleOpenLedger(m, e)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-bold border transition-all ${
                            netBalance > 0
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                              : netBalance < 0
                              ? 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                          title="اضغط لفتح دفتر الحساب والتسويات"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>{netBalance.toLocaleString()} {t.currency}</span>
                          <span className="text-[10px] font-sans font-normal text-slate-500">
                            {netBalance > 0 ? '(مستحق)' : netBalance < 0 ? '(مديونية)' : '(مسوى)'}
                          </span>
                        </button>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={(e) => handleToggleStatus(m, e)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[11px] transition-colors cursor-pointer ${
                            m.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {m.status === 'active' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>{t.activeStatus}</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-slate-400" />
                              <span>{t.inactiveStatus}</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-end">
                        <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                          <button
                            id={`ledger-merchant-${m.id}`}
                            onClick={(e) => handleOpenLedger(m, e)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="دفتر الحسابات والتسويات المالية"
                          >
                            <CreditCard className="w-4 h-4" />
                          </button>
                          <button
                            id={`view-merchant-${m.id}`}
                            onClick={() => handleOpenDetails(m)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title={t.viewMerchant}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            id={`edit-merchant-${m.id}`}
                            onClick={(e) => handleOpenEdit(m, e)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title={t.editMerchant}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            id={`delete-merchant-${m.id}`}
                            onClick={(e) => handleOpenDelete(m, e)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title={t.deleteMerchant}
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

      {/* VIEW MERCHANT DETAILS MODAL */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title={currentMerchant?.store_name || t.merchantDetailsTitle}
        subtitle={t.merchantInfoSubtitle}
      >
        {currentMerchant && (
          <div className="space-y-5 text-xs">
            
            {/* Merchant Info Card */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                      <span>{currentMerchant.store_name}</span>
                      {currentMerchant.brand_name && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 rounded-md">
                          {currentMerchant.brand_name}
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-500">{t.ownerName}: {currentMerchant.owner_name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsDetailsModalOpen(false);
                      setIsLedgerModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-1.5"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>الحساب المالي والتسويات</span>
                  </button>

                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold self-start sm:self-auto ${
                    currentMerchant.status === 'active' 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    {currentMerchant.status === 'active' ? t.activeStatus : t.inactiveStatus}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700 pt-1">
                <div className="flex items-center gap-2 font-mono">
                  <Phone className="w-3.5 h-3.5 text-blue-600" />
                  <a href={`tel:${currentMerchant.phone}`} className="hover:underline font-bold text-slate-900" dir="ltr">
                    {currentMerchant.phone}
                  </a>
                </div>

                {currentMerchant.whatsapp && (
                  <div className="flex items-center gap-2 font-mono text-emerald-700">
                    <Send className="w-3.5 h-3.5 text-emerald-600" />
                    <span dir="ltr">{currentMerchant.whatsapp}</span>
                  </div>
                )}

                {currentMerchant.email && (
                  <div className="flex items-center gap-2 text-slate-700">
                    <Mail className="w-3.5 h-3.5 text-blue-600" />
                    <a href={`mailto:${currentMerchant.email}`} className="hover:underline text-slate-900 font-medium truncate">
                      {currentMerchant.email}
                    </a>
                  </div>
                )}

                <div className="flex items-start gap-2 col-span-1 sm:col-span-2">
                  <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <span>{currentMerchant.address}</span>
                </div>
              </div>

              {currentMerchant.notes && (
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-[11px]">
                  <strong>{t.notes}:</strong> {currentMerchant.notes}
                </div>
              )}
            </div>

            {/* Quick Metrics */}
            {(() => {
              const stats = getMerchantStats(currentMerchant.id);
              const fin = summariesMap[currentMerchant.id];
              return (
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                    <span className="text-[10px] text-blue-700 font-bold block">{t.ordersCount}</span>
                    <span className="text-xl font-black text-blue-900">{stats.total}</span>
                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <span className="text-[10px] text-emerald-700 font-bold block">{t.statusDelivered}</span>
                    <span className="text-xl font-black text-emerald-900">{stats.delivered}</span>
                  </div>
                  <div className="p-3 bg-slate-900 text-white rounded-xl">
                    <span className="text-[10px] text-slate-400 font-bold block">صافي الحساب المالي</span>
                    <span className="text-base font-black font-mono text-emerald-400">{fin ? Number(fin.net_balance).toLocaleString() : '0'} {t.currency}</span>
                  </div>
                </div>
              );
            })()}

            {/* Merchant Orders List */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Package className="w-4 h-4 text-blue-600" />
                <span>{t.merchantOrdersList}</span>
              </h4>

              {(() => {
                const mOrders = getMerchantOrders(currentMerchant.id);
                if (mOrders.length === 0) {
                  return (
                    <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-500">
                      {t.noMerchantOrders}
                    </div>
                  );
                }

                return (
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-start text-[11px]">
                      <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold sticky top-0">
                        <tr>
                          <th className="p-2 text-start">{t.orderNumber}</th>
                          <th className="p-2 text-start">{t.customerName}</th>
                          <th className="p-2 text-start">{t.codAmount}</th>
                          <th className="p-2 text-start">{t.orderStatus}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {mOrders.map(o => (
                          <tr key={o.id} className="hover:bg-slate-50">
                            <td className="p-2 font-mono font-bold text-blue-700">{o.order_number}</td>
                            <td className="p-2 text-slate-800 font-semibold">{o.customer_name}</td>
                            <td className="p-2 font-bold text-emerald-700">{Number(o.cod_amount).toLocaleString()} {t.currency}</td>
                            <td className="p-2">
                              <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                o.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                                o.status === 'out_for_delivery' ? 'bg-blue-100 text-blue-800' :
                                o.status === 'failed' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {o.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  handleOpenEdit(currentMerchant);
                }}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>{t.editMerchant}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDetailsModalOpen(false)}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer"
              >
                {t.close}
              </button>
            </div>

          </div>
        )}
      </Modal>

      {/* ADD MERCHANT MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={t.addMerchantButton}
        subtitle="سجل بيانات التاجر لتمكينه من إرسال الشحنات عبر شركتك"
      >
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t.storeName} *</label>
              <input
                type="text"
                required
                value={storeName}
                onChange={e => setStoreName(e.target.value)}
                placeholder="مثال: متجر النيل للملابس"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">اسم البراند / العلامة التجارية</label>
              <input
                type="text"
                value={brandName}
                onChange={e => setBrandName(e.target.value)}
                placeholder="مثال: NileWear"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t.ownerName} *</label>
              <input
                type="text"
                required
                value={ownerName}
                onChange={e => setOwnerName(e.target.value)}
                placeholder="اسم المسؤول"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t.phoneLabel} *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="01xxxxxxxxx"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 text-slate-900 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">رقم واتساب للتواصل المالي</label>
              <input
                type="tel"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                placeholder="01xxxxxxxxx"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 text-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">البريد الإلكتروني للتقارير</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="merchant@example.com"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">{t.addressLabel} (مقر الاستلام) *</label>
            <input
              type="text"
              required
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="عنوان المخزن / المقر للاستلام اليومي"
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 text-slate-900"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">{t.notes}</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="تعليمات الاستلام، مواعيد العمل، شروط خاصة..."
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 text-slate-900"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">{t.merchantStatus}</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as MerchantStatus)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
            >
              <option value="active">{t.activeStatus}</option>
              <option value="inactive">{t.inactiveStatus}</option>
            </select>
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
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm cursor-pointer"
            >
              {t.save}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT MERCHANT MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={t.editMerchant}
      >
        <form onSubmit={handleUpdate} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t.storeName} *</label>
              <input
                type="text"
                required
                value={storeName}
                onChange={e => setStoreName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">اسم البراند / العلامة التجارية</label>
              <input
                type="text"
                value={brandName}
                onChange={e => setBrandName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t.ownerName} *</label>
              <input
                type="text"
                required
                value={ownerName}
                onChange={e => setOwnerName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t.phoneLabel} *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 text-slate-900 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">رقم واتساب للتواصل المالي</label>
              <input
                type="tel"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 text-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">البريد الإلكتروني للتقارير</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">{t.addressLabel} *</label>
            <input
              type="text"
              required
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 text-slate-900"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">{t.notes}</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 text-slate-900"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">{t.merchantStatus}</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as MerchantStatus)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
            >
              <option value="active">{t.activeStatus}</option>
              <option value="inactive">{t.inactiveStatus}</option>
            </select>
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

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={t.deleteMerchant}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <p className="font-bold">{t.confirmDeleteMerchant}</p>
              <p className="text-[11px] mt-0.5">المتجر: {currentMerchant?.store_name}</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold text-xs cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-sm cursor-pointer"
            >
              {t.delete}
            </button>
          </div>
        </div>
      </Modal>

      {/* MERCHANT FINANCIAL LEDGER & SETTLEMENTS MODAL */}
      {session && (
        <MerchantLedgerModal
          isOpen={isLedgerModalOpen}
          onClose={() => setIsLedgerModalOpen(false)}
          merchant={currentMerchant}
          companyId={session.company.id}
          companyName={session.company.name}
          companyPhone={session.company.phone}
          companyAddress={session.company.address}
          companyLogoUrl={session.company.logo_url}
          onUpdate={loadData}
        />
      )}

    </div>
  );
};
