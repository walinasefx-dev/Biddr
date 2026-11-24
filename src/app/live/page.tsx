'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Navbar, Footer } from '@/components';
import { createClient } from '@/lib/supabase/client';
import type { AuctionSessionRecord } from '@/types';
import {
  Video,
  Play,
  Calendar,
  Clock,
  Sparkles,
  ShieldCheck,
  Flame,
  ArrowRight,
  Layers,
} from 'lucide-react';

export default function LiveDiscoveryHubPage() {
  const supabase = createClient();
  const [liveSessions, setLiveSessions] = useState<AuctionSessionRecord[]>([]);
  const [scheduledSessions, setScheduledSessions] = useState<AuctionSessionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSessions() {
      // 1. Fetch Live Sessions
      const { data: liveData } = await supabase
        .from('auction_sessions')
        .select(`
          *,
          seller:profiles!auction_sessions_seller_id_fkey(username, avatar_url, full_name, seller_verified)
        `)
        .eq('status', 'live')
        .order('started_at', { ascending: false });

      if (liveData) setLiveSessions(liveData as any);

      // 2. Fetch Scheduled Sessions
      const { data: schedData } = await supabase
        .from('auction_sessions')
        .select(`
          *,
          seller:profiles!auction_sessions_seller_id_fkey(username, avatar_url, full_name, seller_verified)
        `)
        .in('status', ['scheduled', 'paused'])
        .order('created_at', { ascending: false });

      if (schedData) setScheduledSessions(schedData as any);
      setLoading(false);
    }

    loadSessions();
  }, [supabase]);

  const getModeBadge = (mode: string) => {
    switch (mode) {
      case 'catalogue_live':
        return 'Catalogue + Live Host';
      case 'catalogue_automated':
        return 'Automated Catalogue';
      case 'host_controlled':
        return 'Host-Controlled Live';
      default:
        return mode;
    }
  };

  return (
    <div className="min-h-screen bg-background text-primaryText flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full">
        {/* Hub Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 border-b border-surface-border">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-coral uppercase tracking-wider mb-1">
              <Video className="w-4 h-4" />
              <span>Live Video Commerce & Shows</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Live Auction Shows
            </h1>
            <p className="text-sm text-secondaryText mt-1">
              Watch verified sellers showcase products on camera, bid in real-time, and discover sequential catalogue drops.
            </p>
          </div>

          <Link
            href="/seller/sessions/new"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-lime hover:bg-lime-hover px-6 py-3 text-xs font-black text-black shadow-glow transition-all self-start sm:self-auto"
          >
            <Video className="w-4 h-4" />
            <span>Host a Show</span>
          </Link>
        </div>

        {/* Live Now Broadcast Section */}
        <div className="mt-10">
          <div className="flex items-center justify-between pb-4 border-b border-surface-border">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-coral animate-ping" />
              <h2 className="text-xl font-black text-white">Live On Air Right Now</h2>
            </div>
            <span className="text-xs font-mono text-coral font-bold uppercase">
              {liveSessions.length} Shows Live
            </span>
          </div>

          {loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
              <span className="h-3 w-3 rounded-full bg-coral animate-ping" />
              <span className="text-sm font-bold text-secondaryText">Locating active broadcasts...</span>
            </div>
          ) : liveSessions.length === 0 ? (
            <div className="rounded-3xl border border-surface-border bg-surface p-12 text-center mt-6">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-coral/10 text-coral border border-coral/30 mb-4">
                <Video className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">No shows live at this moment</h3>
              <p className="text-xs text-secondaryText mt-1 max-w-sm mx-auto">
                Explore scheduled catalogue shows below or check out active marketplace drops.
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <Link
                  href="/auctions"
                  className="rounded-full bg-surface-hover hover:bg-surface border border-surface-border px-5 py-2.5 text-xs font-bold text-white transition-all"
                >
                  Browse Marketplace
                </Link>
                <Link
                  href="/seller/sessions/new"
                  className="rounded-full bg-coral hover:bg-red-600 px-5 py-2.5 text-xs font-black text-white shadow-coral-glow transition-all"
                >
                  Go Live as Seller
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
              {liveSessions.map((session) => (
                <div
                  key={session.id}
                  className="rounded-3xl border border-surface-border bg-surface overflow-hidden shadow-2xl flex flex-col justify-between group hover:border-coral/50 transition-all"
                >
                  <div className="relative aspect-video w-full bg-black flex items-center justify-center">
                    <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-coral px-3 py-1 text-[11px] font-black text-white shadow-coral-glow">
                        <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                        LIVE
                      </span>
                      <span className="text-[10px] font-bold text-white/90 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                        {getModeBadge(session.mode)}
                      </span>
                    </div>

                    <div className="text-center p-6">
                      <Play className="w-12 h-12 text-white/80 group-hover:scale-110 group-hover:text-coral transition-all mx-auto mb-2" />
                      <span className="text-xs font-bold text-white">Enter Live Room</span>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="relative h-8 w-8 rounded-full overflow-hidden border border-lime flex-shrink-0">
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
                        <div className="text-xs font-bold text-white flex items-center gap-1">
                          @{session.seller?.username || 'host'}
                          {session.seller?.seller_verified && (
                            <ShieldCheck className="w-3 h-3 text-biddrBlue" />
                          )}
                        </div>
                        <span className="text-[10px] text-secondaryText">Host</span>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-white line-clamp-1">{session.title}</h3>
                    <p className="text-xs text-secondaryText mt-1 line-clamp-2">
                      {session.description || 'Live timed auction showcase.'}
                    </p>

                    <div className="mt-4 pt-4 border-t border-surface-border flex items-center justify-between">
                      <span className="text-xs text-secondaryText">
                        {session.total_lots} Catalogue Items
                      </span>
                      <Link
                        href={`/live/${session.id}`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-coral hover:bg-red-600 px-4 py-2 text-xs font-black text-white shadow-coral-glow transition-all"
                      >
                        <span>Join Show</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Catalogue Shows Section */}
        <div className="mt-16">
          <div className="flex items-center justify-between pb-4 border-b border-surface-border">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-lime" />
              <h2 className="text-xl font-black text-white">Scheduled Catalogue Shows</h2>
            </div>
            <span className="text-xs font-mono text-secondaryText">
              {scheduledSessions.length} Scheduled
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {scheduledSessions.map((session) => (
              <div
                key={session.id}
                className="rounded-3xl border border-surface-border bg-surface p-5 sm:p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-lime bg-lime/10 border border-lime/30 px-2.5 py-0.5 rounded-full">
                      {getModeBadge(session.mode)}
                    </span>
                    <span className="text-xs text-secondaryText font-medium">
                      {session.total_lots} Lots Prepared
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white">{session.title}</h3>
                  <p className="text-xs text-secondaryText mt-1 line-clamp-2">
                    {session.description || 'Upcoming automated catalogue auction show.'}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-surface-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="relative h-7 w-7 rounded-full overflow-hidden border border-surface-border flex-shrink-0">
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
                    <span className="text-xs font-bold text-white">
                      @{session.seller?.username || 'host'}
                    </span>
                  </div>

                  <Link
                    href={`/live/${session.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-surface-hover hover:bg-surface border border-surface-border px-4 py-2 text-xs font-bold text-white transition-all"
                  >
                    <span>View Show Schedule</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
