import type { AuctionDropRecord, BidRecordWithBidder } from '@/types';

/**
 * UUID regex pattern validating standard RFC 4122 canonical UUIDs (v1 through v5).
 */
export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Broad hex UUID pattern supporting all 36-character hyphenated UUID formats accepted by PostgreSQL.
 */
export const POSTGRES_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates whether a given value is a syntactically valid PostgreSQL UUID.
 * Prevents non-UUID values (such as 'auc-4') from being sent to database queries.
 */
export function isValidUuid(id: unknown): id is string {
  if (typeof id !== 'string') return false;
  return POSTGRES_UUID_REGEX.test(id.trim());
}

/**
 * Checks whether an ID belongs to a demo/mock showcase auction.
 */
export function isDemoAuctionId(id: unknown): boolean {
  if (typeof id !== 'string') return false;
  const trimmed = id.trim();
  return trimmed.startsWith('auc-') || Object.prototype.hasOwnProperty.call(DEMO_AUCTIONS, trimmed);
}

/**
 * Authoritative Demo Showcase Catalog for IDs auc-1 through auc-6.
 * Provides complete mock data so the demo experience is rich and interactive
 * without ever executing a Supabase database query.
 */
export const DEMO_AUCTIONS: Record<string, AuctionDropRecord> = {
  'auc-1': {
    id: 'auc-1',
    seller_id: 'demo-seller-1',
    title: 'Teenage Engineering OP-1 Portable Synthesizer (Rev 2)',
    description:
      'The iconic portable synthesizer, sampler, and 4-track tape recorder. Rev 2 edition with updated display and enhanced FM radio receiver. Factory packed with original sync cable, overlay guides, and protective hard case.',
    category: 'electronics',
    image_url:
      'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80',
    ],
    condition: 'Like New (Open Box)',
    starting_price: 300,
    current_bid: 940,
    min_increment: 25,
    bid_count: 29,
    status: 'live',
    starts_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    ends_at: new Date(Date.now() + 1000 * 60 * 18).toISOString(),
    winner_id: null,
    winning_bid: null,
    location: 'Stockholm, Sweden',
    shipping_information: 'Insured DHL Express with signature required ($35)',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    updated_at: new Date().toISOString(),
    seller: {
      id: 'demo-seller-1',
      username: 'audiolab',
      full_name: 'Audio Lab Stockholm',
      avatar_url:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      bio: 'Electronic music studio hardware & boutique synthesizers.',
      location: 'Stockholm, Sweden',
      is_seller: true,
      seller_verified: true,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
  },
  'auc-2': {
    id: 'auc-2',
    seller_id: 'demo-seller-2',
    title: '1994 Carhartt J97 Detroit Jacket Blanket-Lined (Moss Green)',
    description:
      'Original 1994 Made-in-USA Carhartt J97 Detroit Jacket in highly sought-after MOS (Moss Green). Heavyweight 12oz duck canvas with authentic blanket lining and corduroy collar. Natural distressing with zero structural tears.',
    category: 'vintage',
    image_url:
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=1200&q=80',
    ],
    condition: 'Excellent Vintage',
    starting_price: 80,
    current_bid: 380,
    min_increment: 20,
    bid_count: 42,
    status: 'live',
    starts_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    ends_at: new Date(Date.now() + 1000 * 60 * 6).toISOString(),
    winner_id: null,
    winning_bid: null,
    location: 'Detroit, MI, USA',
    shipping_information: 'USPS Priority Mail with tracking & insurance ($18)',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    updated_at: new Date().toISOString(),
    seller: {
      id: 'demo-seller-2',
      username: 'detroitworkwear',
      full_name: 'Vintage Workwear Co',
      avatar_url:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      bio: 'Authentic 80s and 90s American workwear archives.',
      location: 'Detroit, MI',
      is_seller: true,
      seller_verified: true,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
  },
  'auc-3': {
    id: 'auc-3',
    seller_id: 'demo-seller-3',
    title: 'Brembo GT 6-Piston Big Brake Kit (R34 GT-R / Supra A80)',
    description:
      'Complete Brembo Gran Turismo front braking system with 380mm 2-piece cross-drilled floating discs, 6-piston monobloc calipers in signature Brembo Red, Goodridge stainless lines, and Ferodo DS2500 performance pads.',
    category: 'automotive',
    image_url:
      'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80',
    ],
    condition: 'Brand New (Sealed)',
    starting_price: 500,
    current_bid: 1850,
    min_increment: 50,
    bid_count: 19,
    status: 'live',
    starts_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    ends_at: new Date(Date.now() + 1000 * 60 * 45).toISOString(),
    winner_id: null,
    winning_bid: null,
    location: 'Yokohama, Japan',
    shipping_information: 'Heavy freight air courier with insurance ($120)',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
    updated_at: new Date().toISOString(),
    seller: {
      id: 'demo-seller-3',
      username: 'jdmspares',
      full_name: 'JDM Heritage Garage',
      avatar_url:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
      bio: 'Motorsport components & genuine Japanese tuning parts.',
      location: 'Yokohama, Japan',
      is_seller: true,
      seller_verified: true,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
  },
  'auc-4': {
    id: 'auc-4',
    seller_id: 'demo-seller-4',
    title: 'Fujifilm X100V Limited Black Edition (Shutter Count 400)',
    description:
      'Collector-grade Fujifilm X100V with 23mm F2 fixed lens and hybrid optical/electronic viewfinder. Low shutter count (400 actuations). Complete with Haoge square metal hood, B+W Nano UV filter, original strap, battery, box, and paperwork.',
    category: 'electronics',
    image_url:
      'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=1200&q=80',
    ],
    condition: 'Like New (Mint in Box)',
    starting_price: 600,
    current_bid: 1550,
    min_increment: 50,
    bid_count: 51,
    status: 'live',
    starts_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    ends_at: new Date(Date.now() + 1000 * 60 * 12).toISOString(),
    winner_id: null,
    winning_bid: null,
    location: 'Tokyo / Kyoto, Japan',
    shipping_information: 'Insured FedEx International Priority ($40)',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
    updated_at: new Date().toISOString(),
    seller: {
      id: 'demo-seller-4',
      username: 'tokyo_cams',
      full_name: 'Tokyo Optics Guild',
      avatar_url:
        'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=150&q=80',
      bio: 'Rare Japanese cameras & premium rangefinder accessories.',
      location: 'Tokyo, Japan',
      is_seller: true,
      seller_verified: true,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
  },
  'auc-5': {
    id: 'auc-5',
    seller_id: 'demo-seller-5',
    title: '1998 Maison Margiela Artisanal Paint Splatter Denim (Size 32)',
    description:
      'Archival 1998 Maison Martin Margiela Line 0 Artisanal hand-splattered raw indigo denim. Each garment was hand-treated in the Paris atelier. Original white stitch label intact with authentic serial provenance.',
    category: 'vintage',
    image_url:
      'https://images.unsplash.com/photo-1542272604-780c96856592?auto=format&fit=crop&w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1542272604-780c96856592?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1200&q=80',
    ],
    condition: 'Collector Grade',
    starting_price: 150,
    current_bid: 720,
    min_increment: 30,
    bid_count: 23,
    status: 'live',
    starts_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    ends_at: new Date(Date.now() + 1000 * 60 * 25).toISOString(),
    winner_id: null,
    winning_bid: null,
    location: 'Paris, France',
    shipping_information: 'Colissimo International Insured ($28)',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 50).toISOString(),
    updated_at: new Date().toISOString(),
    seller: {
      id: 'demo-seller-5',
      username: 'archivefinds',
      full_name: 'Archive Curator Paris',
      avatar_url:
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      bio: 'Fashion museum archives & 90s Belgian avant-garde curation.',
      location: 'Paris, France',
      is_seller: true,
      seller_verified: true,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
  },
  'auc-6': {
    id: 'auc-6',
    seller_id: 'demo-seller-6',
    title: 'Nardi Deep Corn 350mm Perforated Leather Steering Wheel',
    description:
      'Genuine Italian Nardi Deep Corn steering wheel with 80mm dish, perforated black leather with red cross-stitching, and brushed titanium spoke finish. Includes authentic Nardi horn button and certificate.',
    category: 'automotive',
    image_url:
      'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=1200&q=80',
    ],
    condition: 'Brand New (Sealed)',
    starting_price: 100,
    current_bid: 310,
    min_increment: 20,
    bid_count: 14,
    status: 'live',
    starts_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    ends_at: new Date(Date.now() + 1000 * 60 * 35).toISOString(),
    winner_id: null,
    winning_bid: null,
    location: 'Milan / Los Angeles',
    shipping_information: 'FedEx Insured Ground Delivery ($22)',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 60).toISOString(),
    updated_at: new Date().toISOString(),
    seller: {
      id: 'demo-seller-6',
      username: 'trackproven',
      full_name: 'Track Proven Supply',
      avatar_url:
        'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
      bio: 'Authentic cockpit & track components for enthusiast builds.',
      location: 'Los Angeles, CA',
      is_seller: true,
      seller_verified: true,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
  },
};

