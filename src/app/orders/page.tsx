'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar, Footer, OrderCard } from '@/components';
import { createClient } from '@/lib/supabase/client';
import type { AuctionOrderRecord, OrderStatus } from '@/types';
import { Package, ArrowLeft, Clock, ShieldCheck, Truck, CheckCircle2, ShoppingBag } from 'lucide-react';

export default function BuyerOrdersPage() {
  const router = useRouter();
  const supabase = createClient();

  const [orders, setOrders] = useState<AuctionOrderRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'awaiting_payment' | 'in_transit' | 'completed'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBuyerOrders() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login?redirect=/orders');
        return;
      }

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          seller:profiles!orders_seller_id_fkey(username, full_name, avatar_url),
          drop:drops(image_url, title)
        `)
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      if (data) {
        setOrders(data as any);
      }
      setLoading(false);
    }

    loadBuyerOrders();
  }, [router, supabase]);

  const filteredOrders = orders.filter((order) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'awaiting_payment') {
      return order.status === 'awaiting_payment' || order.status === 'pending';
    }
    if (activeTab === 'in_transit') {
      return order.status === 'dispatched' || order.status === 'paid' || order.status === 'processing';
    }
    if (activeTab === 'completed') {
      return order.status === 'delivered' || order.status === 'completed';
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-background text-primaryText flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 border-b border-surface-border">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-lime uppercase tracking-wider mb-1">
              <ShoppingBag className="w-4 h-4" />
              <span>Buyer Order Centre</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              My Purchases & Auction Wins
            </h1>
            <p className="text-sm text-secondaryText mt-1">
              Track delivery progress, authorize escrow payments, and manage order fulfillment.
            </p>
          </div>

          <Link
            href="/auctions"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-surface-hover hover:bg-surface border border-surface-border px-5 py-2.5 text-xs font-bold text-white transition-all self-start sm:self-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Marketplace</span>
          </Link>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-2">
          {[
            { id: 'all', label: 'All Orders', count: orders.length },
            {
              id: 'awaiting_payment',
              label: 'Awaiting Payment',
              count: orders.filter((o) => o.status === 'awaiting_payment' || o.status === 'pending').length,
            },
            {
              id: 'in_transit',
              label: 'In Transit',
              count: orders.filter(
                (o) => o.status === 'dispatched' || o.status === 'paid' || o.status === 'processing'
              ).length,
            },
            {
              id: 'completed',
              label: 'Completed',
              count: orders.filter((o) => o.status === 'delivered' || o.status === 'completed').length,
            },
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
        <div className="mt-8 space-y-4">
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
              <span className="h-3 w-3 rounded-full bg-lime animate-ping" />
              <span className="text-sm font-bold text-secondaryText">Loading purchases...</span>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="rounded-3xl border border-surface-border bg-surface p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-hover text-secondaryText border border-surface-border mb-4">
                <Package className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">No orders found</h3>
              <p className="text-xs text-secondaryText mt-1 max-w-sm mx-auto">
                {activeTab === 'all'
                  ? 'You have not made any purchases or won any auctions yet.'
                  : `No orders in the "${activeTab.replace('_', ' ')}" category.`}
              </p>
              <div className="mt-6">
                <Link
                  href="/auctions"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-lime px-6 py-2.5 text-xs font-black text-black hover:bg-lime-hover shadow-glow"
                >
                  Browse Live Drops
                </Link>
              </div>
            </div>
          ) : (
            filteredOrders.map((order) => <OrderCard key={order.id} order={order} role="buyer" />)
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
