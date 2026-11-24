'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar, Footer } from '@/components';
import { createClient } from '@/lib/supabase/client';
import type { AuctionSessionRecord } from '@/types';
import {
  Video,
  Plus,
  Play,
  Clock,
  Sparkles,
  ArrowLeft,
  Calendar,
  Layers,
  CheckCircle2,
} from 'lucide-react';

export default function SellerSessionsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [sessions, setSessions] = useState<AuctionSessionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSessions() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login?redirect=/seller/sessions');
        return;
      }

      const { data } = await supabase
        .from('auction_sessions')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (data) {
        setSessions(data as any);
      }
      setLoading(false);
    }

    loadSessions();
  }, [router, supabase]);

  const getModeLabel = (mode: string) => {
    switch (mode) {
      case 'catalogue_live':
        return { label: 'Catalogue + Live Host', color: 'text-lime bg-lime/10 border-lime/30' };
      case 'catalogue_automated':
        return { label: 'Automated Catalogue', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' };
      case 'host_controlled':
        return { label: 'Host-Controlled Live Auction', color: 'text-coral bg-coral/10 border-coral/30' };
      default:
        return { label: mode, color: 'text-secondaryText bg-surface-border' };
    }
  };

  return (
    <div className="min-h-screen bg-background text-primaryText flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 border-b border-surface-border">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-lime uppercase tracking-wider mb-1">
              <Video className="w-4 h-4" />
              <span>Live Commerce & Catalogue Shows</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Auction Shows & Catalogues
            </h1>
            <p className="text-sm text-secondaryText mt-1">
              Prepare sequential catalogue auctions or host interactive live shows with your audience.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            <Link
              href="/seller"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-surface-hover hover:bg-surface border border-surface-border px-4 py-2.5 text-xs font-bold text-white transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Seller Studio</span>
            </Link>

            <Link
              href="/seller/sessions/new"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-lime hover:bg-lime-hover px-5 py-2.5 text-xs font-black text-black shadow-glow transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Show</span>
            </Link>
          </div>
        </div>

        {/* 3 Signature Selling Modes Callout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="rounded-3xl border border-lime/30 bg-lime/5 p-5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-lime block">
              Signature Mode 1
            </span>
            <h3 className="text-base font-bold text-white mt-1">Catalogue + Live Host</h3>
            <p className="text-xs text-secondaryText mt-1.5 leading-relaxed">
              You talk with your audience and showcase products on camera. Biddr manages catalogue timers and bidding automatically.
            </p>
          </div>

          <div className="rounded-3xl border border-blue-500/30 bg-blue-500/5 p-5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-400 block">
              Signature Mode 2
            </span>
            <h3 className="text-base font-bold text-white mt-1">Automated Catalogue</h3>
            <p className="text-xs text-secondaryText mt-1.5 leading-relaxed">
              No camera required. Biddr presents prepared items sequentially, accepts bids, and advances automatically when rounds end.
            </p>
          </div>

          <div className="rounded-3xl border border-coral/30 bg-coral/5 p-5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-coral block">
              Signature Mode 3
            </span>
            <h3 className="text-base font-bold text-white mt-1">Host-Controlled Live</h3>
            <p className="text-xs text-secondaryText mt-1.5 leading-relaxed">
              Full auctioneer control. You introduce each lot and manually click &quot;Start Bidding&quot; when the audience is ready.
            </p>
          </div>
        </div>

        {/* Session List */}
        <div className="mt-8 space-y-4">
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
              <span className="h-3 w-3 rounded-full bg-lime animate-ping" />
              <span className="text-sm font-bold text-secondaryText">Loading auction sessions...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-3xl border border-surface-border bg-surface p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-hover text-secondaryText border border-surface-border mb-4">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">No auction shows created yet</h3>
              <p className="text-xs text-secondaryText mt-1 max-w-sm mx-auto">
                Group multiple items into an automated catalogue or host a live auction show.
              </p>
              <div className="mt-6">
                <Link
                  href="/seller/sessions/new"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-lime px-6 py-2.5 text-xs font-black text-black hover:bg-lime-hover shadow-glow"
                >
                  Create Your First Show
                </Link>
              </div>
            </div>
          ) : (
            sessions.map((session) => {
              const modeMeta = getModeLabel(session.mode);
              const isLive = session.status === 'live';

              return (
                <div
                  key={session.id}
                  className="rounded-3xl border border-surface-border bg-surface p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 transition-all hover:border-surface-border/80"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${modeMeta.color}`}
                      >
                        {modeMeta.label}
                      </span>
                      {isLive ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-coral bg-coral/10 px-2.5 py-0.5 rounded-full border border-coral/30">
                          <span className="h-2 w-2 rounded-full bg-coral animate-ping" />
                          LIVE NOW
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-secondaryText bg-background px-2.5 py-0.5 rounded-full border border-surface-border">
                          {session.status.toUpperCase()}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-white mt-2">{session.title}</h3>
                    <p className="text-xs text-secondaryText mt-0.5 line-clamp-1">
                      {session.description || 'No description provided.'}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-secondaryText mt-3">
                      <span>{session.total_lots} Catalogue Items</span>
                      <span>•</span>
                      <span>Created {new Date(session.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-surface-border">
                    <Link
                      href={`/seller/live/${session.id}`}
                      className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-xs font-black transition-all ${
                        isLive
                          ? 'bg-coral text-white hover:bg-red-600 shadow-coral-glow'
                          : 'bg-lime text-black hover:bg-lime-hover shadow-glow'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{isLive ? 'Resume Live Studio' : 'Enter Live Studio'}</span>
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
