'use client';

import { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Navbar, Footer, CountdownTimer } from '@/components';
import { createClient } from '@/lib/supabase/client';
import { computeCatalogueState, canPerformSessionAction } from '@/lib/auction';
import type {
  AuctionSessionRecord,
  AuctionLotRecord,
  AuctionDropRecord,
  BidRecordWithBidder,
} from '@/types';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Play,
  Pause,
  SkipForward,
  FastForward,
  Flame,
  Clock,
  ShieldCheck,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Users,
} from 'lucide-react';

interface SellerLiveStudioProps {
  params: Promise<{ id: string }>;
}

export default function SellerLiveStudioPage({ params }: SellerLiveStudioProps) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [session, setSession] = useState<AuctionSessionRecord | null>(null);
  const [lots, setLots] = useState<AuctionLotRecord[]>([]);
  const [activeDrop, setActiveDrop] = useState<AuctionDropRecord | null>(null);
  const [bids, setBids] = useState<BidRecordWithBidder[]>([]);

  // Studio hardware state (Camera / Mic)
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionProcessing, setActionProcessing] = useState(false);
  const [studioMessage, setStudioMessage] = useState<string | null>(null);

  // 1. Load Session & Lots
  useEffect(() => {
    async function loadStudioData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push(`/login?redirect=/seller/live/${id}`);
        return;
      }
      setCurrentUser(user);

      // Fetch Session
      const { data: sessionData } = await supabase
        .from('auction_sessions')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (sessionData) {
        if (sessionData.seller_id !== user.id) {
          router.push('/seller/sessions');
          return;
        }
        setSession(sessionData as any);

        // Fetch Lots with Drop Details
        const { data: lotsData } = await supabase
          .from('auction_lots')
          .select(`
            *,
            drop:drops(*)
          `)
          .eq('session_id', id)
          .order('lot_number', { ascending: true });

        if (lotsData) {
          const formattedLots = lotsData as any;
          setLots(formattedLots);

          // Find active lot
          const active = formattedLots.find((l: any) => l.status === 'active');
          if (active?.drop) {
            setActiveDrop(active.drop);
          }
        }
      }
      setLoading(false);
    }

    loadStudioData();
  }, [id, router, supabase]);

  // 2. Realtime Subscriptions for Live Sessions, Lots and Bids
  useEffect(() => {
    const channel = supabase
      .channel(`studio-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'auction_sessions', filter: `id=eq.${id}` },
        (payload) => {
          if (payload.new) {
            setSession(payload.new as any);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'auction_lots', filter: `session_id=eq.${id}` },
        async () => {
          // Re-fetch lots to ensure relations are populated
          const { data } = await supabase
            .from('auction_lots')
            .select(`*, drop:drops(*)`)
            .eq('session_id', id)
            .order('lot_number', { ascending: true });
          if (data) {
            setLots(data as any);
            const active = (data as any).find((l: any) => l.status === 'active');
            if (active?.drop) {
              setActiveDrop(active.drop);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, supabase]);

  // 3. WebCam Video Stream Toggle
  const toggleCamera = async () => {
    if (cameraActive) {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
      setCameraActive(false);
      setMicActive(false);
    } else {
      try {
        setStreamError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraActive(true);
        setMicActive(true);
      } catch (err: any) {
        setStreamError('Camera permission denied or camera not found on this device.');
      }
    }
  };

  // 4. Studio Control Actions
  const handleStartShow = async () => {
    setActionProcessing(true);
    setStudioMessage(null);
    try {
      const { data, error } = await supabase.rpc('advance_catalogue_lot', { p_session_id: id });
      if (error) throw error;
      setStudioMessage('Show is LIVE! Lot #1 has started countdown.');
    } catch (err: any) {
      setStudioMessage(err.message || 'Failed to start show.');
    } finally {
      setActionProcessing(false);
    }
  };

  const handleNextLot = async () => {
    setActionProcessing(true);
    try {
      const { data, error } = await supabase.rpc('advance_catalogue_lot', { p_session_id: id });
      if (error) throw error;
      setStudioMessage('Advanced to next catalogue lot.');
    } catch (err: any) {
      setStudioMessage(err.message || 'Failed to advance lot.');
    } finally {
      setActionProcessing(false);
    }
  };

  const handlePauseShow = async () => {
    setActionProcessing(true);
    try {
      await supabase.from('auction_sessions').update({ status: 'paused' }).eq('id', id);
      setSession((prev) => (prev ? { ...prev, status: 'paused' } : null));
      setStudioMessage('Show paused. Bidding is temporarily frozen.');
    } catch {
      // Handled
    } finally {
      setActionProcessing(false);
    }
  };

  const handleResumeShow = async () => {
    setActionProcessing(true);
    try {
      await supabase.from('auction_sessions').update({ status: 'live' }).eq('id', id);
      setSession((prev) => (prev ? { ...prev, status: 'live' } : null));
      setStudioMessage('Show resumed.');
    } catch {
      // Handled
    } finally {
      setActionProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-primaryText flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-lime animate-ping" />
            <span className="text-sm font-bold text-secondaryText">Entering Live Studio...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const catalogue = computeCatalogueState(lots);
  const isLive = session.status === 'live';
  const isPaused = session.status === 'paused';
  const isScheduled = session.status === 'scheduled';
  const isHostControlled = session.mode === 'host_controlled';

  return (
    <div className="min-h-screen bg-background text-primaryText flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 w-full">
        {/* Studio Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-surface-border">
          <div className="flex items-center gap-3">
            <Link
              href="/seller/sessions"
              className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-surface border border-surface-border text-secondaryText hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white">{session.title}</h1>
                {isLive && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-coral px-2.5 py-0.5 text-[10px] font-black text-white shadow-coral-glow">
                    <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                    LIVE ON AIR
                  </span>
                )}
                {isPaused && (
                  <span className="rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-black">
                    PAUSED
                  </span>
                )}
              </div>
              <p className="text-xs text-secondaryText">
                Mode:{' '}
                <strong className="text-white">
                  {session.mode === 'catalogue_live'
                    ? 'Catalogue + Live Host'
                    : session.mode === 'catalogue_automated'
                    ? 'Automated Catalogue'
                    : 'Host-Controlled Live Auction'}
                </strong>{' '}
                • Lot {catalogue.currentLotIndex} of {catalogue.totalLots}
              </p>
            </div>
          </div>

          {/* Master Live Controls */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {isScheduled && (
              <button
                onClick={handleStartShow}
                disabled={actionProcessing || catalogue.totalLots === 0}
                className="inline-flex items-center gap-2 rounded-full bg-lime hover:bg-lime-hover px-6 py-2.5 text-xs font-black text-black shadow-glow transition-all"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Go Live & Start Show</span>
              </button>
            )}

            {isLive && (
              <>
                <button
                  onClick={handlePauseShow}
                  disabled={actionProcessing}
                  className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface px-4 py-2.5 text-xs font-bold text-secondaryText hover:text-white"
                >
                  <Pause className="w-4 h-4" />
                  <span>Pause Show</span>
                </button>

                <button
                  onClick={handleNextLot}
                  disabled={actionProcessing}
                  className="inline-flex items-center gap-2 rounded-full bg-lime hover:bg-lime-hover px-5 py-2.5 text-xs font-black text-black shadow-glow transition-all"
                >
                  <FastForward className="w-4 h-4" />
                  <span>Advance to Next Lot</span>
                </button>
              </>
            )}

            {isPaused && (
              <button
                onClick={handleResumeShow}
                disabled={actionProcessing}
                className="inline-flex items-center gap-2 rounded-full bg-lime hover:bg-lime-hover px-6 py-2.5 text-xs font-black text-black shadow-glow"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Resume Show</span>
              </button>
            )}
          </div>
        </div>

        {/* Studio Status Toast */}
        {studioMessage && (
          <div className="mt-4 rounded-2xl border border-lime/30 bg-lime/10 p-4 text-xs text-lime flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{studioMessage}</span>
            </div>
            <button
              onClick={() => setStudioMessage(null)}
              className="text-xs text-secondaryText hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* 2-Column Studio Cockpit */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
          {/* Left Column: Live Video Broadcast Stage */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="relative aspect-video w-full rounded-3xl overflow-hidden border border-surface-border bg-black shadow-2xl flex items-center justify-center">
              {/* Actual Video Tag for WebCam */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
              />

              {!cameraActive && (
                <div className="text-center p-8">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-surface text-secondaryText border border-surface-border mb-3">
                    <Video className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-bold text-white">Live Camera Preview</h3>
                  <p className="text-xs text-secondaryText mt-1 max-w-sm">
                    {session.mode === 'catalogue_automated'
                      ? 'Automated catalogue mode runs without camera feed. Biddr handles item countdowns automatically.'
                      : 'Connect your smartphone or webcam to showcase products to viewers.'}
                  </p>
                  {session.mode !== 'catalogue_automated' && (
                    <button
                      onClick={toggleCamera}
                      className="mt-4 inline-flex items-center gap-2 rounded-full bg-lime px-5 py-2 text-xs font-bold text-black hover:bg-lime-hover shadow-glow"
                    >
                      <Video className="w-4 h-4" />
                      <span>Start Camera</span>
                    </button>
                  )}
                </div>
              )}

              {/* Hardware Overlay Bar */}
              {session.mode !== 'catalogue_automated' && cameraActive && (
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between bg-black/60 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10">
                  <div className="flex items-center gap-2 text-xs text-lime font-bold">
                    <span className="h-2 w-2 rounded-full bg-lime animate-ping" />
                    <span>Camera Live (WebRTC Preview)</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleCamera}
                      className="p-2 rounded-xl bg-surface border border-surface-border text-white hover:bg-surface-hover"
                    >
                      {cameraActive ? <Video className="w-4 h-4 text-lime" /> : <VideoOff className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {streamError && (
              <div className="rounded-2xl border border-coral/30 bg-coral/10 p-3 text-xs text-coral flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{streamError}</span>
              </div>
            )}

            {/* Current Active Lot Stage */}
            {activeDrop ? (
              <div className="rounded-3xl border border-surface-border bg-surface p-6 sm:p-8">
                <div className="flex items-center justify-between pb-4 border-b border-surface-border">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-lime bg-lime/10 border border-lime/30 px-2.5 py-0.5 rounded-full">
                      LOT #{catalogue.currentLotIndex} ACTIVE
                    </span>
                    <span className="text-xs text-secondaryText">{activeDrop.category}</span>
                  </div>

                  <span className="text-xs font-mono text-lime font-bold">
                    Min inc: +${activeDrop.min_increment}
                  </span>
                </div>

                <div className="flex items-start gap-4 mt-5">
                  <div className="relative h-24 w-24 rounded-2xl overflow-hidden border border-surface-border bg-background flex-shrink-0">
                    <Image src={activeDrop.image_url} alt={activeDrop.title} fill className="object-cover" />
                  </div>

                  <div className="flex-1">
                    <h2 className="text-xl font-black text-white">{activeDrop.title}</h2>
                    <p className="text-xs text-secondaryText mt-1 line-clamp-2">
                      {activeDrop.description || 'Pre-configured auction item.'}
                    </p>

                    <div className="mt-4 flex items-center gap-6">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-secondaryText block">
                          Current Highest Bid
                        </span>
                        <div className="text-2xl font-black text-lime mt-0.5">
                          ${Number(activeDrop.current_bid).toLocaleString()}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-secondaryText block">
                          Bids Placed
                        </span>
                        <div className="text-base font-bold text-coral mt-0.5 flex items-center gap-1">
                          <Flame className="w-4 h-4" />
                          <span>{activeDrop.bid_count} Bids</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Host Controlled "Start Bidding" Button */}
                {isHostControlled && isLive && (
                  <div className="mt-6 pt-6 border-t border-surface-border">
                    <button
                      onClick={handleStartShow}
                      className="w-full rounded-full bg-lime hover:bg-lime-hover py-3.5 text-xs font-black text-black shadow-glow"
                    >
                      Start Bidding Round for Lot #{catalogue.currentLotIndex}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-3xl border border-surface-border bg-surface p-8 text-center">
                <h3 className="text-base font-bold text-white">No active lot</h3>
                <p className="text-xs text-secondaryText mt-1">
                  {catalogue.isCompleted
                    ? 'All catalogue lots for this session have been completed.'
                    : 'Click "Go Live & Start Show" to begin the first lot.'}
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Catalogue Queue & Completed Lots */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Upcoming Catalogue Queue */}
            <div className="rounded-3xl border border-surface-border bg-surface p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-surface-border">
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  Catalogue Queue ({catalogue.upcomingLots.length} upcoming)
                </span>
                <span className="text-[11px] text-secondaryText font-mono">
                  {session.mode === 'catalogue_live' ? 'Auto Progressing' : 'Sequential'}
                </span>
              </div>

              <div className="mt-4 space-y-3 max-h-72 overflow-y-auto pr-1">
                {catalogue.upcomingLots.length === 0 ? (
                  <div className="py-8 text-center text-xs text-secondaryText">
                    No more upcoming lots in queue.
                  </div>
                ) : (
                  catalogue.upcomingLots.map((lot) => (
                    <div
                      key={lot.id}
                      className="rounded-2xl border border-surface-border bg-background p-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-surface border border-surface-border flex items-center justify-center text-xs font-bold text-lime flex-shrink-0">
                          #{lot.lot_number}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white line-clamp-1">
                            {lot.drop?.title || `Catalogue Item #${lot.lot_number}`}
                          </h4>
                          <span className="text-[11px] text-secondaryText">
                            Duration: {lot.duration_seconds}s
                          </span>
                        </div>
                      </div>

                      <span className="text-[11px] font-bold text-secondaryText">Pending</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Completed Lots Summary */}
            <div className="rounded-3xl border border-surface-border bg-surface p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-surface-border">
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  Completed Lots ({catalogue.completedLots.length})
                </span>
              </div>

              <div className="mt-4 space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {catalogue.completedLots.length === 0 ? (
                  <div className="py-6 text-center text-xs text-secondaryText">
                    No lots completed yet.
                  </div>
                ) : (
                  catalogue.completedLots.map((lot) => (
                    <div
                      key={lot.id}
                      className="rounded-xl border border-surface-border bg-background p-3 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-secondaryText">#{lot.lot_number}</span>
                        <span className="text-white line-clamp-1">{lot.drop?.title}</span>
                      </div>

                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                          lot.status === 'sold'
                            ? 'bg-lime/10 text-lime border border-lime/30'
                            : 'bg-surface-border text-secondaryText'
                        }`}
                      >
                        {lot.status}
                      </span>
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
