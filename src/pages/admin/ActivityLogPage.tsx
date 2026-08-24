import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { db } from '../../lib/db';
import { OrderEvent } from '../../types';
import {
  History,
  Search,
  Filter,
  Calendar,
  User,
  Truck,
  RotateCcw,
  Package,
  CheckCircle2,
  CalendarClock,
  XCircle,
  Clock,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

interface ActivityLogPageProps {
  navigate: (path: string) => void;
}

export const ActivityLogPage: React.FC<ActivityLogPageProps> = ({ navigate }) => {
  const { session } = useAuth();
  const { t, isRTL } = useLanguage();
  const companyId = session?.company?.id || '';

  const [events, setEvents] = useState<OrderEvent[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [actorFilter, setActorFilter] = useState<'all' | 'admin' | 'courier' | 'customer'>('all');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'yesterday' | 'last7days'>('all');

  const loadEvents = () => {
    if (!companyId) return;
    setLoading(true);
    const all = db.getAllOrderEvents(companyId, {
      actor: actorFilter !== 'all' ? actorFilter : undefined,
      eventType: eventTypeFilter !== 'all' ? eventTypeFilter : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      search: searchQuery.trim() || undefined,
    });
    setEvents(all);
    setLoading(false);
  };

  useEffect(() => {
    loadEvents();

    const handleSync = () => loadEvents();
    window.addEventListener('delixa-realtime-order-sync', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('delixa-realtime-order-sync', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [companyId, actorFilter, eventTypeFilter, startDate, endDate, searchQuery]);

  const handleDatePreset = (preset: 'all' | 'today' | 'yesterday' | 'last7days') => {
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
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  const getEventBadge = (type: OrderEvent['event_type']) => {
    switch (type) {
      case 'created':
        return { label: 'إنشاء شحنة', bg: 'bg-blue-100 text-blue-800' };
      case 'assigned':
        return { label: 'إسناد لمندوب', bg: 'bg-indigo-100 text-indigo-800' };
      case 'out_for_delivery':
        return { label: 'خرجت للتوصيل', bg: 'bg-amber-100 text-amber-800' };
      case 'delivered':
        return { label: 'تسليم ناجح', bg: 'bg-emerald-100 text-emerald-800' };
      case 'failed':
        return { label: 'تعثر التسليم', bg: 'bg-rose-100 text-rose-800' };
      case 'cancelled':
        return { label: 'إلغاء الشحنة', bg: 'bg-slate-100 text-slate-800' };
      case 'customer_confirmed':
        return { label: 'تأكيد من العميل', bg: 'bg-teal-100 text-teal-800' };
      case 'customer_rescheduled':
        return { label: 'تأجيل من العميل', bg: 'bg-amber-100 text-amber-800' };
      case 'customer_cancelled':
        return { label: 'إلغاء من العميل', bg: 'bg-rose-100 text-rose-800' };
      case 'return_created':
        return { label: 'إنشاء إرجاع', bg: 'bg-purple-100 text-purple-800' };
      case 'return_started':
        return { label: 'بدء نقل المرتجع', bg: 'bg-indigo-100 text-indigo-800' };
      case 'return_completed':
        return { label: 'اكتمال الإرجاع', bg: 'bg-emerald-100 text-emerald-800' };
      case 'return_cancelled':
        return { label: 'إلغاء الإرجاع', bg: 'bg-rose-100 text-rose-800' };
      default:
        return { label: type, bg: 'bg-slate-100 text-slate-700' };
    }
  };

  const getActorBadge = (actor: OrderEvent['actor'], actorName?: string) => {
    switch (actor) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
            <ShieldCheck className="w-3 h-3 text-blue-600" />
            <span>الإدارة {actorName ? `(${actorName})` : ''}</span>
          </span>
        );
      case 'courier':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            <Truck className="w-3 h-3 text-emerald-600" />
            <span>المندوب {actorName ? `(${actorName})` : ''}</span>
          </span>
        );
      case 'customer':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
            <User className="w-3 h-3 text-purple-600" />
            <span>العميل</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
            النظام
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* 1. Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
              <History className="w-6 h-6 text-indigo-600" />
              <span>سجل النشاطات وتدقيق العمليات (Audit Trail)</span>
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md">
              Live Event Stream
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            سجل دقيق ومفصل لجميع الأحداث، التغييرات، إسنادات المناديب واستجابات العملاء الفورية.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="activity-refresh-btn"
            onClick={loadEvents}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5 border border-slate-200 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {/* 2. Filters Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        
        {/* Date presets */}
        <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-slate-100 text-xs">
          <span className="font-bold text-slate-600 flex items-center gap-1.5 me-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span>التاريخ:</span>
          </span>

          {[
            { id: 'all', label: 'كافة الأوقات' },
            { id: 'today', label: 'اليوم' },
            { id: 'yesterday', label: 'أمس' },
            { id: 'last7days', label: 'آخر 7 أيام' },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => handleDatePreset(p.id as any)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                datePreset === p.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Filters grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          
          {/* Actor filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">الطرف المنفذ (Actor)</label>
            <select
              id="filter-actor"
              value={actorFilter}
              onChange={e => setActorFilter(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
            >
              <option value="all">الجميع (All Actors)</option>
              <option value="admin">الإدارة (Admin)</option>
              <option value="courier">مندوب التوصيل (Courier)</option>
              <option value="customer">العميل (Customer)</option>
            </select>
          </div>

          {/* Event type filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">نوع الحدث (Event Type)</label>
            <select
              id="filter-event-type"
              value={eventTypeFilter}
              onChange={e => setEventTypeFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
            >
              <option value="all">كافة أنواع الأحداث</option>
              <option value="created">إنشاء شحنة</option>
              <option value="assigned">إسناد لمندوب</option>
              <option value="delivered">تسليم ناجح</option>
              <option value="failed">تعثر التسليم</option>
              <option value="customer_confirmed">تأكيد العميل</option>
              <option value="customer_rescheduled">تأجيل العميل</option>
              <option value="customer_cancelled">إلغاء العميل</option>
              <option value="return_created">إنشاء إرجاع</option>
              <option value="return_completed">اكتمال الإرجاع</option>
            </select>
          </div>

          {/* Start date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">من تاريخ</label>
            <input
              type="date"
              id="activity-start-date"
              value={startDate}
              onChange={e => {
                setStartDate(e.target.value);
                setDatePreset('all');
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
            />
          </div>

          {/* Search query */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">البحث بالكلمة أو الرقم</label>
            <div className="relative">
              <input
                type="text"
                id="activity-search-input"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="رقم الشحنة، المرتجع، المندوب..."
                className="w-full ps-8 pe-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute start-2.5 top-3" />
            </div>
          </div>

        </div>

      </div>

      {/* 3. Events Timeline Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700">
            الأحداث المسجلة ({events.length})
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 text-[11px] font-bold">
                <th className="p-3 text-start">الوقت والتاريخ</th>
                <th className="p-3 text-start">الطرف المنفذ</th>
                <th className="p-3 text-start">نوع الحدث</th>
                <th className="p-3 text-start">تفاصيل النشاط</th>
                <th className="p-3 text-center">الربط التشغيلي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-400">
                    <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold">لا توجد أحداث مطابقة للفلاتر المحددة</p>
                  </td>
                </tr>
              ) : (
                events.map(ev => {
                  const badge = getEventBadge(ev.event_type);
                  return (
                    <tr key={ev.id} className="hover:bg-slate-50 transition-colors">
                      {/* Timestamp */}
                      <td className="p-3 font-mono text-slate-600 whitespace-nowrap">
                        <div className="font-bold text-slate-900">
                          {new Date(ev.created_at).toLocaleTimeString(isRTL ? 'ar-EG' : 'en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(ev.created_at).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                      </td>

                      {/* Actor */}
                      <td className="p-3 whitespace-nowrap">
                        {getActorBadge(ev.actor, ev.actor_name)}
                      </td>

                      {/* Event Type Badge */}
                      <td className="p-3 whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </td>

                      {/* Details description */}
                      <td className="p-3 font-medium text-slate-800 max-w-md leading-relaxed">
                        {ev.details}
                      </td>

                      {/* Operational Link */}
                      <td className="p-3 text-center whitespace-nowrap">
                        {ev.return_id ? (
                          <button
                            onClick={() => navigate('/returns')}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded border border-purple-200 transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>عرض في المرتجعات</span>
                          </button>
                        ) : ev.order_id ? (
                          <button
                            onClick={() => navigate('/orders')}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded border border-blue-200 transition-colors cursor-pointer"
                          >
                            <Package className="w-3 h-3" />
                            <span>عرض في الشحنات</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[10px]">-</span>
                        )}
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
  );
};
