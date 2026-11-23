/**
 * BIDDR AUCTION ENGINE
 *
 * Core business rules, validation, anti-sniping extension, and winner determination.
 * Both client optimistic preview and server-side logic adhere to these exact invariants.
 */

export interface AuctionDrop {
  id: string;
  sellerId: string;
  title: string;
  startingPrice: number;
  currentBid: number;
  minIncrement: number;
  bidCount: number;
  status: 'draft' | 'scheduled' | 'live' | 'ended' | 'settled' | 'cancelled' | 'sold' | 'unsold';
  startsAt: number; // Unix timestamp ms
  endsAt: number;   // Unix timestamp ms
  winnerId?: string;
  winningBid?: number;
}

export interface BidRecord {
  id: string;
  dropId: string;
  bidderId: string;
  amount: number;
  timestamp: number; // Unix timestamp ms
}

export interface BidResult {
  success: boolean;
  drop?: AuctionDrop;
  bid?: BidRecord;
  error?: string;
  antiSnipeTriggered?: boolean;
}

export const ANTI_SNIPE_WINDOW_MS = 10_000; // 10 seconds
export const ANTI_SNIPE_EXTENSION_MS = 10_000; // 10 seconds

/**
 * Validates and places a bid on an auction drop.
 * Implements atomic checks and the 10-second anti-sniping rule.
 */
export function placeBid(
  drop: AuctionDrop,
  bidderId: string,
  amount: number,
  now: number = Date.now()
): BidResult {
  // Invariant 1: Auction must be live
  if (drop.status !== 'live') {
    return {
      success: false,
      error: `Auction is not active. Current status: ${drop.status}`,
    };
  }

  // Invariant 2: Current time must be before or equal to endsAt
  if (now > drop.endsAt) {
    return {
      success: false,
      error: 'Auction has already ended',
    };
  }

  // Invariant 3: Seller cannot bid on their own item
  if (drop.sellerId === bidderId) {
    return {
      success: false,
      error: 'Sellers cannot bid on their own drops',
    };
  }

  // Invariant 4: Minimum bid validation
  const minRequiredBid =
    drop.bidCount === 0
      ? drop.startingPrice
      : drop.currentBid + drop.minIncrement;

  if (amount < minRequiredBid) {
    return {
      success: false,
      error: `Bid amount $${amount} is below minimum increment requirement of $${minRequiredBid}`,
    };
  }

  // Invariant 5: Anti-sniping calculation
  // If bid is placed with less than 10 seconds remaining, extend clock by 10s
  const remainingTimeMs = drop.endsAt - now;
  let newEndsAt = drop.endsAt;
  let antiSnipeTriggered = false;

  if (remainingTimeMs < ANTI_SNIPE_WINDOW_MS) {
    newEndsAt = drop.endsAt + ANTI_SNIPE_EXTENSION_MS;
    antiSnipeTriggered = true;
  }

  const updatedDrop: AuctionDrop = {
    ...drop,
    currentBid: amount,
    bidCount: drop.bidCount + 1,
    endsAt: newEndsAt,
  };

  const newBid: BidRecord = {
    id: `bid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    dropId: drop.id,
    bidderId,
    amount,
    timestamp: now,
  };

  return {
    success: true,
    drop: updatedDrop,
    bid: newBid,
    antiSnipeTriggered,
  };
}

/**
 * Settles an auction once its countdown expires.
 * Determines the winning bidder and records the winning amount.
 */
export function settleAuction(
  drop: AuctionDrop,
  bids: BidRecord[],
  now: number = Date.now()
): { success: boolean; settledDrop?: AuctionDrop; error?: string } {
  if (now < drop.endsAt) {
    return {
      success: false,
      error: 'Cannot settle auction before expiration time',
    };
  }

  if (drop.status === 'settled') {
    return {
      success: false,
      error: 'Auction has already been settled',
    };
  }

  // No bids placed -> Ends unsold
  if (bids.length === 0 || drop.bidCount === 0) {
    return {
      success: true,
      settledDrop: {
        ...drop,
        status: 'unsold',
        winnerId: undefined,
        winningBid: undefined,
      },
    };
  }

  // Sort bids by amount descending, then by earliest timestamp for ties
  const sortedBids = [...bids].sort((a, b) => {
    if (b.amount !== a.amount) {
      return b.amount - a.amount;
    }
    return a.timestamp - b.timestamp;
  });

  const winningBid = sortedBids[0];

  return {
    success: true,
    settledDrop: {
      ...drop,
      status: 'settled',
      winnerId: winningBid.bidderId,
      winningBid: winningBid.amount,
    },
  };
}

/**
 * Calculates the exact minimum next bid required for a drop.
 */
export function calculateNextMinimumBid(drop: AuctionDrop): number {
  if (drop.bidCount === 0) {
    return drop.startingPrice;
  }
  return drop.currentBid + drop.minIncrement;
}

/**
 * Validates auction creation parameters.
 */
export interface CreateAuctionInput {
  sellerId: string;
  isSeller: boolean;
  title: string;
  category: string;
  startingPrice: number;
  minIncrement: number;
  startsAt?: number;
  endsAt: number;
  images: string[];
}

export function validateAuctionInput(input: CreateAuctionInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!input.sellerId) {
    errors.push('Seller ID is required');
  }

  if (!input.isSeller) {
    errors.push('User does not have verified seller privileges');
  }

  if (!input.title || input.title.trim().length < 4) {
    errors.push('Title must be at least 4 characters long');
  }

  if (!input.category || input.category === 'all') {
    errors.push('A valid marketplace category must be selected');
  }

  if (typeof input.startingPrice !== 'number' || isNaN(input.startingPrice) || input.startingPrice <= 0) {
    errors.push('Starting price must be a positive number greater than 0');
  }

  if (typeof input.minIncrement !== 'number' || isNaN(input.minIncrement) || input.minIncrement <= 0) {
    errors.push('Minimum bid increment must be greater than 0');
  }

  if (!input.endsAt || input.endsAt <= (input.startsAt || Date.now())) {
    errors.push('Auction end time must be after start time');
  }

  if (!input.images || input.images.length === 0) {
    errors.push('At least one product image is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Settles an auction and constructs the corresponding buyer/seller order record.
 */
export interface OrderRecord {
  id: string;
  dropId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  status: 'pending' | 'paid' | 'escrow_held' | 'shipped' | 'delivered' | 'released' | 'cancelled';
  createdAt: number;
}

export function settleAuctionWithOrder(
  drop: AuctionDrop,
  bids: BidRecord[],
  now: number = Date.now()
): {
  success: boolean;
  settledDrop?: AuctionDrop;
  order?: OrderRecord;
  error?: string;
} {
  const result = settleAuction(drop, bids, now);

  if (!result.success || !result.settledDrop) {
    return { success: false, error: result.error };
  }

  if (['settled', 'sold'].includes(result.settledDrop.status) && result.settledDrop.winnerId && result.settledDrop.winningBid) {
    const order: OrderRecord = {
      id: `ord_${now}_${Math.random().toString(36).substring(2, 7)}`,
      dropId: drop.id,
      buyerId: result.settledDrop.winnerId,
      sellerId: drop.sellerId,
      amount: result.settledDrop.winningBid,
      status: 'pending',
      createdAt: now,
    };

    return {
      success: true,
      settledDrop: result.settledDrop,
      order,
    };
  }

  return {
    success: true,
    settledDrop: result.settledDrop,
  };
}
