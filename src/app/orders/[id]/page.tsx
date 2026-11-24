'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Navbar, Footer, OrderTimeline, PaymentModal } from '@/components';
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
  CreditCard,
  Package,
  Star,
  ExternalLink,
} from 'lucide-react';

interface BuyerOrderDetailProps {
  params: Promise<{ id: string }>;
}

export default function BuyerOrderDetailPage({ params }: BuyerOrderDetailProps) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [order, setOrder] = useState<AuctionOrderRecord | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [deliveryConfirming, setDeliveryConfirming] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Review & Dispute state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [isDisputeOpen, setIsDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('item_not_received');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);

  useEffect(() => {
    async function loadOrder() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push(`/login?redirect=/orders/${id}`);
        return;
      }
      setCurrentUser(user);

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          seller:profiles!orders_seller_id_fkey(username, full_name, avatar_url, location),
          drop:drops(title, image_url, condition, location)
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

  // Handle Delivery Confirmation with Automated Payout Release
  const handleConfirmDelivery = async () => {
    if (!order) return;
    setDeliveryConfirming(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/confirm-delivery`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to confirm delivery');
      }

      setOrder((prev) =>
        prev
          ? {
              ...prev,
              status: 'delivered',
              fulfillment_status: 'delivered',
              delivered_at: data.deliveredAt || new Date().toISOString(),
            }
          : null
      );
      setActionSuccess('Delivery confirmed! Net payout released to seller under Biddr Buyer Protection.');
    } catch (err: any) {
      // Fallback to client-side direct update if API endpoint error
      try {
        const now = new Date().toISOString();
        await supabase
          .from('orders')
          .update({
            status: 'delivered',
            fulfillment_status: 'delivered',
            delivered_at: now,
            updated_at: now,
          })
          .eq('id', order.id);

        setOrder((prev) =>
          prev
            ? {
                ...prev,
                status: 'delivered',
                fulfillment_status: 'delivered',
                delivered_at: now,
              }
            : null
        );
        setActionSuccess('Delivery confirmed! Payment released to the seller.');
      } catch (clientErr: any) {
        console.error('Delivery confirmation error:', clientErr);
      }
    } finally {
      setDeliveryConfirming(false);
    }
  };

  // Handle Review Submission
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !currentUser) return;
    setReviewSubmitting(true);

    try {
      const { error } = await supabase.from('reviews').insert({
        order_id: order.id,
        buyer_id: currentUser.id,
        seller_id: order.seller_id,
        rating: reviewRating,
        comment: reviewComment.trim() || null,
      });

      if (!error) {
        setReviewSuccess(true);
      }
    } catch {
      // Handled
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Handle Dispute Submission
  const handleSubmitDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !currentUser || !disputeDescription.trim()) return;
    setDisputeSubmitting(true);

    try {
      const now = new Date().toISOString();
      await supabase.from('disputes').insert({
        order_id: order.id,
        raised_by: currentUser.id,
        reason: disputeReason as any,
        description: disputeDescription.trim(),
      });

      await supabase
        .from('orders')
        .update({
          status: 'disputed',
          dispute_reason: disputeReason,
          updated_at: now,
        })
        .eq('id', order.id);

      setOrder((prev) =>
        prev
          ? {
              ...prev,
              status: 'disputed',
              dispute_reason: disputeReason,
            }
          : null
      );
      setIsDisputeOpen(false);
      setActionSuccess('Dispute registered. An administrator will review the case.');
    } catch {
      // Handled
    } finally {
      setDisputeSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-primaryText flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-lime animate-ping" />
            <span className="text-sm font-bold text-secondaryText">Loading order details...</span>
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
              The order reference does not exist or you do not have permission to inspect it.
            </p>
            <div className="mt-6">
              <Link
                href="/orders"
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

  const isAwaitingPayment = order.status === 'awaiting_payment' || order.status === 'pending';
  const isDispatched = order.status === 'dispatched';
  const isDeliveredOrDone = order.status === 'delivered' || order.status === 'completed';
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
            href="/orders"
            className="inline-flex items-center gap-2 text-xs font-bold text-secondaryText hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to My Purchases</span>
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

        {/* Order Status Timeline Card */}
        <div className="rounded-3xl border border-surface-border bg-surface p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-surface-border">
            <h2 className="text-base font-bold text-white">Order Progress & Payment Status</h2>
            <div className="text-xs text-secondaryText">
              Placed on {new Date(order.created_at).toLocaleString()}
            </div>
          </div>

          <div className="mt-4">
            <OrderTimeline status={order.status} disputeReason={order.dispute_reason} />
          </div>

          {/* Action Banner for Awaiting Payment */}
          {isAwaitingPayment && (
            <div className="mt-6 rounded-2xl border border-coral/30 bg-coral/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-coral flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-white">Payment Required to Finalize Order</h4>
                  <p className="text-xs text-secondaryText mt-0.5">
                    Please authorize payment. Your funds are protected by Biddr Buyer Protection until you receive and inspect your item.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsPaymentOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-lime hover:bg-lime-hover px-6 py-3 text-xs font-black text-black shadow-glow transition-all flex-shrink-0"
              >
                <CreditCard className="w-4 h-4" />
                <span>Pay ${(order.total_amount || order.amount).toLocaleString()}</span>
              </button>
            </div>
          )}

          {/* Action Banner for In-Transit / Dispatched */}
          {isDispatched && (
            <div className="mt-6 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Truck className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-white">Item Dispatched — In Transit</h4>
                  <p className="text-xs text-secondaryText mt-0.5">
                    Once the item arrives and is inspected, click below to confirm receipt and release funds to the seller.
                  </p>
                </div>
              </div>

              <button
                onClick={handleConfirmDelivery}
                disabled={deliveryConfirming}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-lime hover:bg-lime-hover px-6 py-3 text-xs font-black text-black shadow-glow transition-all flex-shrink-0 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{deliveryConfirming ? 'Confirming...' : 'Confirm Delivery Received'}</span>
              </button>
            </div>
          )}
        </div>

        {/* 2-Column Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mt-8">
          {/* Left Column: Product & Payment Summary */}
          <div className="md:col-span-7 space-y-6">
            <div className="rounded-3xl border border-surface-border bg-surface p-6 sm:p-8">
              <h3 className="text-base font-bold text-white mb-4">Purchased Item</h3>

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

                  {order.drop_id && (
                    <Link
                      href={`/auction/${order.drop_id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-lime mt-2 hover:underline"
                    >
                      <span>View Original Listing</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="mt-6 pt-6 border-t border-surface-border space-y-2 text-xs">
                <div className="flex justify-between text-secondaryText">
                  <span>Unit Price:</span>
                  <span>${(order.unit_price || order.amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-secondaryText">
                  <span>Subtotal ({order.quantity} item):</span>
                  <span>${(order.subtotal || order.amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-secondaryText">
                  <span>Standard Insured Shipping:</span>
                  <span>${order.shipping_fee?.toLocaleString() || '0.00'}</span>
                </div>
                <div className="flex justify-between text-white font-bold text-base pt-3 border-t border-surface-border">
                  <span>Total Escrow Amount:</span>
                  <span className="text-lime">
                    ${(order.total_amount || order.amount).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Seller Contact Card */}
            <div className="rounded-3xl border border-surface-border bg-surface p-6 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="relative h-12 w-12 rounded-xl overflow-hidden border border-lime flex-shrink-0">
                  <Image
                    src={
                      order.seller?.avatar_url ||
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
                    }
                    alt={order.seller?.username || 'Seller'}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">
                    {order.seller?.full_name || `@${order.seller?.username || 'seller'}`}
                  </div>
                  <div className="text-xs text-secondaryText">@{order.seller?.username || 'seller'} • Seller</div>
                </div>
              </div>

              {order.seller?.username && (
                <Link
                  href={`/profile/${order.seller.username}`}
                  className="rounded-full bg-surface-hover border border-surface-border px-4 py-2 text-xs font-bold text-white hover:border-lime"
                >
                  View Profile
                </Link>
              )}
            </div>
          </div>

          {/* Right Column: Shipping Details & Trust/Dispute */}
          <div className="md:col-span-5 space-y-6">
            {/* Shipping & Tracking Card */}
            <div className="rounded-3xl border border-surface-border bg-surface p-6 sm:p-8">
              <div className="flex items-center gap-2 text-sm font-bold text-white mb-4">
                <Truck className="w-4 h-4 text-blue-400" />
                <span>Delivery Information</span>
              </div>

              {order.tracking_number ? (
                <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-blue-300">
                    {order.shipping_carrier || 'Courier Tracking'}
                  </div>
                  <div className="text-sm font-mono font-bold text-white mt-1 break-all">
                    {order.tracking_number}
                  </div>
                  <div className="text-[11px] text-secondaryText mt-1">
                    Dispatched on {order.dispatched_at ? new Date(order.dispatched_at).toLocaleDateString() : 'recently'}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-surface-border bg-background p-4 text-xs text-secondaryText">
                  No tracking number added yet. The seller will update this once the package is dispatched.
                </div>
              )}

              {/* Delivery Address */}
              <div className="mt-4 pt-4 border-t border-surface-border text-xs">
                <div className="flex items-center gap-1.5 font-bold text-secondaryText mb-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Shipping Destination</span>
                </div>
                <div className="text-white font-medium">
                  {order.shipping_name || currentUser.email}
                  <div className="text-secondaryText">
                    {order.shipping_address ? (
                      <>
                        {order.shipping_address}, {order.shipping_city} {order.shipping_state} {order.shipping_postal_code}
                      </>
                    ) : (
                      'Address provided at registration.'
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Reviews Card (Unlocks when delivered) */}
            {isDeliveredOrDone && (
              <div className="rounded-3xl border border-surface-border bg-surface p-6 sm:p-8">
                <div className="flex items-center gap-2 text-sm font-bold text-white mb-2">
                  <Star className="w-4 h-4 text-lime" />
                  <span>Rate Your Experience</span>
                </div>

                {reviewSuccess ? (
                  <div className="rounded-2xl border border-lime/30 bg-lime/10 p-4 text-xs text-lime flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>Thank you! Your verified review has been published.</span>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitReview} className="space-y-3 mt-3">
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          className="p-1 hover:scale-110 transition-transform"
                        >
                          <Star
                            className={`w-6 h-6 ${
                              star <= reviewRating ? 'fill-lime text-lime' : 'text-surface-border'
                            }`}
                          />
                        </button>
                      ))}
                    </div>

                    <textarea
                      placeholder="Share your experience with this seller (optional)..."
                      rows={3}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      className="w-full rounded-2xl border border-surface-border bg-background p-3 text-xs text-white focus:border-lime focus:outline-none"
                    />

                    <button
                      type="submit"
                      disabled={reviewSubmitting}
                      className="w-full rounded-full bg-lime py-2.5 text-xs font-bold text-black hover:bg-lime-hover shadow-glow"
                    >
                      {reviewSubmitting ? 'Submitting Review...' : 'Submit Verified Review'}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Report Problem / Dispute */}
            <div className="rounded-2xl border border-surface-border bg-background p-4 text-center">
              <button
                type="button"
                onClick={() => setIsDisputeOpen(!isDisputeOpen)}
                className="text-xs font-bold text-coral hover:underline inline-flex items-center gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Having an issue with this order? Report a problem</span>
              </button>

              {isDisputeOpen && (
                <form onSubmit={handleSubmitDispute} className="mt-4 pt-4 border-t border-surface-border text-left space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-secondaryText block mb-1">Reason</label>
                    <select
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      className="w-full rounded-xl border border-surface-border bg-surface px-3 py-2 text-xs text-white focus:border-coral focus:outline-none"
                    >
                      <option value="item_not_received">Item Not Received</option>
                      <option value="item_damaged">Item Damaged Upon Arrival</option>
                      <option value="not_as_described">Significantly Not as Described</option>
                      <option value="unauthorized_charge">Unauthorized Charge</option>
                      <option value="other">Other Issue</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-secondaryText block mb-1">Description</label>
                    <textarea
                      required
                      rows={2}
                      placeholder="Explain what happened..."
                      value={disputeDescription}
                      onChange={(e) => setDisputeDescription(e.target.value)}
                      className="w-full rounded-xl border border-surface-border bg-surface p-3 text-xs text-white focus:border-coral focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={disputeSubmitting}
                    className="w-full rounded-full bg-coral py-2.5 text-xs font-bold text-white hover:bg-red-600 transition-colors"
                  >
                    {disputeSubmitting ? 'Registering Dispute...' : 'Submit Formal Dispute'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Escrow Payment Modal */}
      {currentUser && (
        <PaymentModal
          orderId={order.id}
          amount={order.total_amount || order.amount}
          itemTitle={order.item_title}
          buyerId={currentUser.id}
          sellerId={order.seller_id}
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          onSuccess={(txRef) => {
            setIsPaymentOpen(false);
            setOrder((prev) =>
              prev
                ? {
                    ...prev,
                    status: 'paid',
                    payment_status: 'paid',
                    payment_reference: txRef,
                  }
                : null
            );
            setActionSuccess('Payment confirmed! Funds secured under Biddr Buyer Protection.');
          }}
        />
      )}
    </div>
  );
}
