'use client';

import type { OrderStatus } from '@/types';
import { CheckCircle2, Clock, Truck, PackageCheck, AlertCircle } from 'lucide-react';

interface OrderTimelineProps {
  status: OrderStatus;
  disputeReason?: string | null;
}

const STEPS = [
  { key: 'placed', label: 'Order Placed', icon: Clock },
  { key: 'paid', label: 'Escrow Secured', icon: CheckCircle2 },
  { key: 'dispatched', label: 'Dispatched', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: PackageCheck },
];

export function OrderTimeline({ status, disputeReason }: OrderTimelineProps) {
  if (status === 'cancelled') {
    return (
      <div className="rounded-2xl border border-coral/30 bg-coral/10 p-4 text-xs text-coral flex items-center gap-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <div>
          <span className="font-bold">Order Cancelled:</span> This transaction was cancelled and refunded.
        </div>
      </div>
    );
  }

  if (status === 'disputed') {
    return (
      <div className="rounded-2xl border border-coral/40 bg-coral/10 p-4 text-xs text-coral flex items-center gap-3 animate-pulse">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <div>
          <span className="font-bold">Order Under Dispute:</span> Funds are safely held in escrow pending resolution.
          {disputeReason && <div className="mt-1 text-secondaryText">Reason: {disputeReason}</div>}
        </div>
      </div>
    );
  }

  const getStepIndex = (s: OrderStatus) => {
    switch (s) {
      case 'pending':
      case 'awaiting_payment':
        return 0;
      case 'paid':
      case 'processing':
        return 1;
      case 'dispatched':
        return 2;
      case 'delivered':
      case 'completed':
        return 3;
      default:
        return 0;
    }
  };

  const currentIndex = getStepIndex(status);

  return (
    <div className="w-full py-4">
      <div className="relative flex items-center justify-between">
        {/* Connecting line */}
        <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-0.5 bg-surface-border -z-0" />
        <div
          className="absolute top-1/2 left-0 -translate-y-1/2 h-0.5 bg-lime transition-all duration-500 -z-0"
          style={{ width: `${(currentIndex / (STEPS.length - 1)) * 100}%` }}
        />

        {STEPS.map((step, idx) => {
          const isDone = idx <= currentIndex;
          const isCurrent = idx === currentIndex;
          const Icon = step.icon;

          return (
            <div key={step.key} className="flex flex-col items-center z-10">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all ${
                  isDone
                    ? 'border-lime bg-lime text-black font-bold shadow-glow-sm'
                    : 'border-surface-border bg-surface text-secondaryText'
                } ${isCurrent ? 'ring-4 ring-lime/20' : ''}`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span
                className={`mt-2 text-[11px] font-bold tracking-tight text-center ${
                  isDone ? 'text-white' : 'text-secondaryText'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
