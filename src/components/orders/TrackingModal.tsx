'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Truck, Package, X, CheckCircle2, AlertCircle } from 'lucide-react';

interface TrackingModalProps {
  orderId: string;
  itemTitle: string;
  buyerId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (carrier: string, trackingNumber: string) => void;
}

const CARRIERS = [
  'USPS Priority Mail',
  'FedEx Express',
  'UPS Ground',
  'DHL Express',
  'Royal Mail',
  'Local Courier / Dispatch',
  'Buyer Collection / Hand Delivery',
];

export function TrackingModal({
  orderId,
  itemTitle,
  buyerId,
  isOpen,
  onClose,
  onSuccess,
}: TrackingModalProps) {
  const supabase = createClient();
  const [carrier, setCarrier] = useState(CARRIERS[0]);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber.trim()) {
      setError('Please provide a valid tracking number or delivery reference.');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const now = new Date().toISOString();

      // 1. Update order record in database
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'dispatched',
          fulfillment_status: 'dispatched',
          shipping_carrier: carrier,
          tracking_number: trackingNumber.trim(),
          dispatched_at: now,
          updated_at: now,
        })
        .eq('id', orderId);

      if (updateError) {
        throw updateError;
      }

      // 2. Insert notification for buyer
      await supabase.from('notifications').insert({
        user_id: buyerId,
        type: 'order_dispatched',
        title: '📦 Order Dispatched!',
        message: `Your order for "${itemTitle}" has been dispatched via ${carrier}. Tracking: ${trackingNumber.trim()}`,
        link_url: `/orders/${orderId}`,
        created_at: now,
      });

      onSuccess(carrier, trackingNumber.trim());
    } catch (err: any) {
      setError(err.message || 'Failed to update shipment status.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl border border-surface-border bg-surface p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-surface-border">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Dispatch Order</h2>
              <p className="text-xs text-secondaryText">Add tracking and confirm shipment</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 text-secondaryText hover:text-white hover:bg-surface-hover"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-secondaryText block mb-1.5">
              Shipping Carrier
            </label>
            <select
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="w-full rounded-2xl border border-surface-border bg-background px-4 py-3 text-sm font-semibold text-white focus:border-lime focus:outline-none"
            >
              {CARRIERS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-secondaryText block mb-1.5">
              Tracking / Shipment Reference Number
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 9400 1000 0000 0000 0000 00"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              className="w-full rounded-2xl border border-surface-border bg-background px-4 py-3 text-sm font-mono text-white focus:border-lime focus:outline-none placeholder:text-secondaryText/50"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-coral/30 bg-coral/10 p-3 text-xs text-coral flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-3 flex items-center gap-3">
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
              className="flex-1 rounded-full bg-lime hover:bg-lime-hover py-3 text-xs font-black text-black shadow-glow transition-all disabled:opacity-50"
            >
              {processing ? 'Confirming Dispatch...' : 'Confirm Dispatch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
