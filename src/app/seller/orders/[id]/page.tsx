'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Navbar, Footer, OrderTimeline, TrackingModal } from '@/components';
import { createClient } from '@/lib/supabase/client';
import type { AuctionOrderRecord } from '@/types';
import {
  ArrowLeft,
  ShieldCheck,
  Truck,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Package,
  DollarSign,
  User,
} from 'lucide-react';

interface SellerOrderDetailProps {
  params: Promise<{ id: string }>;
}

export default function SellerOrderDetailPage({ params }: SellerOrderDetailProps) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [order, setOrder] = useState<AuctionOrderRecord | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrder() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push(`/login?redirect=/seller/orders/${id}`);
        return;
      }
      setCurrentUser(user);

      const { data } = await supabase
        .from('orders')
        .select(`
          *,
          buyer:profiles!orders_buyer_id_fkey(username, full_name, avatar_url, location),
          drop:drops(title, image_url, condition)
        `)
        .eq('id', id)
        .maybeSingle();

      if (data) {
        setOrder(data as any);
      }
      setLoading(false);
    }

    loadOrder();
  }, [id, router, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-primaryText flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-lime animate-ping" />
            <span className="text-sm font-bold text-secondaryText">Loading order fulfillment details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background text-primaryText flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="max-w-md w-full rounded-3xl border border-surface-border bg-surface p-8 text-center shadow-2xl">
            <h1 className="text-2xl font-black text-white">Order Not Found</h1>
            <p className="mt-2 text-xs text-secondaryText">
              Order not found or you lack seller permissions to inspect it.
            </p>
            <div className="mt-6">
              <Link
                href="/seller/orders"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-lime px-6 py-2.5 text-xs font-bold text-black"
              >
                Return to Orders
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const isPaid = order.status === 'paid' || order.status === 'processing';
  const isDispatched = order.status === 'dispatched';
  const isDelivered = order.status === 'delivered' || order.status === 'completed';

  const grossAmount = Number(order.total_amount || order.amount || 0);
  const platformFee = grossAmount * 0.05; // 5% Biddr commission
  const netPayout = grossAmount - platformFee;

  const imageSrc =
    order.item_image_url ||
    order.drop?.image_url ||
    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=400&q=80';

  return (
    <div className="min-h-screen bg-background text-primaryText flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/seller/orders"
            className="inline-flex items-center gap-2 text-xs font-bold text-secondaryText hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Seller Orders</span>
          </Link>

          <span className="text-xs font-mono font-bold text-secondaryText bg-surface px-3 py-1 rounded-full border border-surface-border">
            Order #{order.id.substring(0, 8)}
          </span>
        </div>

        {/* Action Success Toast */}
        {actionSuccess && (
          <div className="mb-6 rounded-2xl border border-lime/30 bg-lime/10 p-4 text-xs text-lime flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Status Timeline Card */}
        <div className="rounded-3xl border border-surface-border bg-surface p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-surface-border">
            <h2 className="text-base font-bold text-white">Order Status & Fulfilment</h2>
            <div className="text-xs text-secondaryText">
              Received on {new Date(order.created_at).toLocaleString()}
            </div>
          </div>

          <div className="mt-4">
            <OrderTimeline status={order.status} disputeReason={order.dispute_reason} />
          </div>

          {/* Action Banner for Paid -> Ready to Dispatch */}
          {isPaid && (
            <div className="mt-6 rounded-2xl border border-lime/30 bg-lime/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-lime flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-white">Buyer Has Paid — Funds Secured in Escrow</h4>
                  <p className="text-xs text-secondaryText mt-0.5">
                    Please package the item securely and dispatch it to the buyer shipping destination.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsTrackingOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-lime hover:bg-lime-hover px-6 py-3 text-xs font-black text-black shadow-glow transition-all flex-shrink-0"
              >
                <Truck className="w-4 h-4" />
                <span>Dispatch & Add Tracking</span>
              </button>
            </div>
          )}
        </div>

        {/* 2-Column Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mt-8">
          {/* Left Column: Product & Shipping Address */}
          <div className="md:col-span-7 space-y-6">
            <div className="rounded-3xl border border-surface-border bg-surface p-6 sm:p-8">
              <h3 className="text-base font-bold text-white mb-4">Item to Fulfill</h3>

              <div className="flex items-start gap-4">
                <div className="relative h-24 w-24 rounded-2xl overflow-hidden border border-surface-border bg-background flex-shrink-0">
                  <Image src={imageSrc} alt={order.item_title} fill className="object-cover" />
                </div>

                <div className="flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-secondaryText bg-background px-2 py-0.5 rounded border border-surface-border">
                    {order.order_type === 'auction' ? 'Auction Lot' : 'Fixed Price'}
                  </span>
                  <h4 className="text-base font-bold text-white mt-1.5">{order.item_title}</h4>
                  <p className="text-xs text-secondaryText mt-1">Quantity: {order.quantity}</p>
                </div>
              </div>

              {/* Buyer Shipping Destination */}
              <div className="mt-6 pt-6 border-t border-surface-border">
                <div className="flex items-center gap-1.5 font-bold text-secondaryText text-xs mb-2">
                  <MapPin className="w-4 h-4 text-lime" />
                  <span>Buyer Shipping Destination</span>
                </div>

                <div className="rounded-2xl border border-surface-border bg-background p-4 text-xs space-y-1">
                  <div className="font-bold text-white">
                    {order.shipping_name || `@${order.buyer?.username || 'buyer'}`}
                  </div>
                  <div className="text-secondaryText">
                    {order.shipping_address ? (
                      <>
                        {order.shipping_address}
                        <br />
                        {order.shipping_city}, {order.shipping_state} {order.shipping_postal_code}
                        <br />
                        {order.shipping_country}
                      </>
                    ) : (
                      'Buyer contact address provided upon registration.'
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Buyer Contact Card */}
            <div className="rounded-3xl border border-surface-border bg-surface p-6 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="relative h-12 w-12 rounded-xl overflow-hidden border border-surface-border bg-background flex-shrink-0">
                  <Image
                    src={
                      order.buyer?.avatar_url ||
                      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
                    }
                    alt={order.buyer?.username || 'Buyer'}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">
                    {order.buyer?.full_name || `@${order.buyer?.username || 'buyer'}`}
                  </div>
                  <div className="text-xs text-secondaryText">@{order.buyer?.username || 'buyer'} • Customer</div>
                </div>
              </div>

              {order.buyer?.username && (
                <Link
                  href={`/profile/${order.buyer.username}`}
                  className="rounded-full bg-surface-hover border border-surface-border px-4 py-2 text-xs font-bold text-white hover:border-lime"
                >
                  View Buyer Profile
                </Link>
              )}
            </div>
          </div>

          {/* Right Column: Escrow Payout Breakdown & Tracking Info */}
          <div className="md:col-span-5 space-y-6">
            {/* Financial Payout Card */}
            <div className="rounded-3xl border border-surface-border bg-surface p-6 sm:p-8">
              <div className="flex items-center gap-2 text-sm font-bold text-white mb-4">
                <DollarSign className="w-4 h-4 text-lime" />
                <span>Seller Payout Summary</span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between text-secondaryText">
                  <span>Gross Sale Amount:</span>
                  <span className="font-bold text-white">${grossAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-secondaryText">
                  <span>Biddr Commission (5%):</span>
                  <span>-${platformFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-white font-bold text-base pt-3 border-t border-surface-border">
                  <span>Net Escrow Payout:</span>
                  <span className="text-lime">
                    ${netPayout.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-surface-border">
                <span className="text-[11px] font-bold uppercase tracking-wider text-secondaryText block mb-1">
                  Payout Status
                </span>
                {isDelivered ? (
                  <div className="text-xs font-bold text-lime flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Funds released to seller balance</span>
                  </div>
                ) : (
                  <div className="text-xs text-secondaryText flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-biddrBlue" />
                    <span>Protected in escrow until delivery is confirmed</span>
                  </div>
                )}
              </div>
            </div>

            {/* Shipment Tracking Record */}
            <div className="rounded-3xl border border-surface-border bg-surface p-6 sm:p-8">
              <div className="flex items-center justify-between pb-3 border-b border-surface-border">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Tracking Record</span>
                {isDispatched && (
                  <button
                    onClick={() => setIsTrackingOpen(true)}
                    className="text-[11px] font-bold text-lime hover:underline"
                  >
                    Edit Tracking
                  </button>
                )}
              </div>

              {order.tracking_number ? (
                <div className="mt-4 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-blue-300">
                    {order.shipping_carrier}
                  </div>
                  <div className="text-sm font-mono font-bold text-white mt-1 break-all">
                    {order.tracking_number}
                  </div>
                  <div className="text-[11px] text-secondaryText mt-1">
                    Dispatched on {order.dispatched_at ? new Date(order.dispatched_at).toLocaleDateString() : 'recently'}
                  </div>
                </div>
              ) : (
                <div className="mt-4 text-xs text-secondaryText">
                  No tracking number recorded yet. Click &quot;Dispatch & Add Tracking&quot; once package is sent.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Dispatch Tracking Modal */}
      {currentUser && (
        <TrackingModal
          orderId={order.id}
          itemTitle={order.item_title}
          buyerId={order.buyer_id}
          isOpen={isTrackingOpen}
          onClose={() => setIsTrackingOpen(false)}
          onSuccess={(carrier, trackingNumber) => {
            setIsTrackingOpen(false);
            setOrder((prev) =>
              prev
                ? {
                    ...prev,
                    status: 'dispatched',
                    fulfillment_status: 'dispatched',
                    shipping_carrier: carrier,
                    tracking_number: trackingNumber,
                  }
                : null
            );
            setActionSuccess(`Order dispatched! Tracking (${trackingNumber}) sent to customer.`);
          }}
        />
      )}
    </div>
  );
}
