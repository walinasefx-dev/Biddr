'use client';

import { useState, useEffect, use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CountdownTimer from '@/components/CountdownTimer';
import { createClient } from '@/lib/supabase/client';
import {
  isValidUuid,
  isDemoAuctionId,
  getDemoAuction,
  getDemoBids,
} from '@/lib/auction/demo-auctions';
import type { AuctionDropRecord, BidRecordWithBidder } from '@/types';
import {
  ShieldCheck,
  Flame,
  ArrowLeft,
  Zap,
  MapPin,
  Package,
  History,
  Bookmark,
  BookmarkCheck,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface AuctionDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function AuctionDetailPage({ params }: AuctionDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const isDemo = isDemoAuctionId(id);
  const isReal = isValidUuid(id);

  const [drop, setDrop] = useState<AuctionDropRecord | null>(null);
  const [bids, setBids] = useState<BidRecordWithBidder[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [bidAmount, setBidAmount] = useState<number>(0);
  const [isPlacingBid, setIsPlacingBid] = useState(false);
  const [bidError, setBidError] = useState<string | null>(null);
  const [bidSuccess, setBidSuccess] = useState<string | null>(null);
  const [antiSnipeAlert, setAntiSnipeAlert] = useState(false);

  const [isWatched, setIsWatched] = useState(false);
  const [watchLoading, setWatchLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  // 1. Fetch Auction & Bid History
  useEffect(() => {
    async function loadAuctionData() {
      setLoading(true);

      // Current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);

      // CASE A: Demo / Showcase Auction (e.g. auc-1 through auc-6)
      // Completely bypasses Supabase queries to eliminate invalid UUID errors
      if (isDemo) {
        const demoDrop = getDemoAuction(id);
        if (demoDrop) {
          setDrop(demoDrop);
          setBidAmount(demoDrop.current_bid + demoDrop.min_increment);
          setBids(getDemoBids(id));

          // Check mock watchlist state in browser storage
          try {
            if (typeof window !== 'undefined') {
              const savedWatch = localStorage.getItem(`biddr_watch_${id}`);
              setIsWatched(Boolean(savedWatch));
            }
          } catch {
            // LocalStorage fallback
          }
        } else {
          setDrop(null);
        }
        setLoading(false);
        return;
      }

      // CASE B: Invalid Non-UUID string
      // Gracefully reject without sending malformed strings to PostgreSQL
      if (!isReal) {
        setDrop(null);
        setLoading(false);
        return;
      }

      // CASE C: Valid Database UUID
      // Safe to query Supabase tables and RPC functions
      try {
        // Check watchlist
        if (user) {
          const { data: watchItem } = await supabase
            .from('watchlist')
            .select('id')
            .eq('user_id', user.id)
            .eq('drop_id', id)
            .maybeSingle();
          setIsWatched(Boolean(watchItem));
        }

        // Fetch Drop
        const { data: dropData } = await supabase
          .from('drops')
          .select(`
            *,
            seller:profiles!drops_seller_id_fkey(*)
          `)
          .eq('id', id)
          .maybeSingle();

        if (dropData) {
          const record: AuctionDropRecord = {
            ...dropData,
            images:
              dropData.images && dropData.images.length > 0
                ? dropData.images
                : [
                    dropData.image_url ||
                      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1000&q=80',
                  ],
            starting_price: Number(dropData.starting_price),
            current_bid: Number(dropData.current_bid),
            min_increment: Number(dropData.min_increment || 5),
          };
          setDrop(record);

          // Pre-fill next minimum bid
          const nextMin =
            record.bid_count === 0
              ? record.starting_price
              : record.current_bid + record.min_increment;
          setBidAmount(nextMin);

          // Fetch Bids
          const { data: bidsData } = await supabase
            .from('bids')
            .select(`
              id, drop_id, bidder_id, amount, created_at,
              bidder:profiles!bids_bidder_id_fkey(username, avatar_url)
            `)
            .eq('drop_id', id)
            .order('amount', { ascending: false })
            .limit(20);

          if (bidsData) {
            setBids(bidsData as any);
          }
        } else {
          setDrop(null);
        }
      } catch (err: any) {
        setDrop(null);
      } finally {
        setLoading(false);
      }
    }

    loadAuctionData();
  }, [id, isDemo, isReal, supabase]);

  // 2. Real-Time Bid & Drop Updates (ONLY for real database UUIDs)
  useEffect(() => {
    // Only subscribe to Postgres change feeds if this is a valid database UUID
    if (!isReal) {
      return;
    }

    const channel = supabase
      .channel(`auction-${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bids', filter: `drop_id=eq.${id}` },
        async (payload) => {
          const newBid = payload.new as any;

          // Fetch bidder username
          const { data: bidderProfile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', newBid.bidder_id)
            .maybeSingle();

          const formattedBid: BidRecordWithBidder = {
            id: newBid.id,
            drop_id: newBid.drop_id,
            bidder_id: newBid.bidder_id,
            amount: Number(newBid.amount),
            created_at: newBid.created_at,
            bidder: bidderProfile || { username: 'bidder', avatar_url: null },
          };

          setBids((prev) => [formattedBid, ...prev.filter((b) => b.id !== formattedBid.id)]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'drops', filter: `id=eq.${id}` },
        (payload) => {
          const updated = payload.new as any;
          setDrop((prev) => {
            if (!prev) return prev;
            const newBidAmt = Number(updated.current_bid);
            const prevBidAmt = prev.current_bid;

            if (newBidAmt > prevBidAmt) {
              setBidAmount(newBidAmt + Number(updated.min_increment || 5));
            }

            return {
              ...prev,
              current_bid: newBidAmt,
              bid_count: updated.bid_count,
              ends_at: updated.ends_at,
              status: updated.status,
              winner_id: updated.winner_id,
              winning_bid: updated.winning_bid,
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, isReal, supabase]);

  // 3. Handle Placing Bid
  const handlePlaceBid = async (e: React.FormEvent) => {
    e.preventDefault();
    setBidError(null);
    setBidSuccess(null);
    setAntiSnipeAlert(false);

    if (!currentUser) {
      router.push(`/login?redirect=/auction/${id}`);
      return;
    }

    if (!drop) return;

    const minRequired =
      drop.bid_count === 0 ? drop.starting_price : drop.current_bid + drop.min_increment;

    if (bidAmount < minRequired) {
      setBidError(`Minimum valid bid is $${minRequired.toLocaleString()}`);
      return;
    }

    setIsPlacingBid(true);

    // CASE A: Demo / Showcase mode
    // Simulate bid placement without querying Supabase
    if (isDemo) {
      setTimeout(() => {
        setDrop((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            current_bid: bidAmount,
            bid_count: prev.bid_count + 1,
          };
        });

        const newSimulatedBid: BidRecordWithBidder = {
          id: `demo-bid-${Date.now()}`,
          drop_id: id,
          bidder_id: currentUser.id,
          amount: bidAmount,
          created_at: new Date().toISOString(),
          bidder: {
            username: currentUser.email?.split('@')[0] || 'collector',
            avatar_url: null,
          },
        };

        setBids((prev) => [newSimulatedBid, ...prev]);
        setBidSuccess(
          `Demo bid of $${bidAmount.toLocaleString()} placed! (Showcase simulation mode)`
        );
        setBidAmount(bidAmount + drop.min_increment);
        setIsPlacingBid(false);
      }, 350);
      return;
    }

    // CASE B: Reject non-UUIDs before database RPC
    if (!isReal) {
      setBidError('Cannot place bid on an invalid auction ID.');
      setIsPlacingBid(false);
      return;
    }

    // CASE C: Real Database UUID -> Call atomic place_bid RPC
    try {
      const { data, error } = await supabase.rpc('place_bid', {
        p_drop_id: drop.id,
        p_amount: bidAmount,
      });

      if (error) {
        setBidError(error.message);
        setIsPlacingBid(false);
        return;
      }

      const result = data as any;
      if (result?.anti_snipe_triggered) {
        setAntiSnipeAlert(true);
        setBidSuccess(`Bid placed! Anti-snipe rule extended auction countdown by 10s.`);
      } else {
        setBidSuccess(`Success! Your bid of $${bidAmount.toLocaleString()} is currently highest.`);
      }

      // Update local state optimistically
      setDrop((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          current_bid: bidAmount,
          bid_count: prev.bid_count + 1,
          ends_at: result?.ends_at || prev.ends_at,
        };
      });

      setBidAmount(bidAmount + drop.min_increment);
      setIsPlacingBid(false);
    } catch (err: any) {
      setBidError(err.message || 'Failed to place bid. Please try again.');
      setIsPlacingBid(false);
    }
  };

  // 4. Handle Watchlist Toggle
  const handleToggleWatchlist = async () => {
    if (!currentUser) {
      router.push(`/login?redirect=/auction/${id}`);
      return;
    }

    // Demo Mode Watchlist Toggle (Local Storage Only)
    if (isDemo) {
      const nextWatched = !isWatched;
      setIsWatched(nextWatched);
      try {
        if (nextWatched) {
          localStorage.setItem(`biddr_watch_${id}`, '1');
        } else {
          localStorage.removeItem(`biddr_watch_${id}`);
        }
      } catch {
        // LocalStorage fallback
      }
      return;
    }

    // Reject non-UUIDs
    if (!isReal) return;

    setWatchLoading(true);
    try {
      if (isWatched) {
        await supabase
          .from('watchlist')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('drop_id', id);
        setIsWatched(false);
      } else {
        await supabase.from('watchlist').insert({ user_id: currentUser.id, drop_id: id });
        setIsWatched(true);
      }
    } catch {
      // Handled
    } finally {
      setWatchLoading(false);
    }
  };

  // 5. Handle Timer Expiration
  const handleAuctionFinished = async () => {
    if (drop && drop.status === 'live') {
      if (isDemo) {
        setDrop((prev) => (prev ? { ...prev, status: 'sold' } : null));
        return;
      }

      if (!isReal) return;

      try {
        const { data } = await supabase.rpc('settle_auction', { p_drop_id: drop.id });
        if (data) {
          setDrop((prev) => (prev ? { ...prev, status: data.status || 'sold' } : null));
        }
      } catch {
        // Settlement triggered
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-primaryText flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-lime animate-ping" />
            <span className="text-sm font-bold text-secondaryText">Loading auction details...</span>
          </div>
        </div>
      </div>
    );
  }

  // Graceful Auction Not Found state for invalid IDs
  if (!drop) {
    return (
      <div className="min-h-screen bg-background text-primaryText flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="max-w-md w-full rounded-3xl border border-surface-border bg-surface p-8 text-center shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-coral/10 text-coral border border-coral/30 mb-6">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Auction Not Found</h1>
            <p className="mt-3 text-xs sm:text-sm text-secondaryText leading-relaxed">
              The listing you are looking for does not exist or may have been concluded.
            </p>
            <div className="mt-8 pt-6 border-t border-surface-border">
              <Link
                href="/auctions"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-lime px-6 py-3 text-xs font-bold text-black hover:bg-lime-hover shadow-glow transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Browse Live Marketplace Drops</span>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const isLive = drop.status === 'live';
  const minRequiredBid =
    drop.bid_count === 0 ? drop.starting_price : drop.current_bid + drop.min_increment;

  return (
    <div className="min-h-screen bg-background text-primaryText flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/auctions"
            className="inline-flex items-center gap-2 text-xs font-bold text-secondaryText hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Marketplace</span>
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleWatchlist}
              disabled={watchLoading}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all border ${
                isWatched
                  ? 'bg-lime text-black border-lime'
                  : 'bg-surface text-secondaryText border-surface-border hover:text-white'
              }`}
            >
              {isWatched ? (
                <>
                  <BookmarkCheck className="w-3.5 h-3.5" />
                  <span>Watching</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Watch Auction</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Demo Showcase Notice Banner */}
        {isDemo && (
          <div className="mb-6 rounded-2xl border border-lime/30 bg-lime/10 px-4 py-3 flex items-center justify-between text-xs text-lime animate-in fade-in">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-lime flex-shrink-0" />
              <span className="font-extrabold uppercase tracking-wide">
                Interactive Showcase Drop
              </span>
              <span className="text-secondaryText hidden sm:inline">
                • Safe simulation mode (database queries bypassed)
              </span>
            </div>
            <span className="text-[11px] font-mono text-secondaryText bg-surface px-2 py-0.5 rounded-md border border-surface-border">
              Demo ID: {id}
            </span>
          </div>
        )}

        {/* 2-Column Product & Bidding Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left Column: Product Image Gallery & Details */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Main Stage Image */}
            <div className="relative aspect-[4/3] w-full rounded-3xl overflow-hidden border border-surface-border bg-surface shadow-2xl">
              <Image
                src={drop.images[activeImageIndex] || drop.image_url}
                alt={drop.title}
                fill
                priority
                className="object-cover"
              />

              {/* Status Badges Overlay */}
              <div className="absolute top-4 left-4 flex items-center gap-2">
                {isLive ? (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-coral px-3 py-1 text-xs font-extrabold text-white shadow-coral-glow">
                    <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                    LIVE AUCTION
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-surface-border px-3 py-1 text-xs font-bold text-secondaryText">
                    AUCTION CLOSED
                  </div>
                )}

                <span className="rounded-full bg-black/80 px-3 py-1 text-xs font-semibold text-secondaryText border border-white/10 backdrop-blur-md">
                  {drop.category}
                </span>
              </div>
            </div>

            {/* Thumbnail Gallery Row */}
            {drop.images.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {drop.images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative h-20 w-24 rounded-2xl overflow-hidden border-2 flex-shrink-0 transition-all ${
                      activeImageIndex === idx
                        ? 'border-lime shadow-glow-sm'
                        : 'border-surface-border opacity-70 hover:opacity-100'
                    }`}
                  >
                    <Image src={img} alt={`Preview ${idx + 1}`} fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Description & Condition Card */}
            <div className="rounded-3xl border border-surface-border bg-surface p-6 sm:p-8">
              <h2 className="text-xl font-bold text-white mb-4">Lot Information & Details</h2>
              <p className="text-sm text-secondaryText leading-relaxed whitespace-pre-line">
                {drop.description || 'No description provided by seller.'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-surface-border">
                <div className="rounded-2xl border border-surface-border bg-background p-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-secondaryText">
                    Item Condition
                  </span>
                  <div className="text-sm font-bold text-white mt-1">
                    {drop.condition || 'Pre-owned'}
                  </div>
                </div>

                <div className="rounded-2xl border border-surface-border bg-background p-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-secondaryText flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    Item Location
                  </span>
                  <div className="text-sm font-bold text-white mt-1">
                    {drop.location || 'United States'}
                  </div>
                </div>

                <div className="rounded-2xl border border-surface-border bg-background p-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-secondaryText flex items-center gap-1">
                    <Package className="w-3.5 h-3.5" />
                    Delivery / Escrow
                  </span>
                  <div className="text-sm font-bold text-white mt-1">Verified Escrow</div>
                </div>
              </div>
            </div>

            {/* Seller Info Card */}
            <div className="rounded-3xl border border-surface-border bg-surface p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative h-14 w-14 rounded-2xl overflow-hidden border border-lime shadow-glow-sm bg-surface-border flex-shrink-0">
                  <Image
                    src={
                      drop.seller?.avatar_url ||
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
                    }
                    alt={drop.seller?.username || 'Seller'}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">
                      {drop.seller?.full_name || `@${drop.seller?.username || 'seller'}`}
                    </h3>
                    {drop.seller?.seller_verified && (
                      <ShieldCheck className="w-4 h-4 text-biddrBlue" title="Verified Seller" />
                    )}
                  </div>
                  <div className="text-xs text-secondaryText mt-0.5">
                    @{drop.seller?.username || 'seller'} • Host of this drop
                  </div>
                </div>
              </div>

              {drop.seller?.username && (
                <Link
                  href={`/profile/${drop.seller.username}`}
                  className="rounded-full bg-surface-hover border border-surface-border px-4 py-2 text-xs font-bold text-white hover:border-lime"
                >
                  View Profile
                </Link>
              )}
            </div>
          </div>

          {/* Right Column: Sticky Bid Console & Countdown */}
          <div className="lg:col-span-5 flex flex-col gap-6 lg:sticky lg:top-28">
            <div className="rounded-3xl border border-surface-border bg-surface p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              {/* Radial glow */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-lime/10 blur-[80px] pointer-events-none" />

              {/* Product Title */}
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug">
                {drop.title}
              </h1>

              {/* Countdown Timer Block */}
              <div className="mt-6 pt-6 border-t border-surface-border">
                <span className="text-xs font-bold uppercase tracking-wider text-secondaryText block mb-2">
                  Auction Closing Time
                </span>
                <CountdownTimer
                  endsAt={drop.ends_at}
                  status={drop.status}
                  size="lg"
                  onEnd={handleAuctionFinished}
                />
              </div>

              {/* Price & Current Bid Banner */}
              <div className="mt-6 rounded-2xl bg-background border border-surface-border p-5 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-secondaryText">
                    Current Highest Bid
                  </span>
                  <div className="text-3xl sm:text-4xl font-black text-lime tracking-tight mt-1">
                    ${drop.current_bid.toLocaleString()}
                  </div>
                </div>

                <div className="text-right">
                  <div className="inline-flex items-center gap-1 text-xs font-bold text-coral bg-coral/10 px-2.5 py-1 rounded-full">
                    <Flame className="w-3.5 h-3.5" />
                    <span>{drop.bid_count} Bids Placed</span>
                  </div>
                  <div className="text-[11px] text-secondaryText font-medium mt-1">
                    Min Increment: +${drop.min_increment}
                  </div>
                </div>
              </div>

              {/* Anti-snipe Trigger Toast */}
              {antiSnipeAlert && (
                <div className="mt-4 rounded-2xl border border-coral/40 bg-coral/10 p-3.5 text-xs text-coral flex items-center gap-2.5 animate-pulse">
                  <Zap className="w-5 h-5 flex-shrink-0" />
                  <span>
                    <strong>Anti-Sniping Rule Active:</strong> The countdown has been extended by
                    10s to give bidders a fair response window!
                  </span>
                </div>
              )}

              {/* Feedback Alerts */}
              {bidError && (
                <div className="mt-4 rounded-2xl border border-coral/30 bg-coral/10 p-4 text-xs text-coral flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{bidError}</span>
                </div>
              )}

              {bidSuccess && (
                <div className="mt-4 rounded-2xl border border-lime/30 bg-lime/10 p-4 text-xs text-lime flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{bidSuccess}</span>
                </div>
              )}

              {/* Bid Form or Closed State */}
              {isLive ? (
                <form onSubmit={handlePlaceBid} className="mt-6 space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5 text-xs font-bold">
                      <span className="text-secondaryText">Your Offer ($ USD)</span>
                      <span className="text-lime">
                        Min next: ${minRequiredBid.toLocaleString()}
                      </span>
                    </div>

                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-lime">
                        $
                      </span>
                      <input
                        type="number"
                        min={minRequiredBid}
                        step={drop.min_increment}
                        required
                        value={bidAmount || ''}
                        onChange={(e) => setBidAmount(Number(e.target.value))}
                        className="w-full rounded-2xl border border-surface-border bg-background pl-9 pr-4 py-4 text-xl font-black text-white focus:border-lime focus:outline-none focus:ring-1 focus:ring-lime"
                      />
                    </div>
                  </div>

                  {/* Quick Bid Increment Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      minRequiredBid,
                      minRequiredBid + drop.min_increment * 2,
                      minRequiredBid + drop.min_increment * 5,
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setBidAmount(preset)}
                        className="rounded-xl border border-surface-border bg-surface-hover py-2 text-xs font-bold text-secondaryText hover:text-white hover:border-lime/40 transition-all"
                      >
                        ${preset.toLocaleString()}
                      </button>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={isPlacingBid}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-lime py-4 px-6 text-base font-extrabold text-black hover:bg-lime-hover hover:shadow-glow transition-all duration-300 disabled:opacity-50"
                  >
                    {isPlacingBid ? (
                      <span>Validating & Placing Bid...</span>
                    ) : (
                      <>
                        <span>Place Bid Now</span>
                        <Zap className="w-5 h-5" />
                      </>
                    )}
                  </button>

                  <div className="text-center text-[11px] text-secondaryText/80 pt-1">
                    {isDemo
                      ? 'Showcase preview mode • Safe simulation.'
                      : 'Bids are legally binding and processed atomically on server.'}
                  </div>
                </form>
              ) : (
                <div className="mt-6 rounded-2xl border border-surface-border bg-background p-6 text-center">
                  <div className="text-sm font-bold text-secondaryText">This auction has ended.</div>
                  {drop.winning_bid ? (
                    <div className="mt-2 text-lg font-black text-lime">
                      Sold for ${drop.winning_bid.toLocaleString()}
                    </div>
                  ) : (
                    <div className="mt-2 text-sm text-secondaryText">No bids were placed.</div>
                  )}
                </div>
              )}
            </div>

            {/* Live Bid History Card */}
            <div className="rounded-3xl border border-surface-border bg-surface p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-surface-border">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <History className="w-4 h-4 text-lime" />
                  <span>Real-Time Bid Log</span>
                </div>
                <span className="text-xs text-secondaryText font-mono">
                  {bids.length} recorded
                </span>
              </div>

              <div className="mt-4 divide-y divide-surface-border max-h-72 overflow-y-auto scrollbar-none">
                {bids.length === 0 ? (
                  <div className="py-6 text-center text-xs text-secondaryText">
                    No bids logged yet. Be the first to start the drop!
                  </div>
                ) : (
                  bids.map((b, idx) => (
                    <div key={b.id || idx} className="py-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono font-bold ${
                            idx === 0 ? 'text-lime text-sm' : 'text-white'
                          }`}
                        >
                          ${b.amount.toLocaleString()}
                        </span>
                        {idx === 0 && (
                          <span className="bg-lime/20 text-lime text-[10px] font-bold px-2 py-0.5 rounded">
                            HIGHEST
                          </span>
                        )}
                      </div>

                      <div className="text-right text-secondaryText">
                        <div className="font-semibold text-white/90">
                          @{b.bidder?.username ? `${b.bidder.username.substring(0, 3)}***` : 'bidder'}
                        </div>
                        <div className="text-[10px]">
                          {new Date(b.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
