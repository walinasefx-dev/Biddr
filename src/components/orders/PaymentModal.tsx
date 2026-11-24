'use client';

import { useState } from 'react';
import { paymentService, PaymentMethod } from '@/lib/payments';
import { createClient } from '@/lib/supabase/client';
import { ShieldCheck, Lock, CreditCard, Smartphone, CheckCircle2, AlertCircle, X, Sparkles } from 'lucide-react';

interface PaymentModalProps {
  orderId: string;
  amount: number;
  itemTitle: string;
  buyerId: string;
  sellerId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (txRef: string) => void;
}

export function PaymentModal({
  orderId,
  amount,
  itemTitle,
  buyerId,
  sellerId,
  isOpen,
  onClose,
  onSuccess,
}: PaymentModalProps) {
  const supabase = createClient();
  const [method, setMethod] = useState<PaymentMethod>('card');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setError(null);

    try {
      // 1. Process payment via provider-independent PaymentService
      const result = await paymentService.processOrderPayment({
        orderId,
        amount,
        currency: 'USD',
        buyerId,
        sellerId,
        paymentMethod: method,
        idempotencyKey: `pay_${orderId}_${Date.now()}`,
      });

      if (!result.success) {
        setError(result.error || 'Payment authorization failed.');
        setProcessing(false);
        return;
      }

      // 2. Persist payment audit record in Supabase
      const now = new Date().toISOString();
      await supabase.from('payments').insert({
        order_id: orderId,
        buyer_id: buyerId,
        seller_id: sellerId,
        amount,
        currency: 'USD',
        provider: result.provider,
        transaction_reference: result.transactionReference,
        status: 'succeeded',
      });

      // 3. Update order status to paid / escrow_held
      await supabase
        .from('orders')
        .update({
          status: 'paid',
          payment_status: 'paid',
          payment_method: method,
          payment_reference: result.transactionReference,
          paid_at: now,
          updated_at: now,
        })
        .eq('id', orderId);

      // 4. Create confirmation notification for buyer and seller
      await supabase.from('notifications').insert([
        {
          user_id: buyerId,
          type: 'payment_confirmed',
          title: 'Payment Confirmed — Buyer Protection Active',
          message: `Your payment of $${amount.toLocaleString()} for "${itemTitle}" was confirmed. Funds are held under Biddr Buyer Protection until delivery.`,
          link_url: `/orders/${orderId}`,
        },
        {
          user_id: sellerId,
          type: 'order_received',
          title: 'Buyer Paid — Ready to Fulfill',
          message: `The buyer paid $${amount.toLocaleString()} for "${itemTitle}". Please pack and dispatch the item.`,
          link_url: `/seller/orders/${orderId}`,
        },
      ]);

      onSuccess(result.transactionReference);
    } catch (err: any) {
      setError(err.message || 'Payment processing failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-surface-border bg-surface p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-lime/10 blur-[70px] pointer-events-none" />

        <div className="flex items-center justify-between pb-4 border-b border-surface-border">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime/10 text-lime border border-lime/30">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Biddr Escrow Checkout</h2>
              <p className="text-xs text-secondaryText">Bank-grade encrypted transaction</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 text-secondaryText hover:text-white hover:bg-surface-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Order Summary */}
        <div className="mt-5 rounded-2xl bg-background border border-surface-border p-4">
          <div className="text-xs text-secondaryText uppercase tracking-wider font-bold">Item</div>
          <div className="text-sm font-bold text-white mt-0.5 line-clamp-1">{itemTitle}</div>

          <div className="mt-4 pt-3 border-t border-surface-border flex items-center justify-between">
            <span className="text-xs text-secondaryText font-medium">Total Escrow Amount:</span>
            <span className="text-2xl font-black text-lime">${amount.toLocaleString()}</span>
          </div>
        </div>

        {/* Payment Methods */}
        <form onSubmit={handlePay} className="mt-5 space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-secondaryText mb-2">
            Select Payment Method
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMethod('card')}
              className={`flex flex-col items-start gap-1 p-3.5 rounded-2xl border text-left transition-all ${
                method === 'card'
                  ? 'border-lime bg-lime/10 text-white'
                  : 'border-surface-border bg-background text-secondaryText hover:text-white'
              }`}
            >
              <CreditCard className="w-5 h-5 text-lime" />
              <span className="text-xs font-bold mt-1">Credit / Debit Card</span>
              <span className="text-[10px] text-secondaryText">Visa, Mastercard, Amex</span>
            </button>

            <button
              type="button"
              onClick={() => setMethod('mobile_money')}
              className={`flex flex-col items-start gap-1 p-3.5 rounded-2xl border text-left transition-all ${
                method === 'mobile_money'
                  ? 'border-lime bg-lime/10 text-white'
                  : 'border-surface-border bg-background text-secondaryText hover:text-white'
              }`}
            >
              <Smartphone className="w-5 h-5 text-lime" />
              <span className="text-xs font-bold mt-1">Mobile Money / Bank</span>
              <span className="text-[10px] text-secondaryText">Instant wallet transfer</span>
            </button>
          </div>

          {/* Test Provider Notice */}
          <div className="rounded-xl border border-lime/20 bg-lime/5 p-3 text-[11px] text-lime flex items-center gap-2">
            <Sparkles className="w-4 h-4 flex-shrink-0" />
            <span>
              <strong>Test Mode Active:</strong> Payment simulator enabled. No actual credit card will be charged.
            </span>
          </div>

          {error && (
            <div className="rounded-xl border border-coral/30 bg-coral/10 p-3 text-xs text-coral flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Escrow Guarantee Pill */}
          <div className="flex items-center gap-2 text-xs text-secondaryText py-1">
            <ShieldCheck className="w-4 h-4 text-biddrBlue flex-shrink-0" />
            <span>Funds held safely in escrow until you inspect and confirm delivery.</span>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full border border-surface-border bg-background py-3 text-xs font-bold text-secondaryText hover:text-white hover:bg-surface-hover"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={processing}
              className="flex-2 rounded-full bg-lime hover:bg-lime-hover py-3 px-6 text-xs font-black text-black shadow-glow transition-all disabled:opacity-50"
            >
              {processing ? 'Securing Escrow Payment...' : `Authorize Escrow $${amount.toLocaleString()}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
