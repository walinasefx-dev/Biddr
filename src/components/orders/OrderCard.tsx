'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { AuctionOrderRecord } from '@/types';
import { Package, ArrowRight, ShieldCheck, Clock, Truck, CheckCircle2, AlertTriangle } from 'lucide-react';

interface OrderCardProps {
  order: AuctionOrderRecord;
  role: 'buyer' | 'seller';
}

export function OrderCard({ order, role }: OrderCardProps) {
  const isBuyer = role === 'buyer';
  const detailHref = isBuyer ? `/orders/${order.id}` : `/seller/orders/${order.id}`;

  const getStatusBadge = () => {
    switch (order.status) {
      case 'awaiting_payment':
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-coral/10 border border-coral/30 px-3 py-1 text-xs font-bold text-coral">
            <Clock className="w-3.5 h-3.5" />
            Awaiting Payment
          </span>
        );
      case 'paid':
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-lime/10 border border-lime/30 px-3 py-1 text-xs font-bold text-lime">
            <ShieldCheck className="w-3.5 h-3.5" />
            Escrow Secured
          </span>
        );
      case 'dispatched':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 px-3 py-1 text-xs font-bold text-blue-400">
            <Truck className="w-3.5 h-3.5" />
            In Transit
          </span>
        );
      case 'delivered':
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-border border border-white/20 px-3 py-1 text-xs font-bold text-white">
            <CheckCircle2 className="w-3.5 h-3.5 text-lime" />
            Delivered
          </span>
        );
      case 'disputed':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-coral/20 border border-coral px-3 py-1 text-xs font-bold text-coral">
            <AlertTriangle className="w-3.5 h-3.5" />
            Dispute Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-border px-3 py-1 text-xs font-semibold text-secondaryText">
            {order.status}
          </span>
        );
    }
  };

  const imageSrc =
    order.item_image_url ||
    order.drop?.image_url ||
    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=400&q=80';

  return (
    <div className="rounded-3xl border border-surface-border bg-surface p-5 sm:p-6 transition-all hover:border-surface-border/80 hover:shadow-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-surface-border">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold text-secondaryText bg-background px-2.5 py-1 rounded-lg border border-surface-border">
            #{order.id.substring(0, 8)}
          </span>
          <span className="text-xs text-secondaryText font-medium">
            {new Date(order.created_at).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-secondaryText bg-surface-hover px-2 py-0.5 rounded">
            {order.order_type === 'auction' ? 'Auction Win' : 'Fixed Price'}
          </span>
        </div>

        <div>{getStatusBadge()}</div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 mt-5">
        <div className="flex items-center gap-4">
          <div className="relative h-18 w-18 sm:h-20 sm:w-20 rounded-2xl overflow-hidden border border-surface-border bg-background flex-shrink-0">
            <Image src={imageSrc} alt={order.item_title} fill className="object-cover" />
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-white line-clamp-1">
              {order.item_title}
            </h3>
            <p className="text-xs text-secondaryText mt-1">
              {isBuyer ? (
                <>Seller: @{order.seller?.username || 'seller'}</>
              ) : (
                <>Buyer: @{order.buyer?.username || 'buyer'}</>
              )}
              {order.quantity > 1 && ` • Qty: ${order.quantity}`}
            </p>

            {order.tracking_number && (
              <div className="mt-2 text-xs font-mono text-lime flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" />
                <span>
                  {order.shipping_carrier || 'Track'}: {order.tracking_number}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-surface-border">
          <div className="text-left sm:text-right">
            <span className="text-[11px] font-bold uppercase tracking-wider text-secondaryText block">
              Total Amount
            </span>
            <span className="text-xl sm:text-2xl font-black text-lime">
              ${(order.total_amount || order.amount).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>

          <Link
            href={detailHref}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-surface-hover hover:bg-lime hover:text-black border border-surface-border px-4 py-2.5 text-xs font-bold text-white transition-all duration-200"
          >
            <span>View Order</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
