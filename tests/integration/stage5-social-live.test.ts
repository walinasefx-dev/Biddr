import { describe, it, expect } from 'vitest';
import type { PostRecord, PostType, AuctionDropRecord, AuctionSessionRecord, AuctionLotRecord } from '../../src/types';

describe('Stage 5 — Social Feed, Commerce Embeds & Live Room Integration', () => {
  // Mock Data
  const mockPosts: PostRecord[] = [
    {
      id: 'post-1',
      author_id: 'seller-a',
      caption: 'Grail jacket just listed on marketplace!',
      post_type: 'product_showcase',
      media_type: 'image',
      media_urls: ['https://biddr.com/jacket.jpg'],
      drop_id: 'drop-fp-1',
      like_count: 42,
      comment_count: 5,
      share_count: 12,
      created_at: '2026-11-25T10:00:00Z',
      updated_at: '2026-11-25T10:00:00Z',
      author: {
        id: 'seller-a',
        username: 'vintage_tokyo',
        full_name: 'Kenji T.',
        avatar_url: null,
        bio: null,
        location: 'Tokyo',
        is_seller: true,
        seller_verified: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      drop: {
        id: 'drop-fp-1',
        seller_id: 'seller-a',
        title: 'Archive Denim Jacket',
        description: 'Vintage 90s denim jacket in dark wash',
        category: 'Streetwear',
        image_url: 'https://biddr.com/jacket.jpg',
        images: ['https://biddr.com/jacket.jpg'],
        condition: 'Excellent',
        starting_price: 250,
        current_bid: 250,
        min_increment: 10,
        bid_count: 0,
        status: 'live',
        starts_at: '2026-11-25T00:00:00Z',
        ends_at: '2026-11-26T00:00:00Z',
        winner_id: null,
        winning_bid: null,
        location: 'Tokyo',
        shipping_information: 'Standard shipping',
        is_fixed_price: true,
        fixed_price: 250,
        created_at: '2026-11-25T00:00:00Z',
        updated_at: '2026-11-25T00:00:00Z',
      },
    },
    {
      id: 'post-2',
      author_id: 'seller-b',
      caption: 'Live auction teaser: Seiko Pogue starts at $350 tonight!',
      post_type: 'auction_teaser',
      media_type: 'image',
      media_urls: ['https://biddr.com/pogue.jpg'],
      drop_id: 'drop-auc-2',
      like_count: 88,
      comment_count: 14,
      share_count: 30,
      created_at: '2026-11-25T11:00:00Z',
      updated_at: '2026-11-25T11:00:00Z',
      author: {
        id: 'seller-b',
        username: 'chrono_curator',
        full_name: 'Marcus Bell',
        avatar_url: null,
        bio: null,
        location: 'London',
        is_seller: true,
        seller_verified: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      drop: {
        id: 'drop-auc-2',
        seller_id: 'seller-b',
        title: '1971 Seiko 6139 Pogue',
        description: 'Authentic vintage chronograph',
        category: 'Watches',
        image_url: 'https://biddr.com/pogue.jpg',
        images: ['https://biddr.com/pogue.jpg'],
        condition: 'Pristine',
        starting_price: 350,
        current_bid: 520,
        min_increment: 25,
        bid_count: 8,
        status: 'live',
        starts_at: '2026-11-25T00:00:00Z',
        ends_at: '2026-11-26T00:00:00Z',
        winner_id: null,
        winning_bid: null,
        location: 'London',
        shipping_information: 'Express courier',
        is_fixed_price: false,
        created_at: '2026-11-25T00:00:00Z',
        updated_at: '2026-11-25T00:00:00Z',
      },
    },
    {
      id: 'post-3',
      author_id: 'seller-a',
      caption: 'Going live in 10 minutes with our weekly Japanese streetwear showcase!',
      post_type: 'live_announcement',
      media_type: 'image',
      media_urls: ['https://biddr.com/live-banner.jpg'],
      session_id: 'session-live-1',
      like_count: 120,
      comment_count: 32,
      share_count: 45,
      created_at: '2026-11-25T12:00:00Z',
      updated_at: '2026-11-25T12:00:00Z',
      author: {
        id: 'seller-a',
        username: 'vintage_tokyo',
        full_name: 'Kenji T.',
        avatar_url: null,
        bio: null,
        location: 'Tokyo',
        is_seller: true,
        seller_verified: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      session: {
        id: 'session-live-1',
        seller_id: 'seller-a',
        title: 'Japanese Streetwear Live Show',
        mode: 'catalogue_live',
        status: 'live',
        current_lot_index: 0,
        total_lots: 5,
        created_at: '2026-11-25T11:00:00Z',
        updated_at: '2026-11-25T11:00:00Z',
      },
    },
  ];

  // Feed filtering function
  function filterFeedPosts(
    posts: PostRecord[],
    tab: 'for_you' | 'following',
    followingUserIds: string[],
    filterType: 'all' | 'showcases' | 'teasers' | 'live'
  ): PostRecord[] {
    let list = [...posts];

    // Filter by Tab
    if (tab === 'following') {
      list = list.filter((p) => followingUserIds.includes(p.author_id));
    }

    // Filter by Type Pill
    if (filterType === 'showcases') {
      list = list.filter((p) => p.post_type === 'product_showcase');
    } else if (filterType === 'teasers') {
      list = list.filter((p) => p.post_type === 'auction_teaser');
    } else if (filterType === 'live') {
      list = list.filter((p) => p.post_type === 'live_announcement');
    }

    // Sort by latest created_at
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // 1. Social Feed Filtering Tests
  describe('Social Feed Filtering & Discovery', () => {
    it('returns all posts sorted by recency in "for_you" feed', () => {
      const feed = filterFeedPosts(mockPosts, 'for_you', [], 'all');
      expect(feed.length).toBe(3);
      expect(feed[0].id).toBe('post-3'); // latest (12:00)
      expect(feed[1].id).toBe('post-2'); // 11:00
      expect(feed[2].id).toBe('post-1'); // 10:00
    });

    it('filters posts strictly by followed sellers in "following" feed', () => {
      // User only follows seller-b
      const feed = filterFeedPosts(mockPosts, 'following', ['seller-b'], 'all');
      expect(feed.length).toBe(1);
      expect(feed[0].author_id).toBe('seller-b');
      expect(feed[0].id).toBe('post-2');
    });

    it('filters feed by specific post type pills', () => {
      const showcases = filterFeedPosts(mockPosts, 'for_you', [], 'showcases');
      expect(showcases.length).toBe(1);
      expect(showcases[0].post_type).toBe('product_showcase');

      const liveAnnouncements = filterFeedPosts(mockPosts, 'for_you', [], 'live');
      expect(liveAnnouncements.length).toBe(1);
      expect(liveAnnouncements[0].post_type).toBe('live_announcement');
    });
  });

  // 2. Embedded Commerce Card Resolution Tests
  describe('Embedded Commerce Card Resolution', () => {
    function resolveCommerceCard(post: PostRecord): {
      actionType: 'buy_now' | 'bid_now' | 'join_live' | 'none';
      ctaLabel: string;
      targetUrl: string;
      displayPrice?: number;
    } {
      if (post.drop) {
        if (post.drop.is_fixed_price) {
          return {
            actionType: 'buy_now',
            ctaLabel: `Buy Now - $${post.drop.fixed_price?.toLocaleString()}`,
            targetUrl: `/orders?buyDrop=${post.drop.id}`,
            displayPrice: post.drop.fixed_price,
          };
        } else {
          return {
            actionType: 'bid_now',
            ctaLabel: `Place Bid - $${post.drop.current_bid.toLocaleString()}`,
            targetUrl: `/auction/${post.drop.id}`,
            displayPrice: post.drop.current_bid,
          };
        }
      }

      if (post.session) {
        return {
          actionType: 'join_live',
          ctaLabel: 'Join Live Show',
          targetUrl: `/live/${post.session.id}`,
        };
      }

      return {
        actionType: 'none',
        ctaLabel: '',
        targetUrl: '',
      };
    }

    it('resolves a fixed-price post to an instant Buy Now checkout card', () => {
      const post = mockPosts[0];
      const card = resolveCommerceCard(post);

      expect(card.actionType).toBe('buy_now');
      expect(card.ctaLabel).toBe('Buy Now - $250');
      expect(card.targetUrl).toContain('/orders?buyDrop=');
      expect(card.displayPrice).toBe(250);
    });

    it('resolves an auction post to an interactive Place Bid card with current price', () => {
      const post = mockPosts[1];
      const card = resolveCommerceCard(post);

      expect(card.actionType).toBe('bid_now');
      expect(card.ctaLabel).toBe('Place Bid - $520');
      expect(card.targetUrl).toBe(`/auction/${post.drop?.id}`);
      expect(card.displayPrice).toBe(520);
    });

    it('resolves a live announcement post to a Join Live Show card', () => {
      const post = mockPosts[2];
      const card = resolveCommerceCard(post);

      expect(card.actionType).toBe('join_live');
      expect(card.ctaLabel).toBe('Join Live Show');
      expect(card.targetUrl).toBe(`/live/${post.session?.id}`);
    });
  });

  // 3. Live Room Anti-Snipe & Bidding Validation
  describe('Live Room Anti-Snipe Rule Extension', () => {
    function simulateLiveBidPlacement(
      currentEndsAtMs: number,
      bidTimeMs: number,
      antiSnipeWindowMs = 10000, // 10s anti-snipe window
      extensionMs = 10000 // 10s extension
    ): { extended: boolean; newEndsAtMs: number } {
      const remainingMs = currentEndsAtMs - bidTimeMs;

      if (remainingMs > 0 && remainingMs <= antiSnipeWindowMs) {
        return {
          extended: true,
          newEndsAtMs: currentEndsAtMs + extensionMs,
        };
      }

      return {
        extended: false,
        newEndsAtMs: currentEndsAtMs,
      };
    }

    it('triggers a 10s extension when a bid arrives within the final 10 seconds of a catalogue lot', () => {
      const now = Date.now();
      const endsAt = now + 5000; // 5 seconds remaining (within 10s window)

      const result = simulateLiveBidPlacement(endsAt, now);
      expect(result.extended).toBe(true);
      expect(result.newEndsAtMs).toBe(endsAt + 10000);
    });

    it('does not extend countdown when a bid arrives well before the anti-snipe window', () => {
      const now = Date.now();
      const endsAt = now + 45000; // 45 seconds remaining

      const result = simulateLiveBidPlacement(endsAt, now);
      expect(result.extended).toBe(false);
      expect(result.newEndsAtMs).toBe(endsAt);
    });
  });
});
