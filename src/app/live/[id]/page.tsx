'use client';

import { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Navbar, Footer, CountdownTimer } from '@/components';
import { FollowButton } from '@/components/social';
import { LiveChatBox, LiveReactions } from '@/components/live';
import { createClient } from '@/lib/supabase/client';
import type {
  AuctionSessionRecord,
  AuctionLotRecord,
  AuctionDropRecord,
  BidRecordWithBidder,
} from '@/types';
import {
  Video,
  Play,
  Volume2,
  VolumeX,
  Maximize2,
  Radio,
  Flame,
  Clock,
  ShieldCheck,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Users,
  Layers,
  Zap,
  ShoppingBag,
  ExternalLink,
} from 'lucide-react';

interface LiveRoomPageProps {
  params: Promise<{ id: string }>;
}

export default function LiveRoomPage({ params }: LiveRoomPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();

  // Authentication & User State
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Session & Lot Data
  const [session, setSession] = useState<AuctionSessionRecord | null>(null);
  const [lots, setLots] = useState<AuctionLotRecord[]>([]);
  const [activeLot, setActiveLot] = useState<AuctionLotRecord | null>(null);
  const [activeDrop, setActiveDrop] = useState<AuctionDropRecord | null>(null);
  const [bids, setBids] = useState<BidRecordWithBidder[]>([]);

  // Interactive Bidding Console State
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [isPlacingBid, setIsPlacingBid] = useState(false);
  const [bidFeedback, setBidFeedback] = useState<{ type: 'success' | 'error' | 'anti_snipe'; message: string } | null>(null);
  const [viewerWonLot, setViewerWonLot] = useState<AuctionLotRecord | null>(null);

  // Video Stage State
  const [isMuted, setIsMuted] = useState(true);
  const [viewerCount, setViewerCount] = useState(128);
  const [activeTab, setActiveTab] = useState<'chat' | 'catalogue'>('chat');
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [liveKitToken, setLiveKitToken] = useState<string | null>(null);
  const [isLiveKitActive, setIsLiveKitActive] = useState(false);

  // 1. Fetch Session, Lots, and Current User
  useEffect(() => {
    async function loadRoomData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);

      // Check if ID is UUID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

      if (!isUUID) {
        setupDemoSession(user);
        setLoading(false);
        return;
      }

      try {
        // Query Database Session
        const { data: sessionData, error: sessionErr } = await supabase
          .from('auction_sessions')
          .select(`
            *,
            seller:profiles!auction_sessions_seller_id_fkey(*)
          `)
          .eq('id', id)
          .maybeSingle();

        if (sessionErr || !sessionData) {
          setupDemoSession(user);
          setLoading(false);
          return;
        }

        setSession(sessionData as any);

        // Fetch Lots with Drops
        const { data: lotsData } = await supabase
          .from('auction_lots')
          .select(`
            *,
            drop:drops(*)
          `)
          .eq('session_id', id)
          .order('lot_number', { ascending: true });

        if (lotsData && lotsData.length > 0) {
          const formattedLots = lotsData as any;
          setLots(formattedLots);

          // Find active lot or fallback to first
          const current = formattedLots.find((l: any) => l.status === 'active') || formattedLots[0];
          setActiveLot(current);
          if (current?.drop) {
            setActiveDrop(current.drop);
            const nextMin = (current.drop.current_bid || current.drop.starting_price) + (current.drop.min_increment || 10);
            setBidAmount(nextMin);

            // Fetch bids for active lot
            const { data: bidsData } = await supabase
              .from('bids')
              .select(`
                id, drop_id, bidder_id, amount, created_at,
                bidder:profiles!bids_bidder_id_fkey(username, avatar_url)
              `)
              .eq('drop_id', current.drop.id)
              .order('amount', { ascending: false })
              .limit(15);

            if (bidsData) setBids(bidsData as any);
          }
        } else {
          setupDemoSession(user);
        }

        // Request LiveKit viewer stream token
        try {
          const res = await fetch('/api/live/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: id }),
          });
          const tokenData = await res.json();
          if (tokenData.success) {
            setLiveKitToken(tokenData.token);
            setIsLiveKitActive(tokenData.isConfigured);
          }
        } catch {
          // Handled
        }
      } catch {
        setupDemoSession(user);
      } finally {
        setLoading(false);
      }
    }

    loadRoomData();
  }, [id, supabase]);

  // Demo Fallback Setup
  const setupDemoSession = (user: any) => {
    setIsDemo(true);
    const mockSession: AuctionSessionRecord = {
      id: id,
      seller_id: 'mock-seller-id',
      title: 'Rare Japanese Timepieces & Streetwear Showcase',
      description: 'Live interactive auction showcasing rare vintage chronographs and grail streetwear jackets.',
      mode: 'catalogue_live',
      status: 'live',
      current_lot_index: 0,
      total_lots: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      seller: {
        id: 'mock-seller-id',
        username: 'tokyo_curator',
        full_name: 'Kenji Takahashi',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
        bio: 'Curator of vintage timepieces and archive streetwear.',
        location: 'Tokyo, Japan',
        seller_verified: true,
        follower_count: 3420,
        following_count: 140,
        is_seller: true,
        rating_avg: 4.95,
        review_count: 88,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };

    const mockDrop1: AuctionDropRecord = {
      id: 'mock-drop-1',
      seller_id: 'mock-seller-id',
      title: '1971 Seiko 6139-6002 "Pogue" Chronograph',
      description: 'Pristine original golden sunburst dial with tachymeter bezel. Serviced and authentic.',
      category: 'Watches',
      condition: 'Excellent',
      images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=80'],
      image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=80',
      starting_price: 350,
      current_bid: 520,
      min_increment: 25,
      bid_count: 8,
      status: 'live',
      starts_at: new Date().toISOString(),
      ends_at: new Date(Date.now() + 180000).toISOString(), // 3 minutes left
      winner_id: null,
      winning_bid: null,
      location: 'Tokyo, Japan',
      shipping_information: 'Worldwide express insured shipping',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mockDrop2: AuctionDropRecord = {
      id: 'mock-drop-2',
      seller_id: 'mock-seller-id',
      title: 'Undercover 2006 "T" Klaus Leather Biker',
      description: 'Archive collector piece in premium calfskin with custom brass hardware.',
      category: 'Streetwear',
      condition: 'Like New',
      images: ['https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1000&q=80'],
      image_url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1000&q=80',
      starting_price: 600,
      current_bid: 600,
      min_increment: 50,
      bid_count: 0,
      status: 'scheduled',
      starts_at: new Date().toISOString(),
      ends_at: new Date(Date.now() + 600000).toISOString(),
      winner_id: null,
      winning_bid: null,
      location: 'Tokyo, Japan',
      shipping_information: 'Worldwide express insured shipping',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mockDrop3: AuctionDropRecord = {
      id: 'mock-drop-3',
      seller_id: 'mock-seller-id',
      title: 'Vintage 1982 Casio Marlin W-36 Diver',
      description: 'Iconic digital diver with 100m water resistance. Flawless LCD display.',
      category: 'Watches',
      condition: 'Very Good',
      images: ['https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=1000&q=80'],
      image_url: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=1000&q=80',
      starting_price: 180,
      current_bid: 180,
      min_increment: 15,
      bid_count: 0,
      status: 'scheduled',
      starts_at: new Date().toISOString(),
      ends_at: new Date(Date.now() + 900000).toISOString(),
      winner_id: null,
      winning_bid: null,
      location: 'Tokyo, Japan',
      shipping_information: 'Worldwide express insured shipping',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mockLots: AuctionLotRecord[] = [
      {
        id: 'mock-lot-1',
        session_id: id,
        drop_id: 'mock-drop-1',
        lot_number: 1,
        duration_seconds: 180,
        status: 'active',
        started_at: new Date().toISOString(),
        ends_at: mockDrop1.ends_at,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        drop: mockDrop1,
      },
      {
        id: 'mock-lot-2',
        session_id: id,
        drop_id: 'mock-drop-2',
        lot_number: 2,
        duration_seconds: 180,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        drop: mockDrop2,
      },
      {
        id: 'mock-lot-3',
        session_id: id,
        drop_id: 'mock-drop-3',
        lot_number: 3,
        duration_seconds: 180,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        drop: mockDrop3,
      },
    ];

    setSession(mockSession);
    setLots(mockLots);
    setActiveLot(mockLots[0]);
    setActiveDrop(mockDrop1);
    setBidAmount(mockDrop1.current_bid + mockDrop1.min_increment);

    setBids([
      {
        id: 'bid-1',
        drop_id: 'mock-drop-1',
        bidder_id: 'user-b1',
        amount: 520,
        created_at: new Date(Date.now() - 25000).toISOString(),
        bidder: { username: 'chrono_fanatic', avatar_url: null },
      },
      {
        id: 'bid-2',
        drop_id: 'mock-drop-1',
        bidder_id: 'user-b2',
        amount: 475,
        created_at: new Date(Date.now() - 60000).toISOString(),
        bidder: { username: 'osaka_vintage', avatar_url: null },
      },
      {
        id: 'bid-3',
        drop_id: 'mock-drop-1',
        bidder_id: 'user-b3',
        amount: 420,
        created_at: new Date(Date.now() - 110000).toISOString(),
        bidder: { username: 'watch_hunter', avatar_url: null },
      },
    ]);
  };

  // 2. Realtime Subscriptions for Real Database Sessions
  useEffect(() => {
    if (isDemo || !session) return;

    // Listen to session status changes & lot advances
    const sessionChannel = supabase
      .channel(`live-room-session-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'auction_sessions', filter: `id=eq.${id}` },
        (payload) => {
          setSession((prev) => (prev ? { ...prev, ...(payload.new as any) } : null));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'auction_lots', filter: `session_id=eq.${id}` },
        (payload) => {
          const updated = payload.new as any;
          setLots((prev) =>
            prev.map((lot) => (lot.id === updated.id ? { ...lot, ...updated } : lot))
          );
          if (updated.status === 'active') {
            setActiveLot(updated);
            if (updated.drop) setActiveDrop(updated.drop);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sessionChannel);
    };
  }, [id, isDemo, session, supabase]);

  // Realtime Bids Subscription on the active drop
  useEffect(() => {
    if (isDemo || !activeDrop) return;

    const bidChannel = supabase
      .channel(`live-room-bids-${activeDrop.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bids', filter: `drop_id=eq.${activeDrop.id}` },
        async (payload) => {
          const newBid = payload.new as any;
          // Fetch bidder details
          const { data: bidder } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', newBid.bidder_id)
            .maybeSingle();

          const fullBid: BidRecordWithBidder = {
            ...newBid,
            bidder: bidder || { username: 'bidder', avatar_url: null },
          };

          setBids((prev) => [fullBid, ...prev]);

          // Update active drop current bid
          setActiveDrop((prev) =>
            prev ? { ...prev, current_bid: newBid.amount, bid_count: prev.bid_count + 1 } : null
          );

          // Update next bid minimum
          setBidAmount(newBid.amount + (activeDrop.min_increment || 10));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bidChannel);
    };
  }, [activeDrop, isDemo, supabase]);

  // Dynamic Viewer Simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setViewerCount((prev) => {
        const delta = Math.floor(Math.random() * 5) - 2;
        return Math.max(45, prev + delta);
      });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // 3. Handle Placing Bid
  const handlePlaceBid = async (customAmount?: number) => {
    const amountToPlace = customAmount || bidAmount;
    setBidFeedback(null);

    if (!currentUser) {
      router.push(`/login?redirect=/live/${id}`);
      return;
    }

    if (!activeDrop) return;

    const minRequired = (activeDrop.current_bid || activeDrop.starting_price) + (activeDrop.min_increment || 10);
    if (amountToPlace < minRequired) {
      setBidFeedback({
        type: 'error',
        message: `Minimum valid bid is $${minRequired.toLocaleString()}`,
      });
      return;
    }

    setIsPlacingBid(true);

    // DEMO MODE BIDDING
    if (isDemo) {
      setTimeout(() => {
        const simulatedBid: BidRecordWithBidder = {
          id: `demo-bid-${Date.now()}`,
          drop_id: activeDrop.id,
          bidder_id: currentUser.id,
          amount: amountToPlace,
          created_at: new Date().toISOString(),
          bidder: {
            username: currentUser.email?.split('@')[0] || 'you',
            avatar_url: null,
          },
        };

        setBids((prev) => [simulatedBid, ...prev]);
        setActiveDrop((prev) =>
          prev ? { ...prev, current_bid: amountToPlace, bid_count: prev.bid_count + 1 } : null
        );

        setBidAmount(amountToPlace + (activeDrop.min_increment || 25));
        setBidFeedback({
          type: 'success',
          message: `Your bid of $${amountToPlace.toLocaleString()} is currently the highest bid!`,
        });
        setIsPlacingBid(false);
      }, 350);
      return;
    }

    // REAL PRODUCTION BIDDING VIA ATOMIC RPC
    try {
      const { data, error } = await supabase.rpc('place_bid', {
        p_drop_id: activeDrop.id,
        p_amount: amountToPlace,
      });

      if (error) {
        setBidFeedback({
          type: 'error',
          message: error.message,
        });
        setIsPlacingBid(false);
        return;
      }

      const result = data as any;
      if (result?.anti_snipe_triggered) {
        setBidFeedback({
          type: 'anti_snipe',
          message: 'Bid placed! Anti-snipe rule extended auction countdown by 10s.',
        });
      } else {
        setBidFeedback({
          type: 'success',
          message: `Success! Your bid of $${amountToPlace.toLocaleString()} is currently highest.`,
        });
      }

      // Optimistically update
      setActiveDrop((prev) =>
        prev
          ? {
              ...prev,
              current_bid: amountToPlace,
              bid_count: prev.bid_count + 1,
              ends_at: result?.ends_at || prev.ends_at,
            }
          : null
      );
      setBidAmount(amountToPlace + (activeDrop.min_increment || 10));
    } catch (err: any) {
      setBidFeedback({
        type: 'error',
        message: err.message || 'Failed to place bid',
      });
    } finally {
      setIsPlacingBid(false);
    }
  };

  const getModeTitle = (mode: string) => {
    switch (mode) {
      case 'catalogue_live':
        return 'Mode 1: Catalogue + Live Host';
      case 'catalogue_automated':
        return 'Mode 2: Automated Catalogue';
      case 'host_controlled':
        return 'Mode 3: Host-Controlled Live';
      default:
        return mode;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-primaryText flex flex-col justify-between">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="relative flex h-10 w-10 mb-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-coral opacity-75"></span>
            <span className="relative inline-flex rounded-full h-10 w-10 bg-coral flex items-center justify-center text-white">
              <Radio className="w-5 h-5 animate-pulse" />
            </span>
          </div>
          <h2 className="text-xl font-bold text-white">Connecting to Live Studio...</h2>
          <p className="text-sm text-secondaryText mt-1">
            Synchronizing audio/video stream and active lot catalogue.
          </p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background text-primaryText flex flex-col justify-between">
        <Navbar />
        <div className="flex-1 max-w-xl mx-auto flex flex-col items-center justify-center p-8 text-center">
          <AlertCircle className="w-12 h-12 text-coral mb-4" />
          <h2 className="text-2xl font-black text-white">Live Show Not Found</h2>
          <p className="text-sm text-secondaryText mt-2">
            This live broadcast session has ended or is no longer available.
          </p>
          <Link
            href="/live"
            className="mt-6 rounded-full bg-lime hover:bg-lime-hover px-6 py-2.5 text-xs font-black text-black shadow-glow transition-all"
          >
            Explore Live Shows
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const currentMinIncrement = activeDrop?.min_increment || 10;
  const currentHighestBid = activeDrop?.current_bid || activeDrop?.starting_price || 0;

  return (
    <div className="min-h-screen bg-background text-primaryText flex flex-col">
      <Navbar />

      {/* Main Live Stage Container */}
      <main className="flex-1 mx-auto max-w-[1600px] w-full px-2 sm:px-4 lg:px-6 py-4 flex flex-col">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-border">
          <div className="flex items-center gap-3">
            <Link
              href="/live"
              className="p-2 rounded-xl bg-surface hover:bg-surface-hover border border-surface-border text-secondaryText hover:text-white transition-colors"
              title="Back to Live Hub"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="flex items-center gap-2.5">
              <div className="relative h-9 w-9 rounded-full overflow-hidden border border-lime flex-shrink-0">
                <Image
                  src={
                    session.seller?.avatar_url ||
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
                  }
                  alt={session.seller?.username || 'Host'}
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/profile/${session.seller?.username || ''}`}
                    className="text-sm font-bold text-white hover:text-lime transition-colors flex items-center gap-1"
                  >
                    <span>@{session.seller?.username || 'host'}</span>
                    {session.seller?.seller_verified && (
                      <ShieldCheck className="w-3.5 h-3.5 text-biddrBlue" />
                    )}
                  </Link>

                  {session.seller?.id && (
                    <FollowButton
                      sellerId={session.seller.id}
                      size="sm"
                    />
                  )}
                </div>
                <h1 className="text-xs text-secondaryText line-clamp-1">{session.title}</h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Live Status Pill */}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-coral px-3 py-1 text-xs font-black text-white shadow-coral-glow">
              <span className="h-2 w-2 rounded-full bg-white animate-ping" />
              LIVE
            </span>

            {/* Viewer Count */}
            <div className="flex items-center gap-1.5 rounded-full bg-surface border border-surface-border px-3 py-1 text-xs font-semibold text-secondaryText">
              <Users className="w-3.5 h-3.5 text-lime" />
              <span className="font-mono text-white">{viewerCount}</span>
              <span className="hidden sm:inline">watching</span>
            </div>

            {/* Mode Badge */}
            <div className="hidden md:flex items-center gap-1 text-[11px] font-bold text-secondaryText bg-surface border border-surface-border px-3 py-1 rounded-full">
              <Layers className="w-3 h-3 text-biddrBlue" />
              <span>{getModeTitle(session.mode)}</span>
            </div>
          </div>
        </div>

        {/* 2-Column Responsive Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-3 flex-1">
          {/* LEFT 8 COLUMNS: Video Stage + Active Lot Commerce Console */}
          <div className="lg:col-span-8 flex flex-col gap-3">
            {/* Video Player Stage */}
            <div className="relative aspect-video w-full rounded-2xl sm:rounded-3xl bg-black overflow-hidden border border-surface-border shadow-2xl flex flex-col justify-between">
              {/* Broadcast Container Notice */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/60 pointer-events-none z-10" />

              {/* Dynamic Video Visuals / Simulated Stream Canvas */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-3 z-0">
                  <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-surface/40 backdrop-blur-md border border-white/10 text-coral">
                    <Radio className="w-10 h-10 animate-pulse" />
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-coral opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-coral"></span>
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-black text-white tracking-wide uppercase">
                      Live Host Broadcast Stage
                    </p>
                    <p className="text-xs text-white/60 font-mono">
                      WebRTC Low-Latency Stream • CDN Audio/Video Pipeline
                    </p>
                  </div>
                  {/* Subtle simulated soundwave visualizer */}
                  <div className="flex items-center justify-center gap-1 pt-2">
                    {[40, 70, 30, 90, 50, 80, 20, 60, 95, 45, 65, 35].map((h, i) => (
                      <span
                        key={i}
                        className="w-1 bg-lime rounded-full animate-pulse"
                        style={{
                          height: `${Math.max(8, (h * (isMuted ? 0.2 : 1)) / 3)}px`,
                          animationDelay: `${i * 0.15}s`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Video Top Controls Overlay */}
              <div className="relative z-20 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-black/60 backdrop-blur-md border border-white/10 px-2.5 py-1 text-[11px] font-mono font-bold text-white flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-coral animate-ping" />
                    BROADCASTING
                  </span>
                  {isDemo && (
                    <span className="rounded-full bg-lime/20 border border-lime/40 px-2.5 py-1 text-[10px] font-black text-lime uppercase tracking-wider">
                      Interactive Showcase Demo
                    </span>
                  )}
                  <span className="rounded-full bg-black/60 backdrop-blur-md border border-white/10 px-2.5 py-1 text-[10px] font-mono text-white/90 hidden sm:inline-flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${isLiveKitActive ? 'bg-lime' : 'bg-biddrBlue'}`} />
                    {isLiveKitActive ? 'LiveKit Cloud CDN Stream' : 'Low-Latency WebRTC Stream'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-2 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white hover:text-lime hover:scale-110 transition-all"
                    title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-lime" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!document.fullscreenElement) {
                        document.documentElement.requestFullscreen?.();
                      } else {
                        document.exitFullscreen?.();
                      }
                    }}
                    className="p-2 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white hover:text-lime hover:scale-110 transition-all"
                    title="Toggle Fullscreen"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Video Bottom Overlay: Floating Live Reactions */}
              <div className="relative z-20 p-4 flex items-end justify-between">
                <div className="max-w-[70%]">
                  <span className="text-[11px] font-bold text-white/80 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                    Host: @{session.seller?.username} is currently presenting Lot #{activeLot?.lot_number || 1}
                  </span>
                </div>

                {/* Floating Reactions Trigger */}
                <div className="flex items-center">
                  <LiveReactions sessionId={id} />
                </div>
              </div>
            </div>

            {/* ACTIVE CATALOGUE LOT HERO BANNER & BIDDING CONSOLE */}
            {activeDrop && activeLot && (
              <div className="rounded-2xl sm:rounded-3xl border border-surface-border bg-surface p-4 sm:p-5 shadow-2xl flex flex-col gap-4">
                {/* Active Lot Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-surface-border">
                  <div className="flex items-center gap-2.5">
                    <span className="rounded-lg bg-lime/10 border border-lime/30 px-2.5 py-1 text-xs font-black text-lime font-mono">
                      LOT #{activeLot.lot_number} OF {lots.length || session.total_lots}
                    </span>
                    <span className="text-xs text-secondaryText">
                      {activeDrop.category} • {activeDrop.condition || 'Mint Condition'}
                    </span>
                  </div>

                  {/* Countdown Timer with Anti-Snipe status */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 rounded-full bg-surface-hover border border-surface-border px-3 py-1">
                      <Clock className="w-3.5 h-3.5 text-coral" />
                      <span className="text-xs font-bold text-white">Time Left:</span>
                      <CountdownTimer
                        endsAt={activeDrop.ends_at}
                        status="live"
                        size="sm"
                        showIcon={false}
                      />
                    </div>
                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-biddrBlue bg-biddrBlue/10 border border-biddrBlue/30 px-2.5 py-1 rounded-full">
                      <ShieldCheck className="w-3 h-3" />
                      10s Anti-Snipe
                    </span>
                  </div>
                </div>

                {/* Lot Details & Quick Bidding Center */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  {/* Left: Thumbnail & Title */}
                  <div className="md:col-span-5 flex items-center gap-3">
                    <div className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-2xl overflow-hidden border border-surface-border bg-background flex-shrink-0">
                      <Image
                        src={
                          activeDrop.images?.[0] ||
                          activeDrop.image_url ||
                          'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=500&q=80'
                        }
                        alt={activeDrop.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-white line-clamp-2">
                        {activeDrop.title}
                      </h3>
                      <p className="text-xs text-secondaryText mt-1 line-clamp-1">
                        {activeDrop.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[11px] font-mono text-secondaryText">
                          Starting: ${activeDrop.starting_price.toLocaleString()}
                        </span>
                        <span className="text-[11px] font-mono text-secondaryText">•</span>
                        <span className="text-[11px] font-mono text-secondaryText">
                          {activeDrop.bid_count} {activeDrop.bid_count === 1 ? 'bid' : 'bids'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Current Bid Metric */}
                  <div className="md:col-span-3 rounded-2xl bg-surface-hover/50 border border-surface-border p-3 text-center sm:text-left">
                    <span className="text-[11px] font-semibold text-secondaryText uppercase tracking-wider block">
                      Current Highest Bid
                    </span>
                    <div className="text-2xl sm:text-3xl font-black text-lime font-mono tracking-tight mt-0.5">
                      ${currentHighestBid.toLocaleString()}
                    </div>
                    {bids.length > 0 && bids[0].bidder && (
                      <span className="text-[11px] text-secondaryText flex items-center justify-center sm:justify-start gap-1 mt-1">
                        <span>by</span>
                        <span className="text-white font-bold">@{bids[0].bidder.username}</span>
                      </span>
                    )}
                  </div>

                  {/* Right: Instant Bidding Actions */}
                  <div className="md:col-span-4 flex flex-col gap-2">
                    {/* Quick increment pills */}
                    <div className="flex items-center gap-1.5">
                      {[currentMinIncrement, currentMinIncrement * 2, currentMinIncrement * 4].map(
                        (inc) => {
                          const targetBid = currentHighestBid + inc;
                          return (
                            <button
                              key={inc}
                              type="button"
                              onClick={() => {
                                setBidAmount(targetBid);
                                handlePlaceBid(targetBid);
                              }}
                              disabled={isPlacingBid}
                              className="flex-1 py-1.5 px-2 rounded-xl bg-surface-hover hover:bg-white/10 border border-surface-border hover:border-lime/40 text-[11px] font-mono font-bold text-white transition-all text-center active:scale-95 disabled:opacity-50"
                            >
                              +${inc}
                            </button>
                          );
                        }
                      )}
                    </div>

                    {/* Main Bid Placement Trigger */}
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-secondaryText font-mono">
                          $
                        </span>
                        <input
                          type="number"
                          value={bidAmount || ''}
                          onChange={(e) => setBidAmount(Number(e.target.value))}
                          step={currentMinIncrement}
                          min={currentHighestBid + currentMinIncrement}
                          className="w-full rounded-full bg-background border border-surface-border pl-6 pr-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-lime"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handlePlaceBid()}
                        disabled={isPlacingBid}
                        className="rounded-full bg-lime hover:bg-lime-hover active:scale-95 px-5 py-2 text-xs font-black text-black shadow-glow transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 whitespace-nowrap"
                      >
                        <Zap className="w-3.5 h-3.5 fill-black" />
                        <span>{isPlacingBid ? 'Placing...' : 'Bid'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bidding Feedback Alert */}
                {bidFeedback && (
                  <div
                    className={`rounded-xl p-3 text-xs font-medium flex items-center gap-2 ${
                      bidFeedback.type === 'success'
                        ? 'bg-lime/10 text-lime border border-lime/30'
                        : bidFeedback.type === 'anti_snipe'
                        ? 'bg-biddrBlue/10 text-biddrBlue border border-biddrBlue/30'
                        : 'bg-coral/10 text-coral border border-coral/30'
                    }`}
                  >
                    {bidFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span>{bidFeedback.message}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT 4 COLUMNS: Interactive Live Sidebar (Chat + Catalogue Queue) */}
          <div className="lg:col-span-4 flex flex-col rounded-2xl sm:rounded-3xl border border-surface-border bg-surface overflow-hidden shadow-2xl h-[650px] lg:h-auto min-h-[500px]">
            {/* Sidebar Navigation Tabs */}
            <div className="flex border-b border-surface-border bg-background/50 p-1">
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                  activeTab === 'chat'
                    ? 'bg-surface text-white shadow-sm border border-surface-border'
                    : 'text-secondaryText hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-lime" />
                <span>Live Chat</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('catalogue')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                  activeTab === 'catalogue'
                    ? 'bg-surface text-white shadow-sm border border-surface-border'
                    : 'text-secondaryText hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-coral" />
                <span>Catalogue ({lots.length || session.total_lots})</span>
              </button>
            </div>

            {/* TAB CONTENT 1: Live Chat Box */}
            {activeTab === 'chat' && (
              <div className="flex-1 flex flex-col p-3 overflow-hidden">
                <LiveChatBox
                  sessionId={id}
                  sellerId={session.seller_id}
                  currentUser={currentUser}
                />
              </div>
            )}

            {/* TAB CONTENT 2: Catalogue Queue */}
            {activeTab === 'catalogue' && (
              <div className="flex-1 p-3 overflow-y-auto space-y-3">
                <div className="text-[11px] font-bold text-secondaryText uppercase tracking-wider mb-2">
                  Session Lots • Timed Progression
                </div>

                {lots.map((lot) => {
                  const dropItem = lot.drop;
                  const isActive = lot.status === 'active' || lot.id === activeLot?.id;
                  const isSold = lot.status === 'sold';
                  const isPending = lot.status === 'pending';

                  return (
                    <div
                      key={lot.id}
                      className={`rounded-2xl border p-3 transition-all flex items-center gap-3 ${
                        isActive
                          ? 'border-lime/60 bg-lime/5 shadow-glow'
                          : 'border-surface-border bg-background/60 hover:border-surface-border/80'
                      }`}
                    >
                      {/* Lot Thumbnail */}
                      <div className="relative h-14 w-14 rounded-xl overflow-hidden border border-surface-border bg-surface flex-shrink-0">
                        <Image
                          src={
                            dropItem?.images?.[0] ||
                            dropItem?.image_url ||
                            'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=300&q=80'
                          }
                          alt={dropItem?.title || `Lot #${lot.lot_number}`}
                          fill
                          className="object-cover"
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded ${
                              isActive
                                ? 'bg-lime text-black'
                                : isSold
                                ? 'bg-secondaryText/20 text-secondaryText'
                                : 'bg-surface text-white'
                            }`}
                          >
                            LOT #{lot.lot_number}
                          </span>
                          {isActive && (
                            <span className="text-[10px] font-bold text-lime animate-pulse">
                              • LIVE NOW
                            </span>
                          )}
                          {isSold && (
                            <span className="text-[10px] font-bold text-secondaryText">
                              • SOLD
                            </span>
                          )}
                        </div>

                        <h4 className="text-xs font-bold text-white truncate mt-1">
                          {dropItem?.title || `Catalogue Item #${lot.lot_number}`}
                        </h4>

                        <div className="flex items-center justify-between mt-1 text-[11px]">
                          <span className="font-mono text-lime font-bold">
                            ${(dropItem?.current_bid || dropItem?.starting_price || 0).toLocaleString()}
                          </span>
                          <span className="text-secondaryText text-[10px]">
                            {dropItem?.bid_count || 0} bids
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
