'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar, Footer, AuctionCard } from '@/components';
import { createClient } from '@/lib/supabase/client';
import { MARKETPLACE_CATEGORIES, type AuctionItem } from '@/types';
import { Search, Flame, Sparkles, Filter, SlidersHorizontal, ArrowUpDown } from 'lucide-react';

const FALLBACK_AUCTIONS: AuctionItem[] = [
  {
    id: 'auc-1',
    title: 'Teenage Engineering OP-1 Portable Synthesizer (Rev 2)',
    category: 'electronics',
    categoryLabel: 'Electronics & Gadgets',
    currentBid: 940,
    startingPrice: 300,
    bidCount: 29,
    endsAt: new Date(Date.now() + 1000 * 60 * 18).toISOString(),
    isLive: true,
    condition: 'Like New',
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
    endsAt: new Date(Date.now() + 1000 * 60 * 6).toISOString(),
    isLive: true,
    condition: 'Excellent Vintage',
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
    endsAt: new Date(Date.now() + 1000 * 60 * 45).toISOString(),
    isLive: true,
    condition: 'Brand New In Box',
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
    title: 'Fujifilm X100V Limited Black Edition (Mint Shutter Count 400)',
    category: 'electronics',
    categoryLabel: 'Electronics & Gadgets',
    currentBid: 1550,
    startingPrice: 600,
    bidCount: 51,
    endsAt: new Date(Date.now() + 1000 * 60 * 3).toISOString(),
    isLive: true,
    condition: 'Mint',
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
    title: '1998 Maison Margiela Artisanal Paint Splatter Raw Denim',
    category: 'vintage',
    categoryLabel: 'Thrift & Vintage',
    currentBid: 720,
    startingPrice: 150,
    bidCount: 23,
    endsAt: new Date(Date.now() + 1000 * 60 * 75).toISOString(),
    isLive: true,
    condition: 'Archive Grade',
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
    title: 'Nardi Deep Corn 350mm Perforated Leather Steering Wheel',
    category: 'automotive',
    categoryLabel: 'Car Parts & Accs',
    currentBid: 310,
    startingPrice: 100,
    bidCount: 14,
    endsAt: new Date(Date.now() + 1000 * 60 * 120).toISOString(),
    isLive: true,
    condition: 'Brand New',
    imageUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80',
    seller: {
      name: 'Track Proven Supply',
      handle: 'trackproven',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
      verified: false,
    },
  },
];

export default function MarketplacePage() {
  const supabase = createClient();

  const [auctions, setAuctions] = useState<AuctionItem[]>(FALLBACK_AUCTIONS);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'ending' | 'bids' | 'price_low' | 'price_high'>('ending');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAuctions() {
      try {
        const { data: drops, error } = await supabase
          .from('drops')
          .select(`
            *,
            seller:profiles!drops_seller_id_fkey(username, full_name, avatar_url, seller_verified)
          `)
          .in('status', ['live', 'scheduled', 'ended', 'sold'])
          .order('created_at', { ascending: false });

        if (!error && drops && drops.length > 0) {
          const dbAuctions: AuctionItem[] = drops.map((d: any) => ({
            id: d.id,
            title: d.title,
            category: d.category,
            categoryLabel: d.category,
            currentBid: Number(d.current_bid || d.starting_price || 0),
            startingPrice: Number(d.starting_price || 0),
            bidCount: d.bid_count || 0,
            endsAt: d.ends_at,
            isLive: d.status === 'live',
            isEnded: ['ended', 'settled', 'sold', 'unsold'].includes(d.status),
            condition: d.condition,
            location: d.location,
            imageUrl: d.image_url || (d.images && d.images[0]) || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80',
            seller: {
              name: d.seller?.full_name || d.seller?.username || 'Seller',
              handle: d.seller?.username || 'seller',
              avatar: d.seller?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
              verified: Boolean(d.seller?.seller_verified),
            },
          }));

          // Combine with fallback samples for rich marketplace experience
          setAuctions([...dbAuctions, ...FALLBACK_AUCTIONS]);
        }
      } catch (err) {
        // Fallback remains active
      } finally {
        setLoading(false);
      }
    }

    loadAuctions();
  }, [supabase]);

  // Filtering & Sorting
  const filtered = auctions.filter((item) => {
    const matchesCategory =
      selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.seller.handle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'ending') {
      return new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime();
    }
    if (sortBy === 'bids') {
      return b.bidCount - a.bidCount;
    }
    if (sortBy === 'price_low') {
      return a.currentBid - b.currentBid;
    }
    if (sortBy === 'price_high') {
      return b.currentBid - a.currentBid;
    }
    return 0;
  });

  return (
    <div className="min-h-screen bg-background text-primaryText flex flex-col">
      <Navbar />

      <main className="flex-1 pb-24">
        {/* Top Banner Header */}
        <section className="relative overflow-hidden border-b border-surface-border bg-gradient-to-b from-surface/80 to-background pt-12 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-96 h-48 bg-lime/10 blur-[120px] rounded-full pointer-events-none" />

          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-lime/30 bg-lime/10 px-3.5 py-1 text-xs font-bold text-lime mb-3">
                  <Flame className="w-3.5 h-3.5 text-coral" />
                  Live Marketplace
                </div>
                <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                  Explore Live Drops
                </h1>
                <p className="mt-2 text-sm sm:text-base text-secondaryText max-w-xl">
                  Discover rare collectibles, fashion archives, and enthusiast hardware. Every auction features
                  10-second anti-sniping protection and guaranteed escrow.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondaryText" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search drops, items, sellers..."
                  className="w-full rounded-2xl border border-surface-border bg-surface pl-11 pr-4 py-3 text-xs text-white placeholder-secondaryText/50 focus:border-lime focus:outline-none focus:ring-1 focus:ring-lime transition-all"
                />
              </div>
            </div>

            {/* Category Filter Pills & Sorting */}
            <div className="mt-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-t border-surface-border pt-6">
              {/* Category tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                {MARKETPLACE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`rounded-full px-4 py-2 text-xs font-bold whitespace-nowrap transition-all border ${
                      selectedCategory === cat.id
                        ? 'bg-lime text-black border-lime shadow-glow-sm'
                        : 'bg-surface text-secondaryText border-surface-border hover:text-white hover:border-white/20'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Sorting selector */}
              <div className="flex items-center gap-2 self-end lg:self-auto">
                <span className="text-xs text-secondaryText flex items-center gap-1 font-semibold">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  Sort:
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="rounded-xl border border-surface-border bg-surface px-3 py-1.5 text-xs font-bold text-white focus:border-lime focus:outline-none cursor-pointer"
                >
                  <option value="ending">Ending Soonest</option>
                  <option value="bids">Most Active Bids</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Auction Items Grid */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-10">
          <div className="flex items-center justify-between mb-6 text-xs text-secondaryText">
            <span>Showing <strong className="text-white">{sorted.length}</strong> active drops</span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-lime animate-pulse" />
              Realtime Bidding Engine Active
            </span>
          </div>

          {sorted.length === 0 ? (
            <div className="rounded-3xl border border-surface-border bg-surface p-12 text-center">
              <Filter className="w-8 h-8 text-secondaryText mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">No drops found</h3>
              <p className="mt-1 text-xs text-secondaryText">
                Try searching for another keyword or selecting a different category.
              </p>
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                }}
                className="mt-4 rounded-full bg-surface-hover border border-surface-border px-5 py-2 text-xs font-bold text-lime hover:border-lime"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {sorted.map((auction) => (
                <AuctionCard key={auction.id} auction={auction} />
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
