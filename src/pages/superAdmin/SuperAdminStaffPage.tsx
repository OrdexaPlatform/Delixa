import React, { useState, useEffect } from 'react';
import {
  Users2,
  Plus,
  Shield,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  KeyRound,
  RefreshCw,
  Loader2,
  Lock
} from 'lucide-react';
import { useSuperAdmin } from '../../contexts/SuperAdminContext';
import { PlatformAdmin, PlatformRole } from '../../types';
import { safeFetchJson } from '../../utils/apiClient';

interface SuperAdminStaffPageProps {
  onNavigate: (path: string) => void;
}

export const SuperAdminStaffPage: React.FC<SuperAdminStaffPageProps> = ({ onNavigate }) => {
  const { token, hasPermission, admin: currentAdmin } = useSuperAdmin();
  const [staff, setStaff] = useState<PlatformAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<PlatformAdmin | null>(null);
  const [form, setForm] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    phone: '',
    role: 'support' as PlatformRole,
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchStaff = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const { ok, data } = await safeFetchJson<any>('/api/super-admin/staff', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ok && data?.success) {
        setStaff(data.staff || []);
      }
    } catch (err) {
      console.error('Failed to load staff:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [token]);

  const handleOpenCreate = () => {
    setEditingStaff(null);
    setForm({
      username: '',
      password: '',
      full_name: '',
      email: '',
      phone: '',
      role: 'support',
      is_active: true,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (member: PlatformAdmin) => {
    setEditingStaff(member);
    const isActive = member.status ? member.status === 'active' : Boolean(member.is_active);
    setForm({
      username: member.username,
      password: '',
      full_name: member.full_name,
      email: member.email || '',
      phone: member.phone || '',
      role: member.role,
      is_active: isActive,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || (!editingStaff && !form.password) || !form.full_name) {
      setFormError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const url = editingStaff ? `/api/super-admin/staff/${editingStaff.id}` : '/api/super-admin/staff';
      const method = editingStaff ? 'PUT' : 'POST';

      const { ok, data, error } = await safeFetchJson<any>(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (ok && data?.success) {
        setIsModalOpen(false);
        await fetchStaff();
      } else {
        setFormError(data?.error || error || 'فشل حفظ بيانات الموظف');
      }
    } catch (err: any) {
      setFormError(err.message || 'حدث خطأ في الخادم');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من رغبتك في حذف حساب (${name})؟`)) return;

    try {
      const { ok, data, error } = await safeFetchJson<any>(`/api/super-admin/staff/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ok && data?.success) {
        await fetchStaff();
      } else {
        alert(data?.error || error || 'فشل حذف الحساب');
      }
    } catch (err) {
      alert('حدث خطأ في الخادم');
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">Super Admin</span>;
      case 'finance':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">مالية (Finance)</span>;
      case 'support':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">دعم فني (Support)</span>;
      case 'operations':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">عمليات (Ops)</span>;
      case 'viewer':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">مشاهد فقط (Viewer)</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-slate-300">{role}</span>;
    }
  };

  return (
    <div id="super-admin-staff-view" className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Users2 className="w-5 h-5 text-purple-400" />
            <h1 className="text-xl font-black text-white">فريق إدارة المنصة والصلاحيات (Staff & RBAC)</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            إضافة وتعديل حسابات المدراء الفرعيين، موظفي الدعم الفني، والإدارة المالية لمنصة DELIXA
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchStaff(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>

          {hasPermission('staff.edit') && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-600/30 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة مسؤول جديد</span>
            </button>
          )}
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            <span className="text-xs font-semibold">جاري جلب بيانات الفريق...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">المسؤول</th>
                  <th className="py-3.5 px-4">اسم المستخدم</th>
                  <th className="py-3.5 px-4">الدور والصلاحية</th>
                  <th className="py-3.5 px-4">الحالة</th>
                  <th className="py-3.5 px-4">آخر تسجيل دخول</th>
                  <th className="py-3.5 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {staff.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-800/40">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold">
                          {member.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{member.full_name}</span>
                            {member.is_primary && (
                              <span className="text-[10px] bg-amber-500/10 text-amber-400 px-1.5 py-0.2 rounded border border-amber-500/20 font-bold">
                                المالك الرئيسي
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">{member.email || member.phone || 'بدون اتصال'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300 font-semibold">{member.username}</td>
                    <td className="py-3.5 px-4">{getRoleBadge(member.role)}</td>
                    <td className="py-3.5 px-4">
                      {member.status === 'active' || member.is_active ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          مفعّل
                        </span>
                      ) : (
                        <span className="text-rose-400 font-bold flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" />
                          معطّل
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {member.last_login_at ? new Date(member.last_login_at).toLocaleString('ar-EG') : 'لم يسجل دخول بعد'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {hasPermission('staff.edit') && (
                          <button
                            onClick={() => handleOpenEdit(member)}
                            className="p-1.5 bg-slate-800 hover:bg-purple-600 text-slate-300 hover:text-white rounded-lg transition"
                            title="تعديل الحساب"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {hasPermission('staff.edit') && !member.is_primary && member.id !== currentAdmin?.id && (
                          <button
                            onClick={() => handleDelete(member.id, member.full_name)}
                            className="p-1.5 bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg transition"
                            title="حذف الحساب"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-white">
              {editingStaff ? `تعديل حساب: ${editingStaff.full_name}` : 'إضافة مسؤول جديد للمنصة'}
            </h3>

            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">الاسم بالكامل</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="محمد أحمد"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-hidden focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">اسم المستخدم (Username)</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="m.ahmed"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-hidden focus:border-purple-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">
                  كلمة المرور {editingStaff && '(اتركها فارغة إذا لم ترغب في التغيير)'}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-hidden focus:border-purple-500"
                  {...(!editingStaff ? { required: true } : {})}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="name@delixa.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">الدور والصلاحية</label>
                  <select
                    value={form.role}
                    disabled={editingStaff?.is_primary}
                    onChange={(e) => setForm({ ...form, role: e.target.value as PlatformRole })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-hidden focus:border-purple-500 disabled:opacity-50"
                  >
                    <option value="super_admin">Super Admin (كامل الصلاحيات)</option>
                    <option value="finance">Finance (المدفوعات والاشتراكات)</option>
                    <option value="support">Support (الدعم الفني والشركات)</option>
                    <option value="operations">Operations (التشغيل والمتابعة)</option>
                    <option value="viewer">Viewer (مشاهدة وقراءة فقط)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="staff-active-check"
                  checked={form.is_active}
                  disabled={editingStaff?.is_primary}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="rounded bg-slate-950 border-slate-800 text-purple-600 focus:ring-0 disabled:opacity-50"
                />
                <label htmlFor="staff-active-check" className="text-slate-300 font-bold">الحساب مفعّل ويمكنه تسجيل الدخول</label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700 transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>حفظ الحساب</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
