import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { db } from '../../lib/db';
import { AppNotification } from '../../types';
import {
  Bell,
  Check,
  CheckCircle2,
  CalendarClock,
  XCircle,
  RotateCcw,
  Truck,
  Package,
  CheckCheck,
  ExternalLink,
  Trash2,
  Clock,
  Sparkles,
} from 'lucide-react';

interface NotificationCenterProps {
  navigate: (path: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ navigate }) => {
  const { session } = useAuth();
  const { isRTL } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAdmin = session?.profile?.role === 'admin';
  const courierId = session?.courier?.id;
  const companyId = session?.company?.id;

  const loadNotifications = async () => {
    if (!companyId) return;
    try {
      const items = await db.getNotifications(companyId, {
        role: isAdmin ? 'admin' : 'courier',
        courierId: courierId,
      });
      setNotifications(items);
    } catch (err) {
      console.error('Error loading notifications:', err);
    }
  };

  useEffect(() => {
    loadNotifications();

    const handleSync = () => {
      loadNotifications();
    };

    window.addEventListener('delixa-realtime-order-sync', handleSync);
    window.addEventListener('storage', handleSync);

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('delixa_orders_channel');
      channel.onmessage = () => {
        loadNotifications();
      };
    } catch {
      // BroadcastChannel unsupported fallback
    }

    return () => {
      window.removeEventListener('delixa-realtime-order-sync', handleSync);
      window.removeEventListener('storage', handleSync);
      if (channel) {
        channel.close();
      }
    };
  }, [companyId, isAdmin, courierId]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const isItemRead = (n: AppNotification) => n.read || n.is_read;

  const unreadCount = notifications.filter(n => !isItemRead(n)).length;
  const displayedNotifications = notifications.filter(n => {
    if (filter === 'unread') return !isItemRead(n);
    return true;
  });

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!companyId) return;
    await db.markNotificationAsRead(companyId, id);
    loadNotifications();
  };

  const handleMarkAllAsRead = async () => {
    if (!companyId) return;
    await db.markAllNotificationsAsRead(companyId, {
      role: isAdmin ? 'admin' : 'courier',
      courierId: courierId,
    });
    loadNotifications();
  };

  const handleNotificationClick = async (item: AppNotification) => {
    if (!companyId) return;
    if (!isItemRead(item)) {
      await db.markNotificationAsRead(companyId, item.id);
      loadNotifications();
    }
    setIsOpen(false);

    if (item.return_id) {
      if (isAdmin) {
        navigate(`/returns?highlight=${item.return_id}`);
      } else {
        navigate(`/courier/returns`);
      }
    } else if (item.order_id) {
      if (isAdmin) {
        navigate(`/orders?highlight=${item.order_id}`);
      } else {
        navigate(`/courier/orders`);
      }
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return isRTL ? 'الآن' : 'Just now';
      if (diffMins < 60) return isRTL ? `منذ ${diffMins} دقيقة` : `${diffMins}m ago`;
      if (diffHours < 24) return isRTL ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`;
      if (diffDays === 1) return isRTL ? 'أمس' : 'Yesterday';
      return date.toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const getNotificationIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'customer_confirmed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'customer_rescheduled':
        return <CalendarClock className="w-4 h-4 text-amber-600" />;
      case 'customer_cancelled':
        return <XCircle className="w-4 h-4 text-rose-600" />;
      case 'return_created':
        return <RotateCcw className="w-4 h-4 text-purple-600" />;
      case 'return_assigned':
        return <Truck className="w-4 h-4 text-indigo-600" />;
      case 'return_completed':
        return <CheckCheck className="w-4 h-4 text-emerald-600" />;
      case 'order_assigned':
        return <Package className="w-4 h-4 text-blue-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-600" />;
    }
  };

  const getNotificationBadgeClass = (type: AppNotification['type']) => {
    switch (type) {
      case 'customer_confirmed':
        return 'bg-emerald-50 border-emerald-200 text-emerald-700';
      case 'customer_rescheduled':
        return 'bg-amber-50 border-amber-200 text-amber-700';
      case 'customer_cancelled':
        return 'bg-rose-50 border-rose-200 text-rose-700';
      case 'return_created':
      case 'return_assigned':
      case 'return_completed':
        return 'bg-purple-50 border-purple-200 text-purple-700';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-700';
    }
  };

  if (!session) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        id="notification-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all border border-slate-200"
        title={isRTL ? 'مركز الإشعارات التفاعلي' : 'Notifications Center'}
        aria-label="Open notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span
            id="notification-badge-count"
            className="absolute -top-1 -end-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center shadow-sm animate-pulse"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          id="notification-panel"
          className="absolute end-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 py-0 z-50 animate-in fade-in zoom-in-95 overflow-hidden"
        >
          {/* Header */}
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  {isRTL ? 'مركز الإشعارات المباشرة' : 'Notifications'}
                </h4>
                <p className="text-[10px] text-slate-500">
                  {unreadCount > 0
                    ? isRTL
                      ? `لديك ${unreadCount} إشعار غير مقروء`
                      : `${unreadCount} unread notification(s)`
                    : isRTL
                    ? 'جميع الإشعارات مقروءة'
                    : 'All notifications read'}
                </p>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                id="mark-all-read-btn"
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded-md transition-colors"
                title={isRTL ? 'تحديد الكل كمقروء' : 'Mark all as read'}
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>{isRTL ? 'قراءة الكل' : 'Mark all read'}</span>
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50/50 border-b border-slate-100 text-xs">
            <button
              id="filter-notifications-all"
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              {isRTL ? 'الكل' : 'All'} ({notifications.length})
            </button>
            <button
              id="filter-notifications-unread"
              onClick={() => setFilter('unread')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                filter === 'unread'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              {isRTL ? 'غير المقروءة' : 'Unread'} ({unreadCount})
            </button>
          </div>

          {/* List Content */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {displayedNotifications.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-2">
                  <Bell className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-700">
                  {filter === 'unread'
                    ? isRTL
                      ? 'لا توجد إشعارات غير مقروءة'
                      : 'No unread notifications'
                    : isRTL
                    ? 'لا توجد إشعارات حالياً'
                    : 'No notifications yet'}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {isRTL
                    ? 'ستظهر هنا التحديثات المباشرة عند تأكيد العملاء أو طلبات الإرجاع'
                    : 'Realtime updates will appear here automatically'}
                </p>
              </div>
            ) : (
              displayedNotifications.map(item => (
                <div
                  key={item.id}
                  id={`notification-item-${item.id}`}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-3 text-start hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 items-start group relative ${
                    !item.is_read ? 'bg-blue-50/40' : 'bg-white'
                  }`}
                >
                  {/* Icon Indicator */}
                  <div
                    className={`mt-0.5 w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${getNotificationBadgeClass(
                      item.type
                    )}`}
                  >
                    {getNotificationIcon(item.type)}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h5 className={`text-xs truncate ${!item.is_read ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                        {item.title}
                      </h5>
                      <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {formatRelativeTime(item.created_at)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed line-clamp-2">
                      {item.message}
                    </p>

                    <div className="mt-1.5 flex items-center justify-between">
                      {item.order_number && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                          #{item.order_number}
                        </span>
                      )}
                      {item.return_number && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
                          #{item.return_number}
                        </span>
                      )}

                      {!item.is_read && (
                        <button
                          onClick={(e) => handleMarkAsRead(item.id, e)}
                          className="ms-auto text-[10px] font-semibold text-slate-500 hover:text-blue-600 flex items-center gap-0.5 p-0.5"
                          title={isRTL ? 'تحديد كمقروء' : 'Mark read'}
                        >
                          <Check className="w-3 h-3" />
                          <span>{isRTL ? 'تعيين كمقروء' : 'Read'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Unread blue dot */}
                  {!item.is_read && (
                    <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5"></span>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {isAdmin && (
            <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-center">
              <button
                id="view-all-activity-link"
                onClick={() => {
                  setIsOpen(false);
                  navigate('/activity');
                }}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 hover:underline"
              >
                <span>{isRTL ? 'عرض سجل النشاطات والأحداث الكامل' : 'View Full Activity Audit Log'}</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
