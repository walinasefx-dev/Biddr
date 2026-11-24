# BIDDR — SYSTEM ARCHITECTURE & CODEBASE SPECIFICATION

## 1. Architectural Philosophy
Biddr is architected as a high-performance, real-time social auction marketplace combining the visual fidelity of modern dark-mode ecommerce with the dynamic responsiveness of a live-streaming platform.

### Core Stack
- **Framework**: Next.js 15 (App Router, React 19, Server & Client Components)
- **Styling**: Tailwind CSS with custom Dark Palette (#0D0E12, #16181F, #CCFF00, #FF3B5C, #2563EB)
- **Database & Auth**: Supabase (PostgreSQL, Row Level Security, Supabase Realtime, Stored Procedures)
- **Testing**: Vitest with modular unit and integration suites

---

## 2. Directory Structure

```text
src/
├── app/                  # Next.js App Router route entrypoints
├── components/           # Modularized UI & presentation layer
│   ├── layout/           # Navbar, Footer
│   ├── marketplace/      # Hero, Categories, TrendingAuctions
│   ├── auctions/         # AuctionCard, CountdownTimer
│   ├── seller/           # SellerPromotion
│   ├── shared/           # HowItWorks, WaitlistSection
│   └── index.ts          # Unified barrel exports
├── features/             # Domain state and feature interfaces
│   ├── auth/             # Session state & credentials
│   ├── auctions/         # Catalog & discovery state
│   ├── bidding/          # Bid calculation & anti-snipe state
│   ├── watchlist/        # User watch tracking
│   └── orders/           # Post-auction settlements
├── lib/                  # Core libraries, clients & utilities
│   ├── auction/          # Engine, anti-snipe logic, showcase catalog
│   ├── supabase/         # Browser & server clients
│   ├── constants/        # Brand colors, categories, duration presets
│   └── utils/            # UUID validation, currency formatters
├── types/                # Domain models & TypeScript declarations
└── middleware.ts         # Session verification & route guarding
```

---

## 3. Real-Time Bid Synchronization Flow
```
[User Interface]
       │
       ▼ (1. Atomic Bid Call)
[public.place_bid(p_drop_id, p_amount)]
       │
       ├── Verifies auction is 'live'
       ├── Enforces bidder != seller
       ├── Validates amount >= current + increment
       ├── If ends_at - now < 10s: extends ends_at + 10s (Anti-Snipe)
       │
       ▼ (2. Postgres WAL Event)
[supabase_realtime publication]
       │
       ▼ (3. WebSocket Broadcast)
[All Connected Clients via supabase.channel('auction-{id}')]
       │
       ├── UPDATE on drops -> updates current bid, timer & status
       └── INSERT on bids  -> appends to live bid history log
```

---

## 4. Security & Isolation Boundaries
1. **UUID Boundary**: Database operations strictly accept 36-character PostgreSQL UUIDs. Non-UUID showcase items (`auc-*`) are intercepted and run in sandbox simulation mode without querying the database.
2. **Row Level Security (RLS)**:
   - `profiles`: Viewable by all; modifiable only by `auth.uid() = id`.
   - `drops`: Viewable by all; insert/update restricted to verified sellers (`auth.uid() = seller_id`).
   - `bids`: Viewable by all for marketplace transparency; inserted only via atomic `place_bid` SECURITY DEFINER procedure.
   - `watchlist`: Strictly isolated per user (`auth.uid() = user_id`).
   - `orders`: Accessible only by participating `buyer_id` or `seller_id`.
