'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar, Footer } from '@/components';
import { createClient } from '@/lib/supabase/client';
import type { NotificationRecord } from '@/types';
import {
  Bell,
  CheckCircle2,
  Clock,
  ArrowRight,
  Flame,
  Truck,
  CreditCard,
  AlertTriangle,
  Sparkles,
  CheckCheck,
} from 'lucide-react';

export default function NotificationsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterUnread, setFilterUnread] = useState(false);

  useEffect(() => {
    async function loadNotifications() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login?redirect=/notifications');
        return;
      }
      setCurrentUser(user);

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) {
        setNotifications(data as any);
      }
      setLoading(false);
    }

    loadNotifications();

    // Subscribe to realtime notifications for current user
    const channel = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const newNotif = payload.new as NotificationRecord;
          setNotifications((prev) => [newNotif, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router, supabase]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await supabase.from('notifications').update({ read: true }).eq('id', id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch {
      // Handled
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUser) return;
    try {
      await supabase.from('notifications').update({ read: true }).eq('user_id', currentUser.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // Handled
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'auction_won':
        return <Sparkles className="w-5 h-5 text-lime" />;
      case 'outbid':
        return <Flame className="w-5 h-5 text-coral" />;
      case 'payment_required':
        return <Clock className="w-5 h-5 text-coral" />;
      case 'payment_confirmed':
        return <CreditCard className="w-5 h-5 text-lime" />;
      case 'order_dispatched':
      case 'order_delivered':
        return <Truck className="w-5 h-5 text-blue-400" />;
      case 'dispute_raised':
        return <AlertTriangle className="w-5 h-5 text-coral" />;
      default:
        return <Bell className="w-5 h-5 text-secondaryText" />;
    }
  };

  const filteredNotifications = filterUnread
    ? notifications.filter((n) => !n.read)
    : notifications;

  return (
    <div className="min-h-screen bg-background text-primaryText flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-surface-border">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-lime uppercase tracking-wider mb-1">
              <Bell className="w-4 h-4" />
              <span>Activity & Alerts</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Notifications
            </h1>
            <p className="text-sm text-secondaryText mt-1">
              Real-time updates on your bids, auction settlements, order fulfillment, and payments.
            </p>
          </div>

          {notifications.some((n) => !n.read) && (
            <button
              onClick={handleMarkAllAsRead}
              className="inline-flex items-center gap-1.5 rounded-full border border-surface-border bg-surface px-4 py-2 text-xs font-bold text-secondaryText hover:text-white hover:border-lime/40 transition-all self-start sm:self-auto"
            >
              <CheckCheck className="w-3.5 h-3.5 text-lime" />
              <span>Mark all as read</span>
            </button>
          )}
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2 mt-6">
          <button
            onClick={() => setFilterUnread(false)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
              !filterUnread
                ? 'bg-lime text-black shadow-glow-sm'
                : 'bg-surface border border-surface-border text-secondaryText hover:text-white'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilterUnread(true)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
              filterUnread
                ? 'bg-lime text-black shadow-glow-sm'
                : 'bg-surface border border-surface-border text-secondaryText hover:text-white'
            }`}
          >
            Unread ({notifications.filter((n) => !n.read).length})
          </button>
        </div>

        {/* List */}
        <div className="mt-6 space-y-3">
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
              <span className="h-3 w-3 rounded-full bg-lime animate-ping" />
              <span className="text-sm font-bold text-secondaryText">Loading alerts...</span>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="rounded-3xl border border-surface-border bg-surface p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-hover text-secondaryText border border-surface-border mb-4">
                <Bell className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">No notifications</h3>
              <p className="text-xs text-secondaryText mt-1 max-w-sm mx-auto">
                {filterUnread
                  ? 'You have read all of your notifications.'
                  : 'You will receive notifications here when you win auctions, receive orders, or place bids.'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => {
                  if (!notif.read) handleMarkAsRead(notif.id);
                  if (notif.link_url) router.push(notif.link_url);
                }}
                className={`rounded-2xl border p-4 sm:p-5 transition-all cursor-pointer flex items-start gap-4 ${
                  notif.read
                    ? 'border-surface-border bg-surface/60 hover:bg-surface'
                    : 'border-lime/40 bg-surface shadow-glow-sm'
                }`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background border border-surface-border flex-shrink-0">
                  {getNotificationIcon(notif.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-white line-clamp-1">{notif.title}</h4>
                    <span className="text-[11px] text-secondaryText font-medium whitespace-nowrap">
                      {new Date(notif.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <p className="text-xs text-secondaryText mt-1 leading-relaxed">{notif.message}</p>

                  <div className="flex items-center justify-between mt-3">
                    {notif.link_url && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-lime hover:underline">
                        <span>View details</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    )}

                    {!notif.read && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-lime bg-lime/10 px-2 py-0.5 rounded-full ml-auto">
                        <span className="h-1.5 w-1.5 rounded-full bg-lime animate-ping" />
                        NEW
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
