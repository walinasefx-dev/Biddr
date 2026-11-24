'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar, Footer } from '@/components';
import {
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  ArrowRight,
  TrendingUp,
  Tag,
  Sparkles,
  ChevronRight,
  CreditCard,
} from 'lucide-react';

interface PayoutsData {
  success: boolean;
  sellerId: string;
  stripe: {
    accountId: string | null;
    payoutsEnabled: boolean;
    chargesEnabled: boolean;
    statusBadge: 'onboarding_required' | 'under_review' | 'payouts_active';
    requirements?: any;
  };
  balances: {
    pending: number;
    released: number;
    queued: number;
  };
  tier: {
    completedSalesCount: number;
    commissionRate: number;
    commissionPercent: number;
    isZeroFeeTier: boolean;
    salesUntilStandardRate: number;
  };
  fees: {
    totalCommissionPaid: number;
    totalProcessingFees: number;
  };
  history: Array<{
    id: string;
    orderId: string;
    itemTitle: string;
    itemImageUrl: string | null;
    grossAmount: number;
    commissionRate: number;
    commissionAmount: number;
    processingFeeAmount: number;
    netAmount: number;
    status: 'transferred' | 'queued' | 'pending' | 'failed';
    transferReference: string | null;
    idempotencyKey: string;
    createdAt: string;
  }>;
  pendingOrders: Array<{
    id: string;
    title: string;
    imageUrl: string | null;
    grossAmount: number;
    estimatedNetPayout: number;
    commissionAmount: number;
    processingFeeAmount: number;
    status: string;
    paidAt: string | null;
    createdAt: string;
  }>;
}

function SellerPayoutsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<PayoutsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Check URL query parameters for onboarding returns
  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam === 'returned') {
      setSuccessToast('Stripe onboarding session completed! Verifying your account status...');
    } else if (statusParam === 'refresh') {
      setErrorMessage('Your Stripe session expired or was canceled. Please click Connect to continue setup.');
    }
  }, [searchParams]);

  // Fetch Payouts data
  const fetchPayouts = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/seller/payouts');
      if (res.status === 401) {
        router.push('/login?redirect=/seller/payouts');
        return;
      }
      if (res.status === 403) {
        router.push('/seller');
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        setErrorMessage(json.error || 'Failed to load payouts data');
      } else {
        setData(json);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error fetching payouts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, []);

  // Initiate or resume Stripe Connect onboarding
  const handleConnectStripe = async () => {
    setConnecting(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/seller/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/seller/payouts?status=returned`,
          refreshUrl: `${window.location.origin}/seller/payouts?status=refresh`,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.onboardingUrl) {
        setErrorMessage(json.error || 'Failed to generate Stripe onboarding link');
        setConnecting(false);
      } else {
        // Redirect to Stripe hosted onboarding
        window.location.href = json.onboardingUrl;
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error connecting with Stripe');
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-primaryText flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-lime animate-ping" />
            <span className="text-sm font-bold text-secondaryText">Loading Stripe payouts ledger...</span>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const stripeStatus = data?.stripe.statusBadge || 'onboarding_required';
  const payoutsActive = stripeStatus === 'payouts_active';
  const underReview = stripeStatus === 'under_review';
  const onboardingRequired = stripeStatus === 'onboarding_required';

  const tier = data?.tier;
  const progressTo30 = Math.min(100, Math.round(((tier?.completedSalesCount || 0) / 30) * 100));

  return (
    <div className="min-h-screen bg-background text-primaryText flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 w-full">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-bold text-secondaryText mb-4">
          <Link href="/seller" className="hover:text-white transition-colors">
            Seller Studio
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-white">Payouts & Stripe Connect</span>
        </div>

        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-surface-border">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-lime mb-2">
              <ShieldCheck className="w-4 h-4 text-biddrBlue" />
              <span>Biddr Buyer Protection Custodial Escrow</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Seller Payouts & Stripe Connect
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-secondaryText max-w-2xl">
              Buyer payments are held securely under Biddr Buyer Protection until delivery is confirmed.
              Transfers are released directly to your connected Stripe Express account with automated bank deposits.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              onClick={fetchPayouts}
              className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface px-4 py-2.5 text-xs font-bold text-secondaryText hover:text-white hover:border-lime/40 transition-all"
              title="Refresh ledger"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>

            {payoutsActive ? (
              <button
                onClick={handleConnectStripe}
                disabled={connecting}
                className="inline-flex items-center gap-2 rounded-full bg-surface border border-lime/40 px-5 py-2.5 text-xs font-bold text-lime hover:bg-lime/10 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{connecting ? 'Redirecting...' : 'Stripe Express Settings'}</span>
              </button>
            ) : (
              <button
                onClick={handleConnectStripe}
                disabled={connecting}
                className="inline-flex items-center gap-2 rounded-full bg-lime px-6 py-3 text-xs font-black text-black hover:bg-lime-hover shadow-glow transition-all active:scale-95 disabled:opacity-50"
              >
                <CreditCard className="w-4 h-4" />
                <span>{connecting ? 'Opening Stripe...' : 'Connect with Stripe'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Alerts / Toasts */}
        {successToast && (
          <div className="mt-6 rounded-2xl border border-lime/30 bg-lime/10 p-4 text-xs text-lime flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successToast}</span>
            </div>
            <button onClick={() => setSuccessToast(null)} className="text-secondaryText hover:text-white">
              ✕
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-coral/30 bg-coral/10 p-4 text-xs text-coral flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-secondaryText hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Stripe Connection Status Card */}
        <div className="mt-8 rounded-3xl border border-surface-border bg-surface p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-4">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl border flex-shrink-0 ${
                  payoutsActive
                    ? 'bg-lime/10 border-lime/30 text-lime'
                    : underReview
                    ? 'bg-biddrBlue/10 border-biddrBlue/30 text-biddrBlue'
                    : 'bg-coral/10 border-coral/30 text-coral'
                }`}
              >
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base font-bold text-white">Stripe Express Account</h3>
                  {/* Status Badge */}
                  {payoutsActive && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-lime/10 border border-lime/30 px-3 py-0.5 text-[11px] font-black text-lime">
                      <span className="h-1.5 w-1.5 rounded-full bg-lime" />
                      Stripe Payouts Active
                    </span>
                  )}
                  {underReview && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-biddrBlue/10 border border-biddrBlue/30 px-3 py-0.5 text-[11px] font-black text-biddrBlue">
                      <Clock className="w-3 h-3 text-biddrBlue" />
                      Under Review
                    </span>
                  )}
                  {onboardingRequired && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-coral/10 border border-coral/30 px-3 py-0.5 text-[11px] font-black text-coral">
                      <AlertCircle className="w-3 h-3 text-coral" />
                      Onboarding Required
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-secondaryText">
                  {payoutsActive && data?.stripe.accountId
                    ? `Connected Account ID: ${data.stripe.accountId} • Bank transfers are enabled and automated.`
                    : underReview
                    ? 'Your Stripe account is connected but pending document verification. Payout releases will be queued until verified.'
                    : 'Connect your bank account via Stripe Express to receive automated releases when orders are delivered.'}
                </p>
              </div>
            </div>

            {!payoutsActive && (
              <button
                onClick={handleConnectStripe}
                disabled={connecting}
                className="rounded-full bg-lime px-6 py-2.5 text-xs font-black text-black hover:bg-lime-hover shadow-glow transition-all whitespace-nowrap self-start sm:self-auto"
              >
                {underReview ? 'Complete Stripe Verification' : 'Connect Stripe Account'}
              </button>
            )}
          </div>
        </div>

        {/* 4 Financial Balances & Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {/* Pending Protection Balance */}
          <div className="rounded-2xl border border-surface-border bg-surface p-5">
            <div className="flex items-center justify-between text-secondaryText mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Pending Protection</span>
              <Clock className="w-4 h-4 text-biddrBlue" />
            </div>
            <div className="text-2xl font-black text-white font-mono">
              ${(data?.balances.pending || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="mt-2 text-[11px] text-secondaryText">
              Held under Biddr Buyer Protection awaiting buyer delivery confirmation.
            </p>
          </div>

          {/* Released Transfers */}
          <div className="rounded-2xl border border-surface-border bg-surface p-5">
            <div className="flex items-center justify-between text-secondaryText mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Released to Stripe</span>
              <CheckCircle2 className="w-4 h-4 text-lime" />
            </div>
            <div className="text-2xl font-black text-lime font-mono">
              ${(data?.balances.released || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="mt-2 text-[11px] text-secondaryText">
              Transferred to your Stripe Express balance for automated bank payout.
            </p>
          </div>

          {/* Queued Payouts */}
          <div className="rounded-2xl border border-surface-border bg-surface p-5">
            <div className="flex items-center justify-between text-secondaryText mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Queued Transfers</span>
              <AlertCircle className="w-4 h-4 text-coral" />
            </div>
            <div className="text-2xl font-black text-coral font-mono">
              ${(data?.balances.queued || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="mt-2 text-[11px] text-secondaryText">
              Delivered orders queued until Stripe Express onboarding is fully active.
            </p>
          </div>

          {/* Platform Commission Tier */}
          <div className="rounded-2xl border border-surface-border bg-surface p-5">
            <div className="flex items-center justify-between text-secondaryText mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Commission Tier</span>
              <Tag className="w-4 h-4 text-lime" />
            </div>
            <div className="text-2xl font-black text-white font-mono">
              {tier?.isZeroFeeTier ? '0% Rate' : `${tier?.commissionPercent}% Rate`}
            </div>
            <p className="mt-2 text-[11px] text-secondaryText">
              {tier?.isZeroFeeTier
                ? `${tier.salesUntilStandardRate} sales remaining at 0% founding tier.`
                : 'Standard 6% rate applied (30+ closed sales).'}
            </p>
          </div>
        </div>

        {/* Founding Seller 0% Commission Tier Banner */}
        <div className="mt-6 rounded-3xl border border-lime/30 bg-gradient-to-r from-lime/5 via-surface to-surface p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-lime mb-1">
                <Sparkles className="w-4 h-4" />
                <span>Founding Seller Promotion</span>
              </div>
              <h3 className="text-lg font-black text-white">
                {tier?.isZeroFeeTier
                  ? '0% Platform Commission Tier Active'
                  : 'Standard 6% Platform Commission Active'}
              </h3>
              <p className="mt-1 text-xs text-secondaryText leading-relaxed">
                Biddr rewards early creators: your first 30 completed auction sales enjoy a{' '}
                <strong className="text-lime">0% platform commission fee</strong>. Payment-processing costs
                (2.9% + $0.30) are passed through at exact cost. After 30 sales, the standard 6% marketplace take
                rate applies.
              </p>
            </div>

            <div className="w-full md:w-64 flex-shrink-0 bg-background/80 rounded-2xl p-4 border border-surface-border">
              <div className="flex justify-between items-center text-xs font-bold mb-2">
                <span className="text-secondaryText">Sales Milestone</span>
                <span className="text-lime font-mono">{tier?.completedSalesCount || 0} / 30</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-surface border border-surface-border overflow-hidden">
                <div
                  className="h-full bg-lime rounded-full transition-all duration-500 shadow-glow-sm"
                  style={{ width: `${progressTo30}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-secondaryText">
                <span>0% Commission</span>
                <span>6% Standard</span>
              </div>
            </div>
          </div>
        </div>

        {/* Two-Column Section: Pending Protection Orders vs Payout History */}
        <div className="mt-10 space-y-10">
          {/* Section 1: Orders Held Under Protection */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-black text-white">
                  Held Under Protection ({data?.pendingOrders.length || 0})
                </h3>
                <p className="text-xs text-secondaryText">
                  Buyer payments confirmed via Stripe. Funds will be released upon confirmed delivery.
                </p>
              </div>
              <Link
                href="/seller/orders"
                className="text-xs font-bold text-lime hover:underline inline-flex items-center gap-1"
              >
                <span>Fulfill Orders</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {(!data?.pendingOrders || data.pendingOrders.length === 0) ? (
              <div className="rounded-2xl border border-surface-border bg-surface p-8 text-center">
                <ShieldCheck className="w-8 h-8 text-secondaryText mx-auto mb-2" />
                <p className="text-xs font-bold text-white">No orders currently held under protection</p>
                <p className="text-[11px] text-secondaryText mt-1">
                  When a buyer wins an auction, their payment will appear here until you dispatch and deliver.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-surface-border bg-surface overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-surface-border bg-background/50 text-[11px] font-bold uppercase tracking-wider text-secondaryText">
                        <th className="py-3.5 px-5">Order / Item</th>
                        <th className="py-3.5 px-5">Status</th>
                        <th className="py-3.5 px-5">Gross Paid</th>
                        <th className="py-3.5 px-5">Processing Fee</th>
                        <th className="py-3.5 px-5">Est. Net Release</th>
                        <th className="py-3.5 px-5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border">
                      {data.pendingOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-surface-hover/50 transition-colors">
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              {order.imageUrl ? (
                                <div className="relative h-10 w-12 rounded-lg overflow-hidden border border-surface-border flex-shrink-0">
                                  <Image src={order.imageUrl} alt={order.title} fill className="object-cover" />
                                </div>
                              ) : (
                                <div className="h-10 w-12 rounded-lg bg-background border border-surface-border flex items-center justify-center flex-shrink-0 text-secondaryText text-[10px]">
                                  Lot
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-white max-w-xs truncate">{order.title}</div>
                                <div className="text-[10px] text-secondaryText font-mono">
                                  Order #{order.id.slice(0, 8)}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-5">
                            <span className="inline-flex items-center gap-1 rounded-full bg-biddrBlue/10 border border-biddrBlue/30 px-2.5 py-0.5 text-[10px] font-bold text-biddrBlue capitalize">
                              <span className="h-1.5 w-1.5 rounded-full bg-biddrBlue" />
                              {order.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-5 font-mono font-bold text-white">
                            ${order.grossAmount.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-5 font-mono text-secondaryText">
                            ${order.processingFeeAmount.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-5 font-mono font-bold text-lime">
                            ${order.estimatedNetPayout.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            <Link
                              href={`/seller/orders/${order.id}`}
                              className="rounded-lg bg-surface-hover border border-surface-border px-3 py-1 text-[11px] font-bold text-white hover:border-lime/40 transition-colors"
                            >
                              Details
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Payout Transfer History */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-black text-white">
                  Transfer & Payout History ({data?.history.length || 0})
                </h3>
                <p className="text-xs text-secondaryText">
                  Transfers executed to your connected Stripe Express account via separate charges and transfers.
                </p>
              </div>
            </div>

            {(!data?.history || data.history.length === 0) ? (
              <div className="rounded-2xl border border-surface-border bg-surface p-8 text-center">
                <DollarSign className="w-8 h-8 text-secondaryText mx-auto mb-2" />
                <p className="text-xs font-bold text-white">No payout transfers recorded yet</p>
                <p className="text-[11px] text-secondaryText mt-1">
                  Once an order is confirmed delivered, the net proceeds will transfer to your Stripe account.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-surface-border bg-surface overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-surface-border bg-background/50 text-[11px] font-bold uppercase tracking-wider text-secondaryText">
                        <th className="py-3.5 px-5">Transfer Date</th>
                        <th className="py-3.5 px-5">Item & Order</th>
                        <th className="py-3.5 px-5">Gross Amount</th>
                        <th className="py-3.5 px-5">Platform Fee</th>
                        <th className="py-3.5 px-5">Processing Fee</th>
                        <th className="py-3.5 px-5">Net Payout</th>
                        <th className="py-3.5 px-5">Status</th>
                        <th className="py-3.5 px-5 text-right">Reference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border">
                      {data.history.map((item) => (
                        <tr key={item.id} className="hover:bg-surface-hover/50 transition-colors">
                          <td className="py-3.5 px-5 text-secondaryText font-medium">
                            {new Date(item.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-3.5 px-5">
                            <div className="font-bold text-white max-w-xs truncate">{item.itemTitle}</div>
                            <div className="text-[10px] text-secondaryText font-mono">
                              Order #{item.orderId.slice(0, 8)}
                            </div>
                          </td>
                          <td className="py-3.5 px-5 font-mono text-white">
                            ${item.grossAmount.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-5 font-mono text-secondaryText">
                            {item.commissionAmount > 0
                              ? `$${item.commissionAmount.toFixed(2)} (${(item.commissionRate * 100).toFixed(0)}%)`
                              : '$0.00 (0%)'}
                          </td>
                          <td className="py-3.5 px-5 font-mono text-secondaryText">
                            ${item.processingFeeAmount.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-5 font-mono font-bold text-lime text-sm">
                            ${item.netAmount.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-5">
                            {item.status === 'transferred' ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-lime/10 border border-lime/30 px-2 py-0.5 text-[10px] font-bold text-lime">
                                <CheckCircle2 className="w-3 h-3 text-lime" />
                                Transferred
                              </span>
                            ) : item.status === 'queued' ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-coral/10 border border-coral/30 px-2 py-0.5 text-[10px] font-bold text-coral">
                                <Clock className="w-3 h-3 text-coral" />
                                Queued
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-surface-border px-2 py-0.5 text-[10px] font-bold text-secondaryText">
                                {item.status.toUpperCase()}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-5 text-right font-mono text-[10px] text-secondaryText">
                            {item.transferReference || item.idempotencyKey.slice(0, 14)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Explanatory Architecture & Compliance Note */}
        <div className="mt-12 rounded-3xl border border-surface-border bg-surface/50 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-biddrBlue/10 border border-biddrBlue/30 text-biddrBlue flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-white">How Biddr Payouts & Buyer Protection Work</h4>
              <p className="text-xs text-secondaryText leading-relaxed">
                Biddr protects transactions by using <strong>Stripe Separate Charges and Transfers</strong>. When a buyer
                pays, the gross total is held securely on Biddr&apos;s platform account. Once tracking confirms delivery or the
                buyer confirms receipt, Biddr automatically transfers your payout directly to your Stripe Express account.
                From there, Stripe deposits funds directly to your linked bank account on a standard 2-business-day rolling schedule.
              </p>
              <div className="pt-2 flex flex-wrap gap-4 text-[11px] text-secondaryText">
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-lime" />
                  Idempotent transfer processing
                </span>
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-lime" />
                  No funds lost if onboarding incomplete (transfers queue safely)
                </span>
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-lime" />
                  Pass-through processing fee at 2.9% + $0.30
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function SellerPayoutsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background text-primaryText flex flex-col">
          <Navbar />
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-lime animate-ping" />
              <span className="text-sm font-bold text-secondaryText">Loading Stripe payouts ledger...</span>
            </div>
          </div>
          <Footer />
        </div>
      }
    >
      <SellerPayoutsContent />
    </Suspense>
  );
}
