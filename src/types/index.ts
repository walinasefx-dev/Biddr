export interface Seller {
  name: string;
  handle: string;
  avatar: string;
  verified: boolean;
}

export interface AuctionItem {
  id: string;
  title: string;
  category: 'electronics' | 'vintage' | 'automotive' | 'all';
  categoryLabel: string;
  currentBid: number;
  startingPrice: number;
  bidCount: number;
  endsAt: string; // ISO date or remaining seconds
  isLive: boolean;
  isEnded?: boolean;
  imageUrl: string;
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
