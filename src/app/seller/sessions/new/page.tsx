'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Navbar, Footer } from '@/components';
import { createClient } from '@/lib/supabase/client';
import { validateSessionInput } from '@/lib/auction';
import type { AuctionDropRecord, AuctionMode } from '@/types';
import {
  ArrowLeft,
  Video,
  Clock,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

const DURATION_PRESETS = [
  { label: '30s (Rapid Drop)', value: 30 },
  { label: '60s (Standard)', value: 60 },
  { label: '90s (Featured)', value: 90 },
  { label: '2 Minutes', value: 120 },
  { label: '5 Minutes', value: 300 },
];

export default function NewSessionPage() {
  const router = useRouter();
  const supabase = createClient();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<AuctionMode>('catalogue_live');
  const [duration, setDuration] = useState<number>(60);
  const [availableDrops, setAvailableDrops] = useState<AuctionDropRecord[]>([]);
  const [selectedDropIds, setSelectedDropIds] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login?redirect=/seller/sessions/new');
        return;
      }
      setCurrentUser(user);

      // Fetch seller's available drops
      const { data } = await supabase
        .from('drops')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (data) {
        setAvailableDrops(data as any);
      }
      setLoading(false);
    }

    loadData();
  }, [router, supabase]);

  const toggleDropSelection = (dropId: string) => {
    setSelectedDropIds((prev) =>
      prev.includes(dropId) ? prev.filter((id) => id !== dropId) : [...prev, dropId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setErrors([]);

    // Validate using session engine
    const validation = validateSessionInput({
      sellerId: currentUser.id,
      title,
      description,
      mode,
      lotDurationSeconds: duration,
      dropIds: selectedDropIds,
    });

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setSubmitting(true);

    try {
      const now = new Date().toISOString();

      // 1. Insert session record
      const { data: sessionData, error: sessionError } = await supabase
        .from('auction_sessions')
        .insert({
          seller_id: currentUser.id,
          title: title.trim(),
          description: description.trim() || null,
          mode,
          status: 'scheduled',
          total_lots: selectedDropIds.length,
          current_lot_index: 0,
          created_at: now,
          updated_at: now,
        })
        .select('id')
        .single();

      if (sessionError || !sessionData) {
        throw sessionError || new Error('Failed to create session');
      }

      // 2. Insert lot records in sequence
      const lotInserts = selectedDropIds.map((dropId, idx) => ({
        session_id: sessionData.id,
        drop_id: dropId,
        lot_number: idx + 1,
        duration_seconds: duration,
        status: 'pending',
        created_at: now,
        updated_at: now,
      }));

      const { error: lotsError } = await supabase.from('auction_lots').insert(lotInserts);

      if (lotsError) {
        throw lotsError;
      }

      router.push(`/seller/live/${sessionData.id}`);
    } catch (err: any) {
      setErrors([err.message || 'Failed to create auction catalogue show.']);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-primaryText flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/seller/sessions"
            className="inline-flex items-center gap-2 text-xs font-bold text-secondaryText hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Auction Shows</span>
          </Link>
        </div>

        <div className="rounded-3xl border border-surface-border bg-surface p-6 sm:p-10 shadow-2xl">
          <div className="pb-6 border-b border-surface-border">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Create Auction Catalogue Show
            </h1>
            <p className="text-xs sm:text-sm text-secondaryText mt-1">
              Select your selling mode, configure per-item timers, and assemble your product catalogue.
            </p>
          </div>

          {errors.length > 0 && (
            <div className="mt-6 rounded-2xl border border-coral/30 bg-coral/10 p-4 text-xs text-coral space-y-1">
              {errors.map((err, i) => (
                <div key={i} className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{err}</span>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-8">
            {/* Show Details */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-secondaryText block mb-1.5">
                  Show Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Saturday Night Rare Vintage & Collectibles Showcase"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-2xl border border-surface-border bg-background px-4 py-3.5 text-sm font-bold text-white focus:border-lime focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-secondaryText block mb-1.5">
                  Show Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Tell buyers what items you'll be showcasing..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-2xl border border-surface-border bg-background p-4 text-xs text-white focus:border-lime focus:outline-none"
                />
              </div>
            </div>

            {/* Three Modes Selector */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-secondaryText block mb-3">
                Select Selling Experience Mode *
              </label>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setMode('catalogue_live')}
                  className={`p-5 rounded-3xl border text-left transition-all relative ${
                    mode === 'catalogue_live'
                      ? 'border-lime bg-lime/10 shadow-glow-sm'
                      : 'border-surface-border bg-background hover:border-surface-border/80'
                  }`}
                >
                  <span className="text-[10px] font-black uppercase tracking-wider text-lime block mb-1">
                    Signature Mode 1
                  </span>
                  <div className="text-sm font-bold text-white">Catalogue + Live Host</div>
                  <p className="text-[11px] text-secondaryText mt-1.5 leading-relaxed">
                    Livestream on camera. Biddr manages catalogue timers, bidding, and lot advancement automatically.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('catalogue_automated')}
                  className={`p-5 rounded-3xl border text-left transition-all relative ${
                    mode === 'catalogue_automated'
                      ? 'border-blue-400 bg-blue-500/10 shadow-glow-sm'
                      : 'border-surface-border bg-background hover:border-surface-border/80'
                  }`}
                >
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 block mb-1">
                    Signature Mode 2
                  </span>
                  <div className="text-sm font-bold text-white">Automated Catalogue</div>
                  <p className="text-[11px] text-secondaryText mt-1.5 leading-relaxed">
                    No camera. Biddr automatically runs through lots sequentially on automated server countdowns.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('host_controlled')}
                  className={`p-5 rounded-3xl border text-left transition-all relative ${
                    mode === 'host_controlled'
                      ? 'border-coral bg-coral/10 shadow-glow-sm'
                      : 'border-surface-border bg-background hover:border-surface-border/80'
                  }`}
                >
                  <span className="text-[10px] font-black uppercase tracking-wider text-coral block mb-1">
                    Signature Mode 3
                  </span>
                  <div className="text-sm font-bold text-white">Host-Controlled Live</div>
                  <p className="text-[11px] text-secondaryText mt-1.5 leading-relaxed">
                    You introduce each item on camera and manually press &quot;Start Bidding Round&quot; when ready.
                  </p>
                </button>
              </div>
            </div>

            {/* Per-Item Countdown Duration Preset */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-secondaryText block mb-3">
                Lot Countdown Duration *
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {DURATION_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setDuration(preset.value)}
                    className={`rounded-2xl border py-3 px-3 text-xs font-bold text-center transition-all ${
                      duration === preset.value
                        ? 'border-lime bg-lime text-black font-black shadow-glow-sm'
                        : 'border-surface-border bg-background text-secondaryText hover:text-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Select Catalogue Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold uppercase tracking-wider text-secondaryText">
                  Select Catalogue Lots ({selectedDropIds.length} selected) *
                </label>
                <Link href="/seller/auctions/new" className="text-xs font-bold text-lime hover:underline">
                  + Create More Items
                </Link>
              </div>

              {availableDrops.length === 0 ? (
                <div className="rounded-2xl border border-surface-border bg-background p-6 text-center text-xs text-secondaryText">
                  You don&apos;t have any drops created yet.{' '}
                  <Link href="/seller/auctions/new" className="text-lime font-bold hover:underline">
                    Create an auction first
                  </Link>
                  , then return to assemble your show.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto p-1">
                  {availableDrops.map((drop) => {
                    const isSelected = selectedDropIds.includes(drop.id);
                    const orderIndex = selectedDropIds.indexOf(drop.id) + 1;

                    return (
                      <div
                        key={drop.id}
                        onClick={() => toggleDropSelection(drop.id)}
                        className={`rounded-2xl border p-3 flex items-center gap-3 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-lime bg-lime/10'
                            : 'border-surface-border bg-background opacity-70 hover:opacity-100'
                        }`}
                      >
                        <div className="relative h-14 w-14 rounded-xl overflow-hidden border border-surface-border bg-surface flex-shrink-0">
                          <Image src={drop.image_url} alt={drop.title} fill className="object-cover" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-white line-clamp-1">{drop.title}</h4>
                          <div className="text-[11px] text-lime font-bold mt-0.5">
                            Start: ${Number(drop.starting_price).toLocaleString()}
                          </div>
                        </div>

                        <div
                          className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                            isSelected
                              ? 'bg-lime text-black shadow-glow-sm'
                              : 'border border-surface-border text-secondaryText'
                          }`}
                        >
                          {isSelected ? `#${orderIndex}` : '+'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="pt-4 border-t border-surface-border flex items-center justify-end gap-4">
              <Link
                href="/seller/sessions"
                className="rounded-full border border-surface-border bg-background px-6 py-3 text-xs font-bold text-secondaryText hover:text-white"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={submitting || selectedDropIds.length === 0}
                className="rounded-full bg-lime hover:bg-lime-hover px-8 py-3.5 text-xs font-black text-black shadow-glow transition-all disabled:opacity-50"
              >
                {submitting ? 'Creating Show...' : 'Launch Live Studio'}
              </button>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
