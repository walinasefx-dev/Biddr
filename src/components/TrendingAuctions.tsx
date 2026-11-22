'use client';

import { useState } from 'react';
import AuctionCard from './AuctionCard';
import type { AuctionItem } from '@/types';
import { Flame, Sparkles, Filter } from 'lucide-react';

const SAMPLE_AUCTIONS: AuctionItem[] = [
  {
    id: 'auc-1',
    title: 'Teenage Engineering OP-1 Portable Synthesizer (Rev 2)',
    category: 'electronics',
    categoryLabel: 'Electronics & Gadgets',
    currentBid: 940,
    startingPrice: 300,
    bidCount: 29,
    endsAt: '00:03:14',
    isLive: true,
    imageUrl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=800&q=80',
    seller: {
      name: 'Audio Lab',
      handle: 'audiolab',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      verified: true,
    },
  },
  {
    id: 'auc-2',
    title: '1994 Carhartt J97 Detroit Jacket Blanket-Lined (Moss Green)',
    category: 'vintage',
    categoryLabel: 'Thrift & Vintage',
    currentBid: 380,
    startingPrice: 80,
    bidCount: 42,
    endsAt: '00:01:22',
    isLive: true,
    imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=80',
    seller: {
      name: 'Vintage Workwear Co',
      handle: 'detroitworkwear',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      verified: true,
    },
  },
  {
    id: 'auc-3',
    title: 'Brembo GT 6-Piston Big Brake Kit (R34 GT-R / Supra A80)',
    category: 'automotive',
    categoryLabel: 'Car Parts & Accs',
    currentBid: 1850,
    startingPrice: 500,
    bidCount: 19,
    endsAt: '00:05:48',
    isLive: true,
    imageUrl: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80',
    seller: {
      name: 'JDM Heritage Garage',
      handle: 'jdmspares',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
      verified: true,
    },
  },
  {
    id: 'auc-4',
    title: 'Fujifilm X100V Limited Black Edition (Mint in Box with Shutter Count 400)',
    category: 'electronics',
    categoryLabel: 'Electronics & Gadgets',
    currentBid: 1550,
    startingPrice: 600,
    bidCount: 51,
    endsAt: '00:00:44',
    isLive: true,
    imageUrl: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=800&q=80',
    seller: {
      name: 'Tokyo Optics',
      handle: 'tokyo_cams',
      avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=150&q=80',
      verified: true,
    },
  },
  {
    id: 'auc-5',
    title: '1998 Maison Margiela Artisanal Paint Splatter Raw Denim (Size 32)',
    category: 'vintage',
    categoryLabel: 'Thrift & Vintage',
    currentBid: 720,
    startingPrice: 150,
    bidCount: 23,
    endsAt: '00:08:15',
    isLive: true,
    imageUrl: 'https://images.unsplash.com/photo-1542272604-780c96856592?auto=format&fit=crop&w=800&q=80',
    seller: {
      name: 'Archive Curator',
      handle: 'archivefinds',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      verified: true,
    },
  },
  {
    id: 'auc-6',
    title: 'Nardi Deep Corn 350mm Perforated Leather Steering Wheel with Titanium Screws',
    category: 'automotive',
    categoryLabel: 'Car Parts & Accs',
    currentBid: 310,
    startingPrice: 100,
    bidCount: 14,
    endsAt: '00:12:00',
    isLive: true,
    imageUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80',
    seller: {
      name: 'Track Proven Supply',
      handle: 'trackproven',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
      verified: false,
    },
  },
];

export default function TrendingAuctions() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredAuctions =
    selectedCategory === 'all'
      ? SAMPLE_AUCTIONS
      : SAMPLE_AUCTIONS.filter((item) => item.category === selectedCategory);

  return (
    <section id="trending" className="py-16 md:py-24 bg-background relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-coral mb-2">
              <Flame className="w-4 h-4 text-coral animate-pulse" />
              Live & Trending Drops
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Current Live Auctions
            </h2>
            <p className="mt-2 text-base text-secondaryText max-w-xl">
              Real-time timed drops featuring genuine collectibles, rare fashion, and enthusiast gear.
            </p>
          </div>

          {/* Demonstration Notice Pill */}
          <div className="inline-flex items-center gap-2 rounded-xl bg-surface border border-surface-border px-4 py-2 text-xs text-secondaryText self-start md:self-auto">
            <span className="h-2 w-2 rounded-full bg-lime" />
            <span>Interactive Demo Lot • Stage 1 Preview</span>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-none mb-8">
          {[
            { id: 'all', label: 'All Live Drops' },
            { id: 'electronics', label: 'Electronics & Gadgets' },
            { id: 'vintage', label: 'Thrift & Vintage' },
            { id: 'automotive', label: 'Car Parts & Accs' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={`rounded-full px-5 py-2.5 text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 border ${
                selectedCategory === tab.id
                  ? 'bg-lime text-black border-lime shadow-glow-sm'
                  : 'bg-surface text-secondaryText border-surface-border hover:text-white hover:border-white/20'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAuctions.map((auction) => (
            <AuctionCard key={auction.id} auction={auction} />
          ))}
        </div>

        {/* Bottom Banner */}
        <div className="mt-12 rounded-2xl border border-surface-border bg-surface/60 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime/10 border border-lime/30 text-lime flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Have rare or high-demand items to drop?</h4>
              <p className="text-xs text-secondaryText">
                Apply for our Founding Seller Program to host your own timed auctions with 0% fees.
              </p>
            </div>
          </div>
          <a
            href="#sellers"
            className="inline-flex items-center justify-center rounded-full bg-surface-hover hover:bg-lime hover:text-black border border-surface-border px-5 py-2.5 text-xs font-bold text-white transition-all duration-200 whitespace-nowrap"
          >
            Become a Seller
          </a>
        </div>
      </div>
    </section>
  );
}
