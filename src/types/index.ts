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
  is_fixed_price?: boolean;
  fixed_price?: number;
  inventory_count?: number;
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

export type OrderStatus =
  | 'pending'
  | 'awaiting_payment'
  | 'paid'
  | 'processing'
  | 'dispatched'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'disputed';

export type FulfillmentStatus = 'unfulfilled' | 'processing' | 'dispatched' | 'delivered';
export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'refunded';
export type OrderType = 'auction' | 'fixed_price';

export interface AuctionOrderRecord {
  id: string;
  drop_id: string | null;
  buyer_id: string;
  seller_id: string;
  order_type: OrderType;
  item_title: string;
  item_image_url: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  shipping_fee: number;
  total_amount: number;
  amount: number;
  status: OrderStatus;
  fulfillment_status: FulfillmentStatus;
  payment_status: PaymentStatus;
  payment_method?: string;
  payment_reference?: string;
  payment_due_at?: string;
  paid_at?: string | null;
  dispatched_at?: string | null;
  delivered_at?: string | null;
  shipping_name?: string | null;
  shipping_address?: string | null;
  shipping_city?: string | null;
  shipping_state?: string | null;
  shipping_postal_code?: string | null;
  shipping_country?: string | null;
  shipping_carrier?: string | null;
  tracking_number?: string | null;
  dispute_reason?: string | null;
  created_at: string;
  updated_at: string;
  buyer?: UserProfile;
  seller?: UserProfile;
  drop?: AuctionDropRecord;
}

export interface PaymentRecord {
  id: string;
  order_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  currency: string;
  provider: string;
  transaction_reference: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded';
  idempotency_key?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export type NotificationType =
  | 'outbid'
  | 'auction_won'
  | 'payment_required'
  | 'payment_confirmed'
  | 'order_dispatched'
  | 'order_delivered'
  | 'order_received'
  | 'dispute_raised'
  | 'catalogue_next_lot'
  | 'system';

export interface NotificationRecord {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link_url?: string | null;
  read: boolean;
  created_at: string;
}

export type AuctionMode = 'catalogue_live' | 'catalogue_automated' | 'host_controlled';
export type AuctionSessionStatus = 'draft' | 'scheduled' | 'live' | 'paused' | 'ended';

export interface AuctionSessionRecord {
  id: string;
  seller_id: string;
  title: string;
  description?: string | null;
  mode: AuctionMode;
  status: AuctionSessionStatus;
  current_lot_index: number;
  total_lots: number;
  scheduled_start?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  stream_url?: string | null;
  created_at: string;
  updated_at: string;
  seller?: UserProfile;
}

export interface AuctionLotRecord {
  id: string;
  session_id: string;
  drop_id: string;
  lot_number: number;
  duration_seconds: number;
  status: 'pending' | 'active' | 'sold' | 'unsold' | 'skipped';
  started_at?: string | null;
  ends_at?: string | null;
  created_at: string;
  updated_at: string;
  drop?: AuctionDropRecord;
}

export interface ReviewRecord {
  id: string;
  order_id: string;
  buyer_id: string;
  seller_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  buyer?: UserProfile;
}

export interface DisputeRecord {
  id: string;
  order_id: string;
  raised_by: string;
  reason: 'item_not_received' | 'item_damaged' | 'not_as_described' | 'unauthorized_charge' | 'other';
  description: string;
  status: 'open' | 'under_review' | 'resolved_buyer' | 'resolved_seller' | 'closed';
  resolution_notes?: string | null;
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
  rating_avg?: number;
  review_count?: number;
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
