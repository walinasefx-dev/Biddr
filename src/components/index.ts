// ============================================================
// BIDDR COMPONENT BARREL EXPORTS
// Provides unified access to all design system & layout components
// ============================================================

// Layout
export { default as Navbar } from './layout/Navbar';
export { default as Footer } from './layout/Footer';

// Marketplace & Discovery
export { default as Hero } from './marketplace/Hero';
export { default as Categories } from './marketplace/Categories';
export { default as TrendingAuctions } from './marketplace/TrendingAuctions';

// Auctions & Bidding
export { default as AuctionCard } from './auctions/AuctionCard';
export { default as CountdownTimer } from './auctions/CountdownTimer';

// Seller Console & Studio
export { default as SellerPromotion } from './seller/SellerPromotion';

// Shared & Onboarding
export { default as HowItWorks } from './shared/HowItWorks';
export { default as WaitlistSection } from './shared/WaitlistSection';

// Orders, Fulfillment & Payments
export * from './orders';

// Social & Live Commerce
export * from './social';

// Live Shows & Streaming
export * from './live';
