/**
 * BIDDR BRAND & MARKETPLACE CONSTANTS
 */

export const BRAND_COLORS = {
  background: '#0D0E12',
  surface: '#16181F',
  surfaceHover: '#1F222B',
  surfaceBorder: '#262933',
  lime: '#CCFF00',
  limeHover: '#B8E600',
  coral: '#FF3B5C',
  blue: '#2563EB',
  primaryText: '#FFFFFF',
  secondaryText: '#9CA3AF',
} as const;

export const ANTI_SNIPE_CONFIG = {
  WINDOW_MS: 10_000,     // 10 seconds remaining threshold
  EXTENSION_MS: 10_000,  // 10 seconds clock extension
} as const;

export const MARKETPLACE_CATEGORIES = [
  { id: 'all', name: 'All Categories', slug: 'all' },
  { id: 'electronics', name: 'Electronics & Gadgets', slug: 'electronics' },
  { id: 'vintage', name: 'Thrift & Vintage', slug: 'vintage' },
  { id: 'automotive', name: 'Car Parts & Accessories', slug: 'automotive' },
  { id: 'collectibles', name: 'Collectibles & Art', slug: 'collectibles' },
  { id: 'watches', name: 'Luxury & Watches', slug: 'watches' },
] as const;

export const AUCTION_DURATION_PRESETS = [
  { label: '1 Hour (Flash Drop)', hours: 1 },
  { label: '6 Hours (Evening Rush)', hours: 6 },
  { label: '24 Hours (1 Day Standard)', hours: 24 },
  { label: '3 Days (Weekend Special)', hours: 72 },
  { label: '7 Days (Full Week Feature)', hours: 168 },
] as const;
