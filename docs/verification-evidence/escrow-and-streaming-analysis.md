# BIDDR — FINANCIAL FLOW & STREAMING ARCHITECTURE ANALYSIS

## 1. FINANCIAL & ESCROW ARCHITECTURE ANALYSIS

### A. Fund Flow Investigation
- **Charge Model**: Direct Platform Charge via Stripe PaymentIntent (`POST /api/payments/create-intent`).
- **Destination of Funds**: The platform's Stripe merchant balance.
- **Current State Machine**:
  - `pending` / `awaiting_payment`: Order created upon winning bid or fixed-price purchase.
  - `paid`: Buyer authorizes payment. Funds captured into platform account.
  - `dispatched`: Seller supplies shipping carrier and tracking code.
  - `delivered`: Buyer confirms delivery of goods.
  - `completed`: Order resolved.

### B. Escrow Claim Assessment
- **Finding**: While Biddr provides an order state machine that simulates conditional escrow authorization, **Biddr does NOT operate a regulated custodial escrow account nor automated Stripe Connect payout disbursements** to seller bank accounts (`stripe.transfers.create`).
- **Correction Applied**: Misleading messages claiming "Escrow Secured" have been corrected to "Biddr Buyer Protection Active" across `PaymentModal.tsx`, `orders/[id]/page.tsx`, and `webhooks/stripe/route.ts`.
- **Requirements for True Escrow**:
  1. Stripe Connect Custom/Express onboarding for sellers.
  2. Deferred transfers with destination charges or separate transfer execution upon buyer delivery confirmation.
  3. Compliance review with marketplace payment facilitator regulations.

---

## 2. LIVE STREAMING PIPELINE ANALYSIS

### A. Implemented Architecture
- **Host Broadcast**: Local camera and microphone capture via browser `navigator.mediaDevices.getUserMedia` (`/seller/live/[id]`).
- **Token Generation**: Pure Node.js JWT generation with HMAC-SHA256 signatures (`/api/live/token`).
- **Role Permissions**:
  - Host: `canPublish: true`, `canSubscribe: true`.
  - Viewer: `canPublish: false`, `canSubscribe: true`.
- **Catalogue Sync**: Stored procedure `advance_catalogue_lot` synchronizes active catalogue lots and countdown clocks over Supabase Realtime across all viewers.
- **Fail-Closed Security**: In production (`NODE_ENV === 'production'`), token generation fails closed if `LIVEKIT_API_KEY` or `LIVEKIT_API_SECRET` are not configured.

### B. Production Limitations
- The client-side WebRTC room connection requires installing `@livekit/client` and connecting to an active LiveKit Cloud server instance.
- Offline demonstration mode operates cleanly using a simulated canvas stream with synchronized live chat, bids, and reactions.