/**
 * Returns a demo auction by ID, or null if not found.
 */
export function getDemoAuction(id: string): AuctionDropRecord | null {
  return DEMO_AUCTIONS[id] || null;
}

/**
 * Generates realistic bid history for a demo auction without database queries.
 */
export function getDemoBids(id: string): BidRecordWithBidder[] {
  const auction = DEMO_AUCTIONS[id];
  if (!auction) return [];

  const basePrice = auction.current_bid;
  const inc = auction.min_increment;

  return [
    {
      id: `demo-bid-${id}-1`,
      drop_id: id,
      bidder_id: 'demo-bidder-1',
      amount: basePrice,
      created_at: new Date(Date.now() - 1000 * 45).toISOString(),
      bidder: { username: 'tokyovault', avatar_url: null },
    },
    {
      id: `demo-bid-${id}-2`,
      drop_id: id,
      bidder_id: 'demo-bidder-2',
      amount: Math.max(auction.starting_price, basePrice - inc),
      created_at: new Date(Date.now() - 1000 * 180).toISOString(),
      bidder: { username: 'archive_enthusiast', avatar_url: null },
    },
    {
      id: `demo-bid-${id}-3`,
      drop_id: id,
      bidder_id: 'demo-bidder-3',
      amount: Math.max(auction.starting_price, basePrice - inc * 2),
      created_at: new Date(Date.now() - 1000 * 360).toISOString(),
      bidder: { username: 'collector_nyc', avatar_url: null },
    },
  ];
}
