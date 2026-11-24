# BIDDR — COMPLETE ROUTES INVENTORY & OPERATIONAL STATUS

| Route | Type | Description | Operational Status |
| :--- | :--- | :--- | :--- |
| `/` | Static | Platform landing page & brand showcase | VERIFIED WORKING |
| `/login` | Static | Authenticated session sign-in | VERIFIED WORKING |
| `/register` | Static | User registration & profile generation | VERIFIED WORKING |
| `/forgot-password` | Static | Password recovery email dispatcher | VERIFIED WORKING |
| `/reset-password` | Static | Password reset token handler | VERIFIED WORKING |
| `/auth/callback` | Dynamic | Server-side auth code exchange | VERIFIED WORKING |
| `/auctions` | Static | Marketplace drops directory & search | VERIFIED WORKING |
| `/auction/[id]` | Dynamic | Timed auction details & live bidding | VERIFIED WORKING |
| `/feed` | Static | Social media feed (For You & Following) | VERIFIED WORKING |
| `/post/new` | Static | Social media & drop attachment composer | VERIFIED WORKING |
| `/profile` | Static | Authenticated private user dashboard | VERIFIED WORKING |
| `/profile/edit` | Static | Profile information editor | VERIFIED WORKING |
| `/profile/[username]` | Dynamic | Public seller storefront & drops | VERIFIED WORKING |
| `/live` | Static | Live auction shows discovery hub | VERIFIED WORKING |
| `/live/[id]` | Dynamic | Live viewer broadcast room | VERIFIED WORKING |
| `/orders` | Static | Buyer order centre & fulfillment tracker | VERIFIED WORKING |
| `/orders/[id]` | Dynamic | Buyer checkout, tracking & reviews | VERIFIED WORKING |
| `/seller` | Static | Seller operations dashboard | VERIFIED WORKING |
| `/seller/auctions/new` | Static | Multi-step drop creator | VERIFIED WORKING |
| `/seller/auctions/[id]/edit` | Dynamic | Auction details modifier | VERIFIED WORKING |
| `/seller/orders` | Static | Seller order management | VERIFIED WORKING |
| `/seller/orders/[id]` | Dynamic | Seller dispatch & tracking recorder | VERIFIED WORKING |
| `/seller/sessions` | Static | Live auction session manager | VERIFIED WORKING |
| `/seller/sessions/new` | Static | Sequential catalogue builder | VERIFIED WORKING |
| `/seller/live/[id]` | Dynamic | Seller Live Studio with camera controls | VERIFIED WORKING |
| `/notifications` | Static | Realtime in-app notification center | VERIFIED WORKING |
| `/api/cron/advance-lots` | Dynamic | Background catalogue progression worker | VERIFIED WORKING |
| `/api/payments/create-intent` | Dynamic | Stripe PaymentIntent generation API | VERIFIED IN TEST MODE |
| `/api/webhooks/stripe` | Dynamic | Stripe webhook event processor | VERIFIED IN TEST MODE |
| `/api/live/token` | Dynamic | LiveKit WebRTC access token minter | VERIFIED WORKING |
