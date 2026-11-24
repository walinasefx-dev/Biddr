import { describe, it, expect } from 'vitest';
import {
  placeBid,
  settleAuction,
  settleAuctionWithOrder,
  calculateNextMinimumBid,
  validateAuctionInput,
  isValidUuid,
  isDemoAuctionId,
  type AuctionDrop,
  type BidRecord,
  type CreateAuctionInput,
  ANTI_SNIPE_WINDOW_MS,
  ANTI_SNIPE_EXTENSION_MS,
} from '../../src/lib/auction/engine';
import { getDemoAuction, DEMO_AUCTIONS } from '../../src/lib/auction/demo-auctions';

describe('Stage 3: Marketplace & Auction Experience Test Suite', () => {
  const sellerId = 'seller-uuid-100';
  const buyer1Id = 'buyer-uuid-201';
  const buyer2Id = 'buyer-uuid-202';

  const mockDrop: AuctionDrop = {
    id: '22222222-2222-4222-a222-222222222202',
    sellerId,
    title: '1984 Leica M6 Classic Rangefinder Camera',
    startingPrice: 500,
    currentBid: 500,
    minIncrement: 50,
    bidCount: 0,
    status: 'live',
    startsAt: 1000000,
    endsAt: 2000000,
  };

  // -------------------------------------------------------------
  // 1. AUCTION CREATION & SELLER PERMISSION VALIDATION
  // -------------------------------------------------------------
  describe('Auction Creation & Input Validation', () => {
    it('1. should reject creation if the user is not a verified seller', () => {
      const input: CreateAuctionInput = {
        sellerId,
        isSeller: false,
        title: 'Sony FX3 Cinema Camera',
        category: 'electronics',
        startingPrice: 1200,
        minIncrement: 50,
        endsAt: Date.now() + 86400000,
        images: ['https://example.com/camera.jpg'],
      };

      const result = validateAuctionInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('User does not have verified seller privileges');
    });

    it('2. should reject invalid titles (empty or too short)', () => {
      const input: CreateAuctionInput = {
        sellerId,
        isSeller: true,
        title: 'Hi',
        category: 'electronics',
        startingPrice: 500,
        minIncrement: 25,
        endsAt: Date.now() + 86400000,
        images: ['https://example.com/camera.jpg'],
      };

      const result = validateAuctionInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Title must be at least 4 characters long');
    });

    it('3. should reject zero or negative starting price and bid increments', () => {
      const input: CreateAuctionInput = {
        sellerId,
        isSeller: true,
        title: 'Vintage Chronograph Watch',
        category: 'watches',
        startingPrice: -100,
        minIncrement: 0,
        endsAt: Date.now() + 86400000,
        images: ['https://example.com/watch.jpg'],
      };

      const result = validateAuctionInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Starting price must be a positive number greater than 0');
      expect(result.errors).toContain('Minimum bid increment must be greater than 0');
    });

    it('4. should reject end time before or equal to start time', () => {
      const now = Date.now();
      const input: CreateAuctionInput = {
        sellerId,
        isSeller: true,
        title: 'Macintosh 128K Computer',
        category: 'vintage',
        startingPrice: 800,
        minIncrement: 50,
        startsAt: now,
        endsAt: now - 1000, // in the past
        images: ['https://example.com/mac.jpg'],
      };

      const result = validateAuctionInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Auction end time must be after start time');
    });

    it('5. should reject auctions without any product images', () => {
      const input: CreateAuctionInput = {
        sellerId,
        isSeller: true,
        title: 'Porsche 911 GT3 Carbon Wing',
        category: 'automotive',
        startingPrice: 2000,
        minIncrement: 100,
        endsAt: Date.now() + 86400000,
        images: [],
      };

      const result = validateAuctionInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one product image is required');
    });

    it('6. should validate and approve a well-formed auction listing', () => {
      const input: CreateAuctionInput = {
        sellerId,
        isSeller: true,
        title: 'Rolex Submariner 16610 (1995 Full Set)',
        category: 'watches',
        startingPrice: 8500,
        minIncrement: 250,
        startsAt: Date.now(),
        endsAt: Date.now() + 86400000 * 3, // 3 days
        images: [
          'https://images.unsplash.com/photo-1523275335684-37898b6baf30',
          'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9',
        ],
      };

      const result = validateAuctionInput(input);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------
  // 2. BIDDING ENGINE & ATOMIC INCREMENTS
  // -------------------------------------------------------------
  describe('Atomic Bidding Engine & Increments', () => {
    it('7. should accept first bid equal to or above startingPrice when bidCount is 0', () => {
      const now = 1200000;
      // Drop has 0 bids. Starting price is 500.
      expect(calculateNextMinimumBid(mockDrop)).toBe(500);

      const result = placeBid(mockDrop, buyer1Id, 500, now);
      expect(result.success).toBe(true);
      expect(result.drop?.currentBid).toBe(500);
      expect(result.drop?.bidCount).toBe(1);
    });

    it('8. should calculate next minimum bid based on currentBid + minIncrement', () => {
      const activeDropWithBids: AuctionDrop = {
        ...mockDrop,
        currentBid: 500,
        bidCount: 1,
        minIncrement: 50,
      };

      const nextMin = calculateNextMinimumBid(activeDropWithBids);
      expect(nextMin).toBe(550); // 500 + 50
    });

    it('9. should reject bids lower than currentBid + minIncrement', () => {
      const activeDropWithBids: AuctionDrop = {
        ...mockDrop,
        currentBid: 500,
        bidCount: 1,
        minIncrement: 50,
      };

      const result = placeBid(activeDropWithBids, buyer2Id, 520, 1300000);
      expect(result.success).toBe(false);
      expect(result.error).toContain('below minimum increment requirement');
    });

    it('10. should prevent sellers from bidding on their own auction', () => {
      const result = placeBid(mockDrop, sellerId, 600, 1200000);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Sellers cannot bid on their own drops');
    });

    it('11. should prevent bidding on draft or ended drops', () => {
      const draftDrop: AuctionDrop = { ...mockDrop, status: 'draft' };
      const endedDrop: AuctionDrop = { ...mockDrop, status: 'ended' };

      const resDraft = placeBid(draftDrop, buyer1Id, 550, 1200000);
      expect(resDraft.success).toBe(false);
      expect(resDraft.error).toContain('Auction is not active');

      const resEnded = placeBid(endedDrop, buyer1Id, 550, 1200000);
      expect(resEnded.success).toBe(false);
      expect(resEnded.error).toContain('Auction is not active');
    });
  });

  // -------------------------------------------------------------
  // 3. ANTI-SNIPING EXTENSION INVARIANTS
  // -------------------------------------------------------------
  describe('Anti-Sniping Protection (10-Second Rule)', () => {
    it('12. should NOT extend timer if bid placed with >= 10 seconds remaining', () => {
      // endsAt = 2000000. 30 seconds remaining = 1970000
      const now = mockDrop.endsAt - 30000;
      const result = placeBid(mockDrop, buyer1Id, 500, now);

      expect(result.success).toBe(true);
      expect(result.antiSnipeTriggered).toBe(false);
      expect(result.drop?.endsAt).toBe(mockDrop.endsAt);
    });

    it('13. should extend timer by exactly 10 seconds if bid placed with < 10 seconds remaining', () => {
      // endsAt = 2000000. 5 seconds remaining = 1995000 (< 10s window)
      const now = mockDrop.endsAt - 5000;
      const result = placeBid(mockDrop, buyer1Id, 500, now);

      expect(result.success).toBe(true);
      expect(result.antiSnipeTriggered).toBe(true);
      expect(result.drop?.endsAt).toBe(mockDrop.endsAt + ANTI_SNIPE_EXTENSION_MS);
    });

    it('14. should cumulatively extend timer if subsequent bids land in the new extension window', () => {
      // First snipe at 1996000 (4s left)
      const snipe1Time = mockDrop.endsAt - 4000;
      const res1 = placeBid(mockDrop, buyer1Id, 500, snipe1Time);
      expect(res1.antiSnipeTriggered).toBe(true);

      const extendedEndsAt = res1.drop!.endsAt; // 2000000 + 10000 = 2010000

      // Counter-bid lands at 2008000 (2s left in the extended window)
      const counterBidTime = extendedEndsAt - 2000;
      const res2 = placeBid(res1.drop!, buyer2Id, 550, counterBidTime);

      expect(res2.success).toBe(true);
      expect(res2.antiSnipeTriggered).toBe(true);
      expect(res2.drop?.endsAt).toBe(extendedEndsAt + ANTI_SNIPE_EXTENSION_MS); // 2020000
    });
  });

  // -------------------------------------------------------------
  // 4. AUCTION SETTLEMENT & ORDER GENERATION
  // -------------------------------------------------------------
  describe('Auction Settlement & Post-Auction Order Creation', () => {
    it('15. should prevent settlement before the auction has ended', () => {
      const activeDrop: AuctionDrop = { ...mockDrop, currentBid: 700, bidCount: 2 };
      const bids: BidRecord[] = [
        { id: 'b1', dropId: activeDrop.id, bidderId: buyer1Id, amount: 600, timestamp: 1200000 },
        { id: 'b2', dropId: activeDrop.id, bidderId: buyer2Id, amount: 700, timestamp: 1300000 },
      ];

      // Current time is before endsAt
      const now = activeDrop.endsAt - 5000;
      const result = settleAuctionWithOrder(activeDrop, bids, now);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot settle auction before expiration time');
    });

    it('16. should mark auction as unsold if 0 bids were placed', () => {
      const dropWithoutBids: AuctionDrop = { ...mockDrop, currentBid: 500, bidCount: 0 };
      const bids: BidRecord[] = [];

      const now = dropWithoutBids.endsAt + 1000;
      const result = settleAuctionWithOrder(dropWithoutBids, bids, now);

      expect(result.success).toBe(true);
      expect(result.settledDrop?.status).toBe('unsold');
      expect(result.settledDrop?.winnerId).toBeUndefined();
      expect(result.order).toBeUndefined();
    });

    it('17. should determine highest bidder and generate a matching order record', () => {
      const activeDrop: AuctionDrop = { ...mockDrop, currentBid: 950, bidCount: 3 };
      const bids: BidRecord[] = [
        { id: 'b1', dropId: activeDrop.id, bidderId: buyer1Id, amount: 500, timestamp: 1100000 },
        { id: 'b2', dropId: activeDrop.id, bidderId: buyer2Id, amount: 800, timestamp: 1200000 },
        { id: 'b3', dropId: activeDrop.id, bidderId: buyer1Id, amount: 950, timestamp: 1300000 },
      ];

      const settlementTime = activeDrop.endsAt + 2000;
      const result = settleAuctionWithOrder(activeDrop, bids, settlementTime);

      expect(result.success).toBe(true);
      expect(result.settledDrop?.status).toBe('settled');
      expect(result.settledDrop?.winnerId).toBe(buyer1Id);
      expect(result.settledDrop?.winningBid).toBe(950);

      // Verify Order Record
      expect(result.order).toBeDefined();
      expect(result.order?.dropId).toBe(activeDrop.id);
      expect(result.order?.buyerId).toBe(buyer1Id);
      expect(result.order?.sellerId).toBe(sellerId);
      expect(result.order?.amount).toBe(950);
      expect(result.order?.status).toBe('pending');
    });

    it('18. should break tied bid amounts by awarding to the earliest timestamp', () => {
      const activeDrop: AuctionDrop = { ...mockDrop, currentBid: 1000, bidCount: 2 };
      const bids: BidRecord[] = [
        { id: 'b1', dropId: activeDrop.id, bidderId: buyer1Id, amount: 1000, timestamp: 1200000 }, // Placed earlier
        { id: 'b2', dropId: activeDrop.id, bidderId: buyer2Id, amount: 1000, timestamp: 1200500 }, // Placed later
      ];

      const settlementTime = activeDrop.endsAt + 2000;
      const result = settleAuctionWithOrder(activeDrop, bids, settlementTime);

      expect(result.success).toBe(true);
      expect(result.settledDrop?.winnerId).toBe(buyer1Id); // Earliest timestamp wins
      expect(result.order?.buyerId).toBe(buyer1Id);
    });
  });

  // -------------------------------------------------------------
  // 5. REGRESSION SUITE: UUID VALIDATION & DEMO AUCTION ISOLATION
  // -------------------------------------------------------------
  describe('Regression: Non-UUID Demo ID Guard & Database Isolation', () => {
    it('19. should explicitly identify "auc-4" and other demo IDs as non-UUIDs', () => {
      // Must return false for all demo showcase IDs
      expect(isValidUuid('auc-4')).toBe(false);
      expect(isValidUuid('auc-1')).toBe(false);
      expect(isValidUuid('auc-2')).toBe(false);
      expect(isValidUuid('auc-3')).toBe(false);
      expect(isValidUuid('auc-5')).toBe(false);
      expect(isValidUuid('auc-6')).toBe(false);

      // Must return false for malformed/arbitrary strings
      expect(isValidUuid('invalid-uuid')).toBe(false);
      expect(isValidUuid('12345')).toBe(false);
      expect(isValidUuid('')).toBe(false);
      expect(isValidUuid(null)).toBe(false);
      expect(isValidUuid(undefined)).toBe(false);

      // Must return true for genuine PostgreSQL UUIDs
      expect(isValidUuid('22222222-2222-4222-a222-222222222202')).toBe(true);
      expect(isValidUuid('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(true);
      expect(isValidUuid('A6B18974-9F79-4D69-8238-1A5C6E84D412')).toBe(true);
    });

    it('20. should correctly identify demo showcase auction IDs via isDemoAuctionId', () => {
      expect(isDemoAuctionId('auc-4')).toBe(true);
      expect(isDemoAuctionId('auc-1')).toBe(true);
      expect(isDemoAuctionId('auc-6')).toBe(true);

      // Real UUIDs must NOT be classified as demo IDs
      expect(isDemoAuctionId('22222222-2222-4222-a222-222222222202')).toBe(false);
      expect(isDemoAuctionId('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(false);
      expect(isDemoAuctionId('random-drop-id')).toBe(false);
    });

    it('21. should provide complete showcase data for "auc-4" without database queries', () => {
      const demo4 = getDemoAuction('auc-4');
      expect(demo4).toBeDefined();
      expect(demo4?.id).toBe('auc-4');
      expect(demo4?.title).toContain('Fujifilm X100V');
      expect(demo4?.category).toBe('electronics');
      expect(demo4?.current_bid).toBe(1550);
      expect(demo4?.seller?.username).toBe('tokyo_cams');
    });

    it('22. should reject placeBid when drop.id is "auc-4" with clear UUID error', () => {
      const demoDrop: AuctionDrop = {
        ...mockDrop,
        id: 'auc-4', // Non-UUID demo ID
      };

      const result = placeBid(demoDrop, buyer1Id, 1600, 1500000);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid auction drop UUID: "auc-4"');
      expect(result.drop).toBeUndefined();
    });

    it('23. should reject settleAuction when drop.id is "auc-4" with clear UUID error', () => {
      const demoDrop: AuctionDrop = {
        ...mockDrop,
        id: 'auc-4',
      };
      const bids: BidRecord[] = [
        { id: 'b1', dropId: 'auc-4', bidderId: buyer1Id, amount: 600, timestamp: 1200000 },
      ];

      const settlement = settleAuction(demoDrop, bids, demoDrop.endsAt + 500);
      expect(settlement.success).toBe(false);
      expect(settlement.error).toContain('Invalid auction drop UUID: "auc-4"');
    });

    it('24. should reject settleAuctionWithOrder when drop.id is "auc-4"', () => {
      const demoDrop: AuctionDrop = {
        ...mockDrop,
        id: 'auc-4',
      };
      const bids: BidRecord[] = [
        { id: 'b1', dropId: 'auc-4', bidderId: buyer1Id, amount: 600, timestamp: 1200000 },
      ];

      const result = settleAuctionWithOrder(demoDrop, bids, demoDrop.endsAt + 500);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid auction drop UUID: "auc-4"');
      expect(result.order).toBeUndefined();
    });

    it('25. should process placeBid, settleAuction, and order creation normally when a valid UUID is provided', () => {
      const realDrop: AuctionDrop = {
        ...mockDrop,
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      };

      // Valid bid
      const bidResult = placeBid(realDrop, buyer1Id, 500, 1200000);
      expect(bidResult.success).toBe(true);
      expect(bidResult.drop?.id).toBe('f47ac10b-58cc-4372-a567-0e02b2c3d479');

      // Valid settlement & order
      const bids: BidRecord[] = [
        {
          id: 'b-real',
          dropId: realDrop.id,
          bidderId: buyer1Id,
          amount: 500,
          timestamp: 1200000,
        },
      ];

      const settleResult = settleAuctionWithOrder(
        bidResult.drop!,
        bids,
        realDrop.endsAt + 1000
      );
      expect(settleResult.success).toBe(true);
      expect(settleResult.settledDrop?.status).toBe('settled');
      expect(settleResult.order?.dropId).toBe('f47ac10b-58cc-4372-a567-0e02b2c3d479');
      expect(settleResult.order?.buyerId).toBe(buyer1Id);
    });
  });
});
