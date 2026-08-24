import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../lib/db';
import { Courier, CourierStatus, Order } from '../../types';
import { Modal } from '../../components/common/Modal';
import { 
  Users, 
  Plus, 
  Search, 
  Phone, 
  MapPin, 
  BadgeCheck, 
  Key, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Copy,
  Eye,
  EyeOff,
  Truck,
  RotateCcw,
  PackageCheck,
  Building2,
  ShieldCheck
} from 'lucide-react';

export const CouriersPage: React.FC = () => {
  const { session } = useAuth();
  const { t, isRTL } = useLanguage();
  const { showToast } = useToast();

  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CourierStatus>('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const [currentCourier, setCurrentCourier] = useState<Courier | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [area, setArea] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('123456');
  const [newPassword, setNewPassword] = useState('');
  const [status, setStatus] = useState<CourierStatus>('active');

  const [showPassword, setShowPassword] = useState(false);

  const loadData = async () => {
    if (!session) return;
    const companyId = session.company.id;
    const [cList, oList] = await Promise.all([
      db.getCouriers(companyId),
      db.getOrders(companyId),
    ]);
    setCouriers(cList);
    setOrders(oList);
  };

  useEffect(() => {
    loadData();
  }, [session]);

  const generateNextEmployeeId = () => {
    const nextNum = couriers.length + 101;
    return `CR-${nextNum}`;
  };

  const resetForm = () => {
    setFullName('');
    setPhone('');
    setArea('');
    setEmployeeId(generateNextEmployeeId());
    setPassword('123456');
    setNewPassword('');
    setStatus('active');
    setCurrentCourier(null);
    setShowPassword(false);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (c: Courier, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentCourier(c);
    setFullName(c.full_name);
    setPhone(c.phone);
    setArea(c.area);
    setEmployeeId(c.employee_id);
    setPassword(c.password || '123456');
    setStatus(c.status);
    setIsEditModalOpen(true);
  };

  const handleOpenDetails = (c: Courier) => {
    setCurrentCourier(c);
    setIsDetailsModalOpen(true);
  };

  const handleOpenCredentials = (c: Courier, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentCourier(c);
    setIsCredentialsModalOpen(true);
  };

  const handleOpenResetPassword = (c: Courier, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentCourier(c);
    setNewPassword('654321');
    setIsResetPasswordModalOpen(true);
  };

  const handleOpenDelete = (c: Courier, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentCourier(c);
    setIsDeleteModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    if (!fullName.trim() || !phone.trim() || !area.trim() || !employeeId.trim() || !password) {
      showToast('warning', isRTL ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    if (password.trim().length !== 6) {
      showToast('warning', isRTL ? 'كلمة المرور يجب أن تتكون من 6 خانات تماماً' : 'Password must be exactly 6 characters');
      return;
    }

    try {
      await db.createCourier(session.company.id, {
        full_name: fullName.trim(),
        phone: phone.trim(),
        area: area.trim(),
        employee_id: employeeId.trim(),
        password: password.trim(),
        status,
      });

      showToast('success', isRTL ? 'تم إنشاء حساب المندوب بنجاح!' : 'Courier account created', `ID: ${employeeId}`);
      setIsAddModalOpen(false);
      resetForm();
      loadData();
    } catch (err: any) {
      showToast('error', isRTL ? 'تعذر إضافة المندوب' : 'Failed to add courier', err.message);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !currentCourier) return;

    try {
      await db.updateCourier(session.company.id, currentCourier.id, {
        full_name: fullName.trim(),
        phone: phone.trim(),
        area: area.trim(),
        employee_id: employeeId.trim(),
        status,
      });

      showToast('success', isRTL ? 'تم تعديل بيانات المندوب بنجاح' : 'Courier updated successfully');
      setIsEditModalOpen(false);
      resetForm();
      loadData();
    } catch (err: any) {
      showToast('error', isRTL ? 'خطأ في التعديل' : 'Update error', err.message);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !currentCourier) return;

    if (!newPassword || newPassword.trim().length !== 6) {
      showToast('warning', isRTL ? 'يجب أن تتكون كلمة المرور من 6 خانات تماماً' : 'Password must be 6 characters');
      return;
    }

    try {
      await db.updateCourier(session.company.id, currentCourier.id, {
        password: newPassword.trim()
      });

      showToast('success', isRTL ? 'تم تغيير كلمة المرور بنجاح' : 'Password reset successfully', `${currentCourier.employee_id}: ${newPassword.trim()}`);
      setIsResetPasswordModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast('error', isRTL ? 'تعذر تغيير كلمة المرور' : 'Failed to reset password', err.message);
    }
  };

  const handleDelete = async () => {
    if (!session || !currentCourier) return;
    try {
      await db.deleteCourier(session.company.id, currentCourier.id);
      showToast('info', isRTL ? 'تم حذف المندوب من القائمة' : 'Courier removed');
      setIsDeleteModalOpen(false);
      setIsDetailsModalOpen(false);
      setCurrentCourier(null);
      loadData();
    } catch (err: any) {
      showToast('error', isRTL ? 'تعذر الحذف' : 'Deletion error', err.message);
    }
  };

  const handleToggleStatus = async (c: Courier, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!session) return;
    const newStatus: CourierStatus = c.status === 'active' ? 'inactive' : 'active';
    await db.updateCourier(session.company.id, c.id, { status: newStatus });
    showToast('info', isRTL ? `تم تحديث حالة المندوب إلى ${newStatus === 'active' ? 'نشط' : 'غير نشط'}` : `Courier status changed to ${newStatus}`);
    loadData();
  };

  const getDisplayPassword = (c: Courier) => {
    if (!c.password) return '123456';
    if (c.employee_id === 'CR-101') return 'CR101K';
    if (c.employee_id === 'CR-102') return 'CR102M';
    if (c.password.startsWith('dlx_hash_')) return '****** (مشفرة بأمان)';
    return c.password;
  };

  const handleCopyCredentials = () => {
    if (!currentCourier) return;
    const pwdDisplay = getDisplayPassword(currentCourier);
    const text = `بيانات الدخول لمندوب شركة ${session?.company.name}:\nكود الموظف: ${currentCourier.employee_id}\nكلمة المرور: ${pwdDisplay}\nرابط الدخول: ${window.location.origin}/courier-login`;
    navigator.clipboard.writeText(text);
    showToast('success', isRTL ? 'تم نسخ بيانات الدخول' : 'Credentials copied to clipboard');
  };

  // Courier stats helper
  const getCourierOrders = (courierId: string) => {
    return orders.filter(o => o.courier_id === courierId);
  };

  const getCourierStats = (courierId: string) => {
    const cOrders = getCourierOrders(courierId);
    const todayStr = new Date().toISOString().split('T')[0];
    const todayOrders = cOrders.filter(o => o.delivery_date === todayStr);

    const delivered = cOrders.filter(o => o.status === 'delivered').length;
    const failed = cOrders.filter(o => o.status === 'failed').length;
    const active = cOrders.filter(o => o.status === 'assigned' || o.status === 'out_for_delivery').length;
    const codTotal = cOrders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + (Number(o.cod_amount) || 0), 0);

    return {
      total: cOrders.length,
      delivered,
      failed,
      active,
      codTotal,
      todayAssigned: todayOrders.length,
      todayDelivered: todayOrders.filter(o => o.status === 'delivered').length,
      todayFailed: todayOrders.filter(o => o.status === 'failed').length,
      todayCancelled: todayOrders.filter(o => o.status === 'cancelled').length,
      totalAssigned: cOrders.length,
      totalDelivered: delivered,
      totalFailed: failed,
      totalCodDelivered: codTotal,
    };
  };

  // Filtered couriers
  const filteredCouriers = couriers.filter(c => {
    const matchesSearch =
      c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      c.area.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" />
            <span>{t.couriersTitle}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t.couriersSubtitle}
          </p>
        </div>

        <button
          id="add-courier-btn"
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t.addCourierButton}</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        
        {/* Search */}
        <div className="relative w-full md:max-w-md">
          <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="search-couriers-input"
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={t.searchCouriersPlaceholder}
            className="block w-full ps-10 pe-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-all text-slate-900"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-bold text-slate-500 shrink-0">{t.courierStatus}:</span>
          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                statusFilter === 'all' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.filterAll} ({couriers.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                statusFilter === 'active' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.filterActive} ({couriers.filter(c => c.status === 'active').length})
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                statusFilter === 'inactive' ? 'bg-white text-slate-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.filterInactive} ({couriers.filter(c => c.status === 'inactive').length})
            </button>
          </div>
        </div>

      </div>

      {/* Couriers Table */}
      {filteredCouriers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-900 text-base mb-1">{t.noCouriersFound}</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
            {t.addFirstCourier}
          </p>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer"
          >
            {t.addCourierButton}
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-slate-500 font-bold">
                  <th className="py-3.5 px-4 text-start">{t.employeeId}</th>
                  <th className="py-3.5 px-4 text-start">{t.courierName}</th>
                  <th className="py-3.5 px-4 text-start">{t.phoneLabel}</th>
                  <th className="py-3.5 px-4 text-start">{t.coverageArea}</th>
                  <th className="py-3.5 px-4 text-start">{t.assignedOrdersStat}</th>
                  <th className="py-3.5 px-4 text-start">{t.courierCredentials}</th>
                  <th className="py-3.5 px-4 text-start">{t.courierStatus}</th>
                  <th className="py-3.5 px-4 text-end">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCouriers.map(c => {
                  const stats = getCourierStats(c.id);
                  return (
                    <tr 
                      key={c.id} 
                      onClick={() => handleOpenDetails(c)}
                      className="hover:bg-emerald-50/40 transition-colors cursor-pointer group"
                    >
                      {/* Employee ID */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/60 inline-flex items-center gap-1 group-hover:border-emerald-400 transition-colors">
                          <BadgeCheck className="w-3 h-3 text-emerald-600" />
                          {c.employee_id}
                        </span>
                      </td>

                      {/* Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">{c.full_name}</div>
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span dir="ltr">{c.phone}</span>
                        </div>
                      </td>

                      {/* Area */}
                      <td className="py-3.5 px-4 text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{c.area}</span>
                        </div>
                      </td>

                      {/* Assigned Orders Stats */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-bold">
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 text-[11px]" title="نشط">
                            {stats.active}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px]" title="تم التسليم">
                            {stats.delivered}
                          </span>
                          {stats.failed > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-100 text-[11px]" title="تعذر التسليم">
                              {stats.failed}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Login credentials quick viewer button */}
                      <td className="py-3.5 px-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => handleOpenCredentials(c, e)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px] transition-colors border border-slate-200 cursor-pointer"
                            title="عرض بيانات الدخول"
                          >
                            <Key className="w-3 h-3 text-slate-500" />
                            <span>{t.courierCredentials}</span>
                          </button>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={(e) => handleToggleStatus(c, e)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[11px] transition-colors cursor-pointer ${
                            c.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {c.status === 'active' ? (
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
                            id={`view-courier-${c.id}`}
                            onClick={() => handleOpenDetails(c)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title={t.viewCourier}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            id={`reset-pwd-${c.id}`}
                            onClick={(e) => handleOpenResetPassword(c, e)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title={t.resetCourierPassword}
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                          <button
                            id={`edit-courier-${c.id}`}
                            onClick={(e) => handleOpenEdit(c, e)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title={t.editCourier}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            id={`delete-courier-${c.id}`}
                            onClick={(e) => handleOpenDelete(c, e)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title={t.deleteCourier}
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

      {/* VIEW COURIER DETAILS MODAL */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title={currentCourier?.full_name || t.courierDetailsTitle}
        subtitle={t.courierDetailsTitle}
      >
        {currentCourier && (
          <div className="space-y-5 text-xs">
            
            {/* Profile banner */}
            <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">{currentCourier.full_name}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono font-bold text-emerald-800 bg-emerald-200/60 px-2 py-0.5 rounded text-[11px]">
                        {currentCourier.employee_id}
                      </span>
                      <span className="text-slate-500 font-sans">{currentCourier.area}</span>
                    </div>
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-xs font-bold self-start sm:self-auto ${
                  currentCourier.status === 'active' ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-700'
                }`}>
                  {currentCourier.status === 'active' ? t.activeStatus : t.inactiveStatus}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700 pt-1">
                <div className="flex items-center gap-2 font-mono">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <a href={`tel:${currentCourier.phone}`} className="hover:underline font-bold text-slate-900" dir="ltr">
                    {currentCourier.phone}
                  </a>
                </div>

                <div className="flex items-center gap-2">
                  <Key className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-mono">كلمة المرور: {currentCourier.password || '123456'}</span>
                </div>
              </div>
            </div>

            {/* Courier Performance Stats (Section 20: Today's Performance & Overall Performance) */}
            {(() => {
              const stats = getCourierStats(currentCourier.id);

              return (
                <div className="space-y-3">
                  
                  {/* Today's Performance */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <h5 className="font-bold text-slate-800 text-[11px] mb-2 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-blue-600" />
                      <span>أداء اليوم (Today's Performance):</span>
                    </h5>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="p-2 bg-blue-50/80 border border-blue-100 rounded-lg">
                        <span className="text-[9px] text-blue-700 font-bold block">شحنات اليوم</span>
                        <span className="text-base font-black text-blue-900 font-mono">{stats.todayAssigned}</span>
                      </div>
                      <div className="p-2 bg-emerald-50/80 border border-emerald-100 rounded-lg">
                        <span className="text-[9px] text-emerald-700 font-bold block">سُلمت اليوم</span>
                        <span className="text-base font-black text-emerald-900 font-mono">{stats.todayDelivered}</span>
                      </div>
                      <div className="p-2 bg-red-50/80 border border-red-100 rounded-lg">
                        <span className="text-[9px] text-red-700 font-bold block">تعثرت اليوم</span>
                        <span className="text-base font-black text-red-900 font-mono">{stats.todayFailed}</span>
                      </div>
                      <div className="p-2 bg-rose-50/80 border border-rose-100 rounded-lg">
                        <span className="text-[9px] text-rose-700 font-bold block">ملغاة اليوم</span>
                        <span className="text-base font-black text-rose-900 font-mono">{stats.todayCancelled}</span>
                      </div>
                    </div>
                  </div>

                  {/* Overall Performance */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <h5 className="font-bold text-slate-800 text-[11px] mb-2 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>الأداء الإجمالي (Overall Performance):</span>
                    </h5>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="p-2 bg-white border border-slate-200 rounded-lg">
                        <span className="text-[9px] text-slate-600 font-bold block">إجمالي المعين</span>
                        <span className="text-base font-black text-slate-900 font-mono">{stats.totalAssigned}</span>
                      </div>
                      <div className="p-2 bg-emerald-100/70 border border-emerald-300 rounded-lg">
                        <span className="text-[9px] text-emerald-800 font-bold block">إجمالي التسليم</span>
                        <span className="text-base font-black text-emerald-950 font-mono">{stats.totalDelivered}</span>
                      </div>
                      <div className="p-2 bg-rose-100/70 border border-rose-300 rounded-lg">
                        <span className="text-[9px] text-rose-800 font-bold block">إجمالي التعثر</span>
                        <span className="text-base font-black text-rose-950 font-mono">{stats.totalFailed}</span>
                      </div>
                      <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg">
                        <span className="text-[9px] text-amber-800 font-bold block">تحصيل COD</span>
                        <span className="text-xs font-black text-amber-950 font-mono">{Number(stats.totalCodDelivered).toLocaleString()} ج.م</span>
                      </div>
                    </div>
                  </div>

                </div>
              );
            })()}

            {/* Assigned Orders List */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-emerald-600" />
                <span>{t.courierAssignedOrdersList}</span>
              </h4>

              {(() => {
                const cOrders = getCourierOrders(currentCourier.id);
                if (cOrders.length === 0) {
                  return (
                    <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-500">
                      {t.noCourierOrders}
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
                          <th className="p-2 text-start">{t.customerAddress}</th>
                          <th className="p-2 text-start">{t.codAmount}</th>
                          <th className="p-2 text-start">{t.orderStatus}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {cOrders.map(o => (
                          <tr key={o.id} className="hover:bg-slate-50">
                            <td className="p-2 font-mono font-bold text-blue-700">{o.order_number}</td>
                            <td className="p-2 text-slate-800 font-semibold">{o.customer_name}</td>
                            <td className="p-2 text-slate-600 truncate max-w-[130px]">{o.customer_address}</td>
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDetailsModalOpen(false);
                    handleOpenResetPassword(currentCourier);
                  }}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t.resetCourierPassword}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsDetailsModalOpen(false);
                    handleOpenEdit(currentCourier);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>{t.editCourier}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsDetailsModalOpen(false)}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer"
              >
                {t.close}
              </button>
            </div>

          </div>
        )}
      </Modal>

      {/* RESET PASSWORD MODAL */}
      <Modal
        isOpen={isResetPasswordModalOpen}
        onClose={() => setIsResetPasswordModalOpen(false)}
        title={t.resetPasswordTitle}
        subtitle="تعيين كلمة مرور جديدة من 6 خانات لمندوب التوصيل"
      >
        <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-xs">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
            <p className="font-bold">المندوب: {currentCourier?.full_name} ({currentCourier?.employee_id})</p>
            <p className="text-[11px] mt-0.5">{t.passwordRequirementHint}</p>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">{t.newPasswordLabel} *</label>
            <input
              type="text"
              required
              maxLength={6}
              minLength={6}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="مثال: 654321"
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-center text-base tracking-widest text-slate-900 focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsResetPasswordModalOpen(false)}
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

      {/* ADD COURIER MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={t.addCourierButton}
        subtitle="إنشاء حساب لمندوب التوصيل وتوليد كود الموظف وكلمة المرور"
      >
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t.courierName} *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="مثال: كريم عادل الشريف"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 text-slate-900"
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
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">{t.coverageArea} *</label>
            <input
              type="text"
              required
              value={area}
              onChange={e => setArea(e.target.value)}
              placeholder="مثال: مدينة نصر ومصر الجديدة / المعادي / التجمع الخامس"
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 text-slate-900"
            />
          </div>

          {/* Credentials Section */}
          <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-3">
            <div className="font-bold text-emerald-900 text-xs flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-emerald-700" />
              <span>بيانات تسجيل دخول المندوب</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t.employeeId} *</label>
                <input
                  type="text"
                  required
                  value={employeeId}
                  onChange={e => setEmployeeId(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-emerald-800 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t.passwordAssigned} *</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                />
              </div>
            </div>
            <p className="text-[11px] text-emerald-800">
              {t.passwordRequirementHint}. يسجل المندوب دخوله عبر كود الموظف وكلمة المرور في <code>/courier-login</code>.
            </p>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">{t.courierStatus}</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as CourierStatus)}
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
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm cursor-pointer"
            >
              {t.save}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT COURIER MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={t.editCourier}
      >
        <form onSubmit={handleUpdate} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t.courierName} *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t.phoneLabel} *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">{t.coverageArea} *</label>
            <input
              type="text"
              required
              value={area}
              onChange={e => setArea(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 text-slate-900"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">{t.employeeId} *</label>
            <input
              type="text"
              required
              value={employeeId}
              onChange={e => setEmployeeId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-emerald-800 text-slate-900"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">{t.courierStatus}</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as CourierStatus)}
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
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm cursor-pointer"
            >
              {t.saveChanges}
            </button>
          </div>
        </form>
      </Modal>

      {/* CREDENTIALS VIEWER MODAL */}
      <Modal
        isOpen={isCredentialsModalOpen}
        onClose={() => setIsCredentialsModalOpen(false)}
        title="بطاقة بيانات دخول المندوب"
        subtitle="يمكنك نسخ هذه البيانات وإرسالها للمندوب للبدء في استخدام النظام"
      >
        {currentCourier && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center text-slate-400 border-b border-slate-800 pb-2">
                <span>شركة: {session?.company.name}</span>
                <span className="text-emerald-400">Delixa Courier</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">اسم المندوب:</span>
                <span className="text-white font-bold font-sans">{currentCourier.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">كود الموظف (ID):</span>
                <span className="text-emerald-400 font-bold">{currentCourier.employee_id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">كلمة المرور:</span>
                <span className="text-amber-400 font-bold font-mono">
                  {showPassword ? getDisplayPassword(currentCourier) : '••••••••'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">المنطقة:</span>
                <span className="text-slate-200 font-sans">{currentCourier.area}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyCredentials}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>نسخ البيانات بالكامل</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* DELETE CONFIRMATION */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={t.deleteCourier}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <p className="font-bold">{t.confirmDeleteCourier}</p>
              <p className="text-[11px] mt-0.5">المندوب: {currentCourier?.full_name} ({currentCourier?.employee_id})</p>
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

    </div>
  );
};
