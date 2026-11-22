import { describe, it, expect } from 'vitest';
import {
  placeBid,
  settleAuction,
  type AuctionDrop,
  type BidRecord,
  ANTI_SNIPE_WINDOW_MS,
  ANTI_SNIPE_EXTENSION_MS,
} from '../src/lib/auction/engine';

describe('Biddr Auction & Anti-Sniping Engine', () => {
  const baseDrop: AuctionDrop = {
    id: 'drop-101',
    sellerId: 'seller-user-1',
    title: 'Vintage Leica M6 Camera',
    startingPrice: 500,
    currentBid: 500,
    minIncrement: 50,
    bidCount: 1,
    status: 'live',
    startsAt: 100000,
    endsAt: 200000, // 200,000 ms
  };

  // Scenario 1: A valid bid
  it('1. should successfully process a valid bid above the current bid plus increment', () => {
    const now = 150000;
    const result = placeBid(baseDrop, 'bidder-alice', 600, now);

    expect(result.success).toBe(true);
    expect(result.drop?.currentBid).toBe(600);
    expect(result.drop?.bidCount).toBe(2);
    expect(result.antiSnipeTriggered).toBe(false);
    expect(result.bid?.bidderId).toBe('bidder-alice');
    expect(result.bid?.amount).toBe(600);
  });

  // Scenario 2: A bid below the minimum increment
  it('2. should reject a bid below the required minimum increment', () => {
    const now = 150000;
    // Current bid is 500, minIncrement is 50. Required is 550.
    const result = placeBid(baseDrop, 'bidder-alice', 530, now);

    expect(result.success).toBe(false);
    expect(result.error).toContain('below minimum increment requirement');
    expect(result.drop).toBeUndefined();
  });

  // Scenario 3: A bid after the auction ends
  it('3. should reject a bid placed after the auction has ended', () => {
    const afterEndTime = baseDrop.endsAt + 1000; // 1s past end
    const result = placeBid(baseDrop, 'bidder-bob', 700, afterEndTime);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Auction has already ended');
  });

  // Scenario 4: Two competing bids
  it('4. should handle two competing bids in sequence correctly', () => {
    const now = 160000;
    // Bidder 1 bids 600
    const firstBidResult = placeBid(baseDrop, 'bidder-alice', 600, now);
    expect(firstBidResult.success).toBe(true);

    const updatedDrop = firstBidResult.drop!;
    expect(updatedDrop.currentBid).toBe(600);

    // Bidder 2 tries to outbid with 650 (valid increment: 600 + 50 = 650)
    const secondBidResult = placeBid(updatedDrop, 'bidder-bob', 650, now + 2000);
    expect(secondBidResult.success).toBe(true);
    expect(secondBidResult.drop?.currentBid).toBe(650);
    expect(secondBidResult.drop?.bidCount).toBe(3);

    // Bidder 1 tries to bid 660 (invalid, needs 700)
    const thirdBidResult = placeBid(secondBidResult.drop!, 'bidder-alice', 660, now + 4000);
    expect(thirdBidResult.success).toBe(false);
    expect(thirdBidResult.error).toContain('below minimum increment requirement');
  });

  // Scenario 5: A bid with less than 10 seconds remaining
  it('5. should detect when a bid is placed with less than 10 seconds remaining', () => {
    // endsAt is 200000. 5 seconds remaining = 195000
    const nearEnd = baseDrop.endsAt - 5000;
    const result = placeBid(baseDrop, 'bidder-charlie', 600, nearEnd);

    expect(result.success).toBe(true);
    expect(result.antiSnipeTriggered).toBe(true);
  });

  // Scenario 6: The 10-second anti-sniping extension
  it('6. should extend endsAt by exactly 10 seconds when anti-sniping is triggered', () => {
    const originalEndsAt = baseDrop.endsAt;
    const nearEnd = originalEndsAt - 4000; // 4s left (< 10s window)

    const result = placeBid(baseDrop, 'bidder-charlie', 600, nearEnd);

    expect(result.success).toBe(true);
    expect(result.antiSnipeTriggered).toBe(true);
    expect(result.drop?.endsAt).toBe(originalEndsAt + ANTI_SNIPE_EXTENSION_MS);
  });

  // Scenario 7: Auction completion
  it('7. should settle auction successfully after endsAt timestamp has passed', () => {
    const bids: BidRecord[] = [
      { id: 'b1', dropId: baseDrop.id, bidderId: 'bidder-alice', amount: 550, timestamp: 150000 },
      { id: 'b2', dropId: baseDrop.id, bidderId: 'bidder-bob', amount: 650, timestamp: 170000 },
    ];

    const activeDrop: AuctionDrop = {
      ...baseDrop,
      currentBid: 650,
      bidCount: 2,
    };

    const completionTime = baseDrop.endsAt + 500;
    const settlement = settleAuction(activeDrop, bids, completionTime);

    expect(settlement.success).toBe(true);
    expect(settlement.settledDrop?.status).toBe('settled');
    expect(settlement.settledDrop?.winningBid).toBe(650);
  });

  // Scenario 8: Correct winner determination
  it('8. should correctly determine the highest bidder as the winner', () => {
    const bids: BidRecord[] = [
      { id: 'b1', dropId: baseDrop.id, bidderId: 'bidder-alice', amount: 550, timestamp: 120000 },
      { id: 'b2', dropId: baseDrop.id, bidderId: 'bidder-charlie', amount: 800, timestamp: 140000 },
      { id: 'b3', dropId: baseDrop.id, bidderId: 'bidder-bob', amount: 700, timestamp: 130000 },
    ];

    const activeDrop: AuctionDrop = {
      ...baseDrop,
      currentBid: 800,
      bidCount: 3,
    };

    const completionTime = baseDrop.endsAt + 1000;
    const settlement = settleAuction(activeDrop, bids, completionTime);

    expect(settlement.success).toBe(true);
    expect(settlement.settledDrop?.winnerId).toBe('bidder-charlie');
    expect(settlement.settledDrop?.winningBid).toBe(800);
  });
});
