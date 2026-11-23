export interface Seller {
  name: string;
  handle: string;
  avatar: string;
  verified: boolean;
}

export type AuctionStatus =
  | 'draft'
  | 'scheduled'
  | 'live'
  | 'ended'
  | 'settled'
  | 'cancelled'
  | 'sold'
  | 'unsold';

export interface AuctionDropRecord {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  category: string;
  image_url: string;
  images: string[];
  condition: string;
  starting_price: number;
  current_bid: number;
  min_increment: number;
  bid_count: number;
  status: AuctionStatus;
  starts_at: string | null;
  ends_at: string;
  winner_id: string | null;
  winning_bid: number | null;
  location: string | null;
  shipping_information: string | null;
  created_at: string;
  updated_at: string;
  seller?: UserProfile;
}

export interface BidRecordWithBidder {
  id: string;
  drop_id: string;
  bidder_id: string;
  amount: number;
  created_at: string;
  bidder?: {
    username: string;
    avatar_url: string | null;
  };
}

export interface AuctionOrderRecord {
  id: string;
  drop_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  status: 'pending' | 'paid' | 'escrow_held' | 'shipped' | 'delivered' | 'released' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface AuctionItem {
  id: string;
  title: string;
  category: string;
  categoryLabel: string;
  currentBid: number;
  startingPrice: number;
  bidCount: number;
  endsAt: string;
  isLive: boolean;
  isEnded?: boolean;
  imageUrl: string;
  images?: string[];
  condition?: string;
  location?: string;
  seller: Seller;
  featured?: boolean;
}

export interface CategoryCard {
  id: string;
  name: string;
  tagline: string;
  description: string;
  itemCount: number;
  activeDrops: number;
  imageUrl: string;
  slug: string;
}

export interface UserProfile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  is_seller: boolean;
  seller_verified: boolean;
  created_at: string;
  updated_at: string;
}

export type WaitlistRole = 'buyer' | 'seller' | 'both';

export const MARKETPLACE_CATEGORIES = [
  { id: 'all', name: 'All Categories', slug: 'all' },
  { id: 'electronics', name: 'Electronics & Gadgets', slug: 'electronics' },
  { id: 'vintage', name: 'Thrift & Vintage', slug: 'vintage' },
  { id: 'automotive', name: 'Car Parts & Accessories', slug: 'automotive' },
  { id: 'collectibles', name: 'Collectibles & Art', slug: 'collectibles' },
  { id: 'watches', name: 'Luxury & Watches', slug: 'watches' },
] as const;
