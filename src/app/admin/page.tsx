'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Navbar, Footer } from '@/components';
import { createClient } from '@/lib/supabase/client';
import {
  ShieldAlert,
  ShieldCheck,
  Radio,
  AlertTriangle,
  Users,
  DollarSign,
  Gavel,
  CheckCircle2,
  AlertCircle,
  Pause,
  Play,
  Sparkles,
  ExternalLink,
  Lock,
  Search,
  Filter,
} from 'lucide-react';

export default function AdminCockpitPage() {
  const router = useRouter();
  const supabase = createClient();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  // Active Tab: 'analytics' | 'streams' | 'disputes' | 'sellers' | 'audit'
  const [activeTab, setActiveTab] = useState<'analytics' | 'streams' | 'disputes' | 'sellers' | 'audit'>('analytics');

  // Data State
  const [analytics, setAnalytics] = useState<any>(null);
  const [streams, setStreams] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Action Modals State
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Stream Moderation Modal
  const [selectedStream, setSelectedStream] = useState<any>(null);
  const [streamActionType, setStreamActionType] = useState<'pause' | 'terminate' | null>(null);
  const [streamReason, setStreamReason] = useState('');

  // Dispute Action Modal
  const [selectedDispute, setSelectedDispute] = useState<any>(null);
  const [disputeActionType, setDisputeActionType] = useState<'refund' | 'release' | 'dismiss' | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [refundAmount, setRefundAmount] = useState<number | ''>('');

  // Seller Verification Modal
  const [selectedSeller, setSelectedSeller] = useState<any>(null);
  const [sellerActionType, setSellerActionType] = useState<'approve' | 'reject' | null>(null);
  const [sellerReason, setSellerReason] = useState('');

  // 1. Authenticate & Verify Admin Role
  useEffect(() => {
    async function initAdmin() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      setCurrentUser(user);

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, role')
        .eq('id', user.id)
        .maybeSingle();

      if ((profile as any)?.role === 'admin') {
        setIsAdmin(true);
        loadAllAdminData();
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    }

    initAdmin();
  }, [supabase]);

  // Load All Admin Sections
  const loadAllAdminData = async () => {
    setLoading(true);
    try {
      // 1. Analytics
      const aRes = await fetch('/api/admin/analytics');
      const aData = await aRes.json();
      if (aData.success) setAnalytics(aData.analytics);

      // 2. Streams
      const sRes = await fetch('/api/admin/streams');
      const sData = await sRes.json();
      if (sData.success) setStreams(sData.streams);

      // 3. Disputes
      const dRes = await fetch('/api/admin/disputes');
      const dData = await dRes.json();
      if (dData.success) setDisputes(dData.disputes);

      // 4. Sellers
      const selRes = await fetch('/api/admin/sellers');
      const selData = await selRes.json();
      if (selData.success) setSellers(selData.sellers);

      // 5. Audit Logs
      const { data: logs } = await supabase
        .from('audit_logs')
        .select('*, actor:profiles!audit_logs_actor_id_fkey(username)')
        .order('created_at', { ascending: false })
        .limit(30);
      if (logs) setAuditLogs(logs);
    } catch (err: any) {
      setActionError(err.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // HANDLERS: STREAM MODERATION
  // ============================================================
  const handleModerateStream = async () => {
    if (!selectedStream || !streamActionType || !streamReason.trim()) return;
    setActionLoading(true);
    setActionError(null);

    try {
      const res = await fetch('/api/admin/streams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: selectedStream.id,
          action: streamActionType,
          reason: streamReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Stream action failed');

      setActionSuccess(`Stream ${streamActionType === 'terminate' ? 'terminated' : 'paused'} successfully.`);
      setSelectedStream(null);
      setStreamActionType(null);
      setStreamReason('');
      loadAllAdminData();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ============================================================
  // HANDLERS: DISPUTE RESOLUTION
  // ============================================================
  const handleResolveDispute = async () => {
    if (!selectedDispute || !disputeActionType || !disputeReason.trim()) return;
    setActionLoading(true);
    setActionError(null);

    try {
      const res = await fetch('/api/admin/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disputeId: selectedDispute.id,
          action: disputeActionType,
          reason: disputeReason.trim(),
          refundAmount: refundAmount ? Number(refundAmount) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Dispute action failed');

      setActionSuccess(`Dispute resolved via ${disputeActionType}. Audit log written.`);
      setSelectedDispute(null);
      setDisputeActionType(null);
      setDisputeReason('');
      setRefundAmount('');
      loadAllAdminData();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ============================================================
  // HANDLERS: SELLER VERIFICATION
  // ============================================================
  const handleVerifySeller = async () => {
    if (!selectedSeller || !sellerActionType || !sellerReason.trim()) return;
    setActionLoading(true);
    setActionError(null);

    try {
      const res = await fetch('/api/admin/sellers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellerId: selectedSeller.id,
          action: sellerActionType,
          reason: sellerReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Seller verification action failed');

      setActionSuccess(`Seller verification ${sellerActionType === 'approve' ? 'approved' : 'rejected'}.`);
      setSelectedSeller(null);
      setSellerActionType(null);
      setSellerReason('');
      loadAllAdminData();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ACCESS DENIED VIEW
  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-background text-primaryText flex flex-col justify-between">
        <Navbar />
        <div className="flex-1 max-w-lg mx-auto flex flex-col items-center justify-center p-8 text-center">
          <div className="h-16 w-16 rounded-3xl bg-coral/10 border border-coral/30 flex items-center justify-center text-coral mb-6">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-white">403 — Administrator Access Required</h1>
          <p className="text-sm text-secondaryText mt-2 leading-relaxed">
            This cockpit is restricted to Biddr Trust & Safety and System Administrators.
            Your current account does not hold the <code className="text-lime font-mono">admin</code> role.
          </p>

          <div className="mt-6 p-4 rounded-2xl bg-surface border border-surface-border text-left w-full text-xs text-secondaryText font-mono">
            <p className="text-white font-bold mb-1">To seed an administrator account:</p>
            <p className="text-lime">UPDATE public.profiles</p>
            <p className="text-lime">SET role = &apos;admin&apos;</p>
            <p className="text-lime">WHERE username = &apos;your_username&apos;;</p>
          </div>

          <Link
            href="/"
            className="mt-6 rounded-full bg-lime hover:bg-lime-hover px-6 py-2.5 text-xs font-black text-black shadow-glow"
          >
            Return to Homepage
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-primaryText flex flex-col justify-between">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-surface-border">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime/10 border border-lime/30 text-lime shadow-glow">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-white tracking-tight">Admin & Moderation Cockpit</h1>
                <span className="rounded-full bg-coral/20 border border-coral/40 px-2.5 py-0.5 text-[10px] font-black text-coral uppercase tracking-wider">
                  Trust & Safety
                </span>
              </div>
              <p className="text-xs text-secondaryText">
                Enforcing community safety, dispute mediation, stream moderation, and seller payouts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadAllAdminData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-full border border-surface-border bg-surface px-4 py-2 text-xs font-bold text-secondaryText hover:text-white transition-colors"
            >
              <svg
                className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 21h5v-5" />
              </svg>
              <span>Refresh Metrics</span>
            </button>
          </div>
        </div>

        {/* Global Toast Alerts */}
        {actionSuccess && (
          <div className="mt-4 p-4 rounded-2xl bg-lime/10 border border-lime/30 text-lime text-xs flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button onClick={() => setActionSuccess(null)} className="text-secondaryText hover:text-white">✕</button>
          </div>
        )}

        {actionError && (
          <div className="mt-4 p-4 rounded-2xl bg-coral/10 border border-coral/30 text-coral text-xs flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{actionError}</span>
            </div>
            <button onClick={() => setActionError(null)} className="text-secondaryText hover:text-white">✕</button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="mt-6 flex items-center gap-2 border-b border-surface-border overflow-x-auto pb-2">
          {[
            { id: 'analytics', label: 'Marketplace Analytics', icon: DollarSign },
            { id: 'streams', label: `Live Streams (${streams.length})`, icon: Radio },
            { id: 'disputes', label: `Dispute Center (${disputes.filter((d) => ['open', 'under_review'].includes(d.status)).length})`, icon: Gavel },
            { id: 'sellers', label: `Seller Verification (${sellers.filter((s) => !s.seller_verified).length})`, icon: ShieldCheck },
            { id: 'audit', label: `Audit Trail (${auditLogs.length})`, icon: Lock },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                  active
                    ? 'bg-lime text-black shadow-glow'
                    : 'bg-surface text-secondaryText hover:text-white border border-surface-border'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: MARKETPLACE ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-3xl bg-surface border border-surface-border">
                <div className="flex items-center justify-between text-secondaryText text-xs font-bold uppercase tracking-wider">
                  <span>Gross Merchandise Vol</span>
                  <DollarSign className="w-4 h-4 text-lime" />
                </div>
                <div className="mt-2 text-2xl font-black text-white font-mono">
                  ${Number(analytics?.total_gmv || 0).toLocaleString()}
                </div>
                <p className="text-[11px] text-secondaryText mt-1">Paid & fulfilled orders</p>
              </div>

              <div className="p-5 rounded-3xl bg-surface border border-surface-border">
                <div className="flex items-center justify-between text-secondaryText text-xs font-bold uppercase tracking-wider">
                  <span>Platform Revenue</span>
                  <Sparkles className="w-4 h-4 text-lime" />
                </div>
                <div className="mt-2 text-2xl font-black text-lime font-mono">
                  ${Number(analytics?.platform_fee_earnings || 0).toLocaleString()}
                </div>
                <p className="text-[11px] text-secondaryText mt-1">
                  Rule: 0% (&lt;30 sales) • 6% standard
                </p>
              </div>

              <div className="p-5 rounded-3xl bg-surface border border-surface-border">
                <div className="flex items-center justify-between text-secondaryText text-xs font-bold uppercase tracking-wider">
                  <span>Active Live Shows</span>
                  <Radio className="w-4 h-4 text-coral animate-pulse" />
                </div>
                <div className="mt-2 text-2xl font-black text-coral font-mono">
                  {analytics?.active_streams || 0}
                </div>
                <p className="text-[11px] text-secondaryText mt-1">Live broadcasts on air</p>
              </div>

              <div className="p-5 rounded-3xl bg-surface border border-surface-border">
                <div className="flex items-center justify-between text-secondaryText text-xs font-bold uppercase tracking-wider">
                  <span>Open Disputes</span>
                  <Gavel className="w-4 h-4 text-amber-400" />
                </div>
                <div className="mt-2 text-2xl font-black text-amber-400 font-mono">
                  {analytics?.open_disputes || 0}
                </div>
                <p className="text-[11px] text-secondaryText mt-1">Requires mediator attention</p>
              </div>
            </div>

            {/* Orders By Status Grid */}
            <div className="p-6 rounded-3xl bg-surface border border-surface-border">
              <h3 className="text-sm font-bold text-white mb-4">Orders Lifecycle Distribution</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {Object.entries(analytics?.orders_by_status || {}).map(([st, cnt]) => (
                  <div key={st} className="p-3 rounded-2xl bg-background border border-surface-border text-center">
                    <span className="text-[10px] uppercase font-bold text-secondaryText">{st}</span>
                    <p className="text-lg font-black text-white font-mono mt-0.5">{String(cnt)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LIVE STREAM OVERSEER */}
        {activeTab === 'streams' && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Live Broadcast Monitoring</h2>
              <span className="text-xs text-secondaryText">Overseeing {streams.length} broadcasts</span>
            </div>

            {streams.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-surface border border-surface-border text-secondaryText text-xs">
                No broadcasts are currently live or scheduled.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {streams.map((show) => (
                  <div key={show.id} className="p-5 rounded-3xl bg-surface border border-surface-border flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          show.status === 'live' ? 'bg-coral text-white animate-pulse' : 'bg-surface-border text-secondaryText'
                        }`}>
                          {show.status}
                        </span>
                        <span className="text-[10px] font-mono text-secondaryText">{show.mode}</span>
                      </div>

                      <h3 className="text-sm font-bold text-white line-clamp-1">{show.title}</h3>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-secondaryText">Host:</span>
                        <span className="text-xs font-bold text-white">@{show.seller?.username || 'seller'}</span>
                        {show.seller?.seller_verified && <ShieldCheck className="w-3.5 h-3.5 text-biddrBlue" />}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-surface-border flex items-center justify-between gap-2">
                      <Link
                        href={`/live/${show.id}`}
                        target="_blank"
                        className="p-2 rounded-xl bg-background border border-surface-border text-secondaryText hover:text-white"
                        title="View Live Stream"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>

                      <div className="flex items-center gap-2">
                        {show.status === 'live' && (
                          <button
                            onClick={() => {
                              setSelectedStream(show);
                              setStreamActionType('pause');
                            }}
                            className="px-3 py-1.5 rounded-full border border-surface-border bg-background text-[11px] font-bold text-secondaryText hover:text-white"
                          >
                            Pause Show
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setSelectedStream(show);
                            setStreamActionType('terminate');
                          }}
                          className="px-3 py-1.5 rounded-full bg-coral hover:bg-coral/80 text-[11px] font-black text-white shadow-coral-glow"
                        >
                          Terminate Stream
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DISPUTE MEDIATION CENTER */}
        {activeTab === 'disputes' && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Dispute Mediation Queue</h2>
              <span className="text-xs text-secondaryText">{disputes.length} total dispute records</span>
            </div>

            {disputes.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-surface border border-surface-border text-secondaryText text-xs">
                Zero disputes pending resolution. Marketplace trust is in good standing!
              </div>
            ) : (
              <div className="space-y-4">
                {disputes.map((disp) => {
                  const isResolved = ['resolved_refund', 'resolved_release', 'dismissed', 'resolved_buyer', 'resolved_seller'].includes(disp.status);
                  return (
                    <div key={disp.id} className="p-5 rounded-3xl bg-surface border border-surface-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1.5 max-w-2xl">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            disp.status === 'open'
                              ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30'
                              : isResolved
                              ? 'bg-lime/20 text-lime border border-lime/30'
                              : 'bg-surface-border text-secondaryText'
                          }`}>
                            {disp.status}
                          </span>
                          <span className="text-xs font-bold text-white">Reason: {disp.reason}</span>
                          <span className="text-xs text-secondaryText font-mono">Order: {disp.order_id.slice(0, 8)}...</span>
                        </div>

                        <p className="text-xs text-secondaryText leading-relaxed">
                          <strong className="text-white">Buyer Description:</strong> &quot;{disp.description}&quot;
                        </p>

                        <div className="flex items-center gap-4 text-[11px] text-secondaryText">
                          <span>Buyer: <strong className="text-white">@{disp.order?.buyer?.username || 'buyer'}</strong></span>
                          <span>Seller: <strong className="text-white">@{disp.order?.seller?.username || 'seller'}</strong></span>
                          <span>Order Total: <strong className="text-lime font-mono">${Number(disp.order?.total_amount || 0).toLocaleString()}</strong></span>
                        </div>

                        {disp.resolution_notes && (
                          <p className="text-[11px] text-lime font-mono">
                            Resolution: &quot;{disp.resolution_notes}&quot;
                          </p>
                        )}
                      </div>

                      {!isResolved && (
                        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
                          <button
                            onClick={() => {
                              setSelectedDispute(disp);
                              setDisputeActionType('refund');
                              setRefundAmount(disp.order?.total_amount || '');
                            }}
                            className="px-3.5 py-2 rounded-full bg-coral hover:bg-coral/80 text-xs font-black text-white shadow-coral-glow"
                          >
                            Issue Refund
                          </button>

                          <button
                            onClick={() => {
                              setSelectedDispute(disp);
                              setDisputeActionType('release');
                            }}
                            className="px-3.5 py-2 rounded-full bg-lime hover:bg-lime-hover text-xs font-black text-black shadow-glow"
                          >
                            Release Funds
                          </button>

                          <button
                            onClick={() => {
                              setSelectedDispute(disp);
                              setDisputeActionType('dismiss');
                            }}
                            className="px-3.5 py-2 rounded-full border border-surface-border bg-background text-xs font-bold text-secondaryText hover:text-white"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SELLER VERIFICATION QUEUE */}
        {activeTab === 'sellers' && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Seller Trust & Verification Queue</h2>
              <span className="text-xs text-secondaryText">{sellers.length} registered sellers</span>
            </div>

            <div className="rounded-3xl bg-surface border border-surface-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-background text-secondaryText uppercase tracking-wider font-bold border-b border-surface-border">
                    <tr>
                      <th className="p-4">Seller</th>
                      <th className="p-4">Location</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {sellers.map((s) => (
                      <tr key={s.id} className="hover:bg-surface-hover/50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-2.5">
                            <span className="font-bold text-white">@{s.username}</span>
                            {s.seller_verified && <ShieldCheck className="w-4 h-4 text-biddrBlue" />}
                          </div>
                          <span className="text-[11px] text-secondaryText">{s.full_name || 'No full name'}</span>
                        </td>
                        <td className="p-4 text-secondaryText">{s.location || 'Unspecified'}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.seller_verified
                              ? 'bg-biddrBlue/20 text-biddrBlue border border-biddrBlue/30'
                              : 'bg-surface-border text-secondaryText'
                          }`}>
                            {s.seller_verified ? 'Verified Seller' : 'Pending Verification'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!s.seller_verified ? (
                              <button
                                onClick={() => {
                                  setSelectedSeller(s);
                                  setSellerActionType('approve');
                                }}
                                className="px-3 py-1.5 rounded-full bg-lime hover:bg-lime-hover text-[11px] font-black text-black shadow-glow"
                              >
                                Approve Badge
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedSeller(s);
                                  setSellerActionType('reject');
                                }}
                                className="px-3 py-1.5 rounded-full border border-coral/30 bg-coral/10 text-coral hover:bg-coral hover:text-white text-[11px] font-bold transition-all"
                              >
                                Revoke Badge
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: AUDIT TRAIL */}
        {activeTab === 'audit' && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Immutable Administrative Audit Log</h2>
              <span className="text-xs text-secondaryText font-mono">Append-Only Cryptographic Records</span>
            </div>

            <div className="rounded-3xl bg-surface border border-surface-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-background text-secondaryText uppercase tracking-wider font-bold border-b border-surface-border">
                    <tr>
                      <th className="p-4">Timestamp</th>
                      <th className="p-4">Actor</th>
                      <th className="p-4">Action</th>
                      <th className="p-4">Target</th>
                      <th className="p-4">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-secondaryText">No audit logs recorded yet.</td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-surface-hover/30">
                          <td className="p-4 text-secondaryText whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="p-4 text-white">@{log.actor?.username || 'system'}</td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 rounded bg-surface border border-surface-border text-lime text-[11px]">
                              {log.action}
                            </span>
                          </td>
                          <td className="p-4 text-secondaryText">{log.target_type}:{log.target_id.slice(0, 8)}...</td>
                          <td className="p-4 text-white max-w-xs truncate">{log.reason}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: STREAM MODERATION */}
      {selectedStream && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl border border-surface-border bg-surface p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white">
              {streamActionType === 'terminate' ? 'Force Terminate Broadcast' : 'Pause Live Show'}
            </h3>
            <p className="text-xs text-secondaryText mt-1">
              Show: <strong className="text-white">{selectedStream.title}</strong> (@{selectedStream.seller?.username})
            </p>

            <div className="mt-4 space-y-3">
              <label className="text-[11px] font-bold text-secondaryText uppercase tracking-wider">
                Mandatory Moderation Reason
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Inappropriate content, terms of service violation, seller request..."
                value={streamReason}
                onChange={(e) => setStreamReason(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border bg-background text-white text-xs focus:outline-none focus:border-lime"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedStream(null)}
                className="px-4 py-2 rounded-full border border-surface-border bg-background text-xs font-bold text-secondaryText hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading || !streamReason.trim()}
                onClick={handleModerateStream}
                className={`px-5 py-2 rounded-full text-xs font-black transition-all ${
                  streamActionType === 'terminate'
                    ? 'bg-coral text-white shadow-coral-glow'
                    : 'bg-lime text-black shadow-glow'
                }`}
              >
                {actionLoading ? 'Processing...' : `Confirm ${streamActionType}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DISPUTE RESOLUTION */}
      {selectedDispute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl border border-surface-border bg-surface p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white">
              {disputeActionType === 'refund'
                ? 'Issue Stripe Refund to Buyer'
                : disputeActionType === 'release'
                ? 'Release Funds to Seller'
                : 'Dismiss Dispute'}
            </h3>
            <p className="text-xs text-secondaryText mt-1">
              Order: <strong className="text-white">{selectedDispute.order?.item_title}</strong> (${selectedDispute.order?.total_amount})
            </p>

            {disputeActionType === 'refund' && (
              <div className="mt-4 space-y-1">
                <label className="text-[11px] font-bold text-secondaryText uppercase tracking-wider">
                  Refund Amount (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Total or partial amount"
                  className="w-full px-3.5 py-2 rounded-xl border border-surface-border bg-background text-white text-xs font-mono focus:outline-none focus:border-lime"
                />
              </div>
            )}

            <div className="mt-4 space-y-2">
              <label className="text-[11px] font-bold text-secondaryText uppercase tracking-wider">
                Mandatory Resolution Reason / Audit Note
              </label>
              <textarea
                rows={3}
                placeholder="State the evidence-based justification for this resolution..."
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border bg-background text-white text-xs focus:outline-none focus:border-lime"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedDispute(null)}
                className="px-4 py-2 rounded-full border border-surface-border bg-background text-xs font-bold text-secondaryText hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading || !disputeReason.trim()}
                onClick={handleResolveDispute}
                className="px-5 py-2 rounded-full bg-lime hover:bg-lime-hover text-xs font-black text-black shadow-glow"
              >
                {actionLoading ? 'Processing...' : 'Confirm Resolution'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SELLER VERIFICATION */}
      {selectedSeller && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl border border-surface-border bg-surface p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white">
              {sellerActionType === 'approve' ? 'Approve Seller Verification' : 'Revoke Seller Verification'}
            </h3>
            <p className="text-xs text-secondaryText mt-1">
              Seller: <strong className="text-white">@{selectedSeller.username}</strong>
            </p>

            <div className="mt-4 space-y-2">
              <label className="text-[11px] font-bold text-secondaryText uppercase tracking-wider">
                Verification Assessment Reason
              </label>
              <textarea
                rows={3}
                placeholder="Identity verified via government ID, track record inspection..."
                value={sellerReason}
                onChange={(e) => setSellerReason(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border bg-background text-white text-xs focus:outline-none focus:border-lime"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedSeller(null)}
                className="px-4 py-2 rounded-full border border-surface-border bg-background text-xs font-bold text-secondaryText hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading || !sellerReason.trim()}
                onClick={handleVerifySeller}
                className={`px-5 py-2 rounded-full text-xs font-black transition-all ${
                  sellerActionType === 'approve'
                    ? 'bg-lime text-black shadow-glow'
                    : 'bg-coral text-white shadow-coral-glow'
                }`}
              >
                {actionLoading ? 'Processing...' : `Confirm ${sellerActionType === 'approve' ? 'Approval' : 'Revocation'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
