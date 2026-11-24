'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar, Footer, OrderCard } from '@/components';
import { createClient } from '@/lib/supabase/client';
import type { AuctionOrderRecord } from '@/types';
import { Package, ArrowLeft, DollarSign, Clock, Truck, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SellerOrdersPage() {
  const router = useRouter();
  const supabase = createClient();

  const [orders, setOrders] = useState<AuctionOrderRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'needs_fulfillment' | 'in_transit' | 'completed'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSellerOrders() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login?redirect=/seller/orders');
        return;
      }

      const { data } = await supabase
        .from('orders')
        .select(`
          *,
          buyer:profiles!orders_buyer_id_fkey(username, full_name, avatar_url),
          drop:drops(image_url, title)
        `)
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (data) {
        setOrders(data as any);
      }
      setLoading(false);
    }

    loadSellerOrders();
  }, [router, supabase]);

  // Statistics
  const totalSales = orders
    .filter((o) => o.status !== 'cancelled' && o.status !== 'refunded')
    .reduce((sum, o) => sum + Number(o.total_amount || o.amount || 0), 0);

  const pendingFulfillmentCount = orders.filter((o) => o.status === 'paid' || o.status === 'processing').length;
  const inTransitCount = orders.filter((o) => o.status === 'dispatched').length;
  const completedCount = orders.filter((o) => o.status === 'delivered' || o.status === 'completed').length;

  const filteredOrders = orders.filter((order) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'needs_fulfillment') {
      return order.status === 'paid' || order.status === 'processing';
    }
    if (activeTab === 'in_transit') {
      return order.status === 'dispatched';
    }
    if (activeTab === 'completed') {
      return order.status === 'delivered' || order.status === 'completed';
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-background text-primaryText flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 border-b border-surface-border">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-lime uppercase tracking-wider mb-1">
              <Package className="w-4 h-4" />
              <span>Seller Studio Fulfillment</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Order Fulfillment & Dispatch
            </h1>
            <p className="text-sm text-secondaryText mt-1">
              Track customer purchases, print shipment details, and manage delivery tracking.
            </p>
          </div>

          <Link
            href="/seller"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-surface-hover hover:bg-surface border border-surface-border px-5 py-2.5 text-xs font-bold text-white transition-all self-start sm:self-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Seller Studio</span>
          </Link>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          <div className="rounded-3xl border border-surface-border bg-surface p-5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-secondaryText block">
              Total Order Volume
            </span>
            <div className="text-2xl sm:text-3xl font-black text-lime mt-1">
              ${totalSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="rounded-3xl border border-surface-border bg-surface p-5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-secondaryText block">
              Needs Dispatch
            </span>
            <div className="text-2xl sm:text-3xl font-black text-coral mt-1">
              {pendingFulfillmentCount}
            </div>
          </div>

          <div className="rounded-3xl border border-surface-border bg-surface p-5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-secondaryText block">
              In Transit
            </span>
            <div className="text-2xl sm:text-3xl font-black text-blue-400 mt-1">
              {inTransitCount}
            </div>
          </div>

          <div className="rounded-3xl border border-surface-border bg-surface p-5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-secondaryText block">
              Completed Orders
            </span>
            <div className="text-2xl sm:text-3xl font-black text-white mt-1">
              {completedCount}
            </div>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-2 mt-8 overflow-x-auto pb-2">
          {[
            { id: 'all', label: 'All Orders', count: orders.length },
            { id: 'needs_fulfillment', label: 'Needs Dispatch (Paid)', count: pendingFulfillmentCount },
            { id: 'in_transit', label: 'In Transit', count: inTransitCount },
            { id: 'completed', label: 'Completed', count: completedCount },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`rounded-full px-4 py-2 text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-lime text-black shadow-glow-sm'
                  : 'bg-surface border border-surface-border text-secondaryText hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeTab === tab.id ? 'bg-black/20 text-black font-black' : 'bg-background text-secondaryText'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Order List */}
        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
              <span className="h-3 w-3 rounded-full bg-lime animate-ping" />
              <span className="text-sm font-bold text-secondaryText">Loading seller orders...</span>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="rounded-3xl border border-surface-border bg-surface p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-hover text-secondaryText border border-surface-border mb-4">
                <Package className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">No orders in this category</h3>
              <p className="text-xs text-secondaryText mt-1 max-w-sm mx-auto">
                Orders from your live auctions and fixed-price listings will appear here.
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => <OrderCard key={order.id} order={order} role="seller" />)
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
