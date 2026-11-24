# Biddr Seller Payouts & Stripe Connect Architecture Design Note

## 1. Executive Overview & Funds Custody Model
Biddr operates a live video auction marketplace. To protect both buyers and sellers from fraud, unfulfilled lots, or misrepresented merchandise, Biddr implements the **Biddr Buyer Protection** model (internally structured as custodial platform escrow, customer-facing terminology strictly **"Biddr Buyer Protection"**).

The funds flow is structured using **Stripe Connect Express** with **Separate Charges and Transfers**:
1. **Buyer Payment (Direct Platform Charge):**
   When an auction closes or a buy-now item is purchased, the buyer pays the platform directly via `PaymentIntent` (`POST /v1/payment_intents`). The platform account receives the gross funds into Biddr's Stripe custodial balance.
2. **Custodial Hold & Fulfillment Verification:**
   Funds remain on the Biddr platform account while the order progresses through the fulfillment lifecycle:
   `pending -> paid -> dispatched -> delivered`.
3. **Idempotent Release via Separate Transfer:**
   Once delivery is confirmed by the buyer (or verified via courier tracking/14-day auto-confirmation, or resolved in the seller's favor by an administrator in the Dispute Mediation Center), Biddr triggers an automated transfer (`POST /v1/transfers`) to the seller's connected Stripe Express account (`acct_...`).
4. **Commission & Fee Deduction:**
   The transfer amount is calculated via Biddr's centralized fee engine (`src/lib/fees/index.ts`):
   $$\text{Net Payout} = \text{Gross} - \text{Platform Commission} - \text{Payment Processing Fee}$$
   - **Platform Commission:** 0% for founding sellers until 30 completed sales are reached; 6% standard platform fee thereafter.
   - **Payment Processing Fee:** Passed through at cost ($2.9\% + \$0.30$).
   - **Net Payout:** Transferred directly to the seller's Stripe balance for automated bank payout.

---

## 2. Stripe Connect Express Integration Flow

### A. Seller Onboarding Lifecycle
1. **Initialization:**
   The seller clicks **"Connect with Stripe"** on `/seller/payouts`.
   The frontend calls `POST /api/seller/connect`.
2. **Account Creation:**
   If the seller doesn't already have a `stripe_connect_account_id` recorded on their `profiles` row, Biddr calls Stripe API `POST /v1/accounts` with `type: 'express'` and requested capabilities `card_payments` and `transfers`.
   The returned `acct_...` ID is persisted to `profiles.stripe_connect_account_id`.
3. **Account Link Generation:**
   Biddr generates a single-use Stripe hosted onboarding link via `POST /v1/account_links` with `type: 'account_onboarding'`, `return_url: '/seller/payouts?status=returned'`, and `refresh_url: '/seller/payouts?status=refresh'`.
   The seller is redirected to Stripe to provide identity verification (KYC/AML), business details, and payout bank account details.
4. **Webhook Synchronization (`account.updated`):**
   When Stripe completes verification, it dispatches an `account.updated` webhook event.
   Biddr's webhook handler (`POST /api/webhooks/stripe`):
   - Verifies the webhook signature (`Stripe-Signature` HMAC SHA256).
   - Validates event idempotency using `processed_webhook_events`.
   - Checks `account.payouts_enabled`.
   - Updates `profiles.stripe_payouts_enabled = true`.
   - Checks for any previously `queued` transfers in `seller_transfers` and automatically processes them.

### B. Status Badges on `/seller/payouts`
- **`Onboarding Required`**: Seller has not initiated Stripe Connect onboarding or has no `stripe_connect_account_id`.
- **`Under Review`**: Account ID exists, but `stripe_payouts_enabled` is `false` (Stripe is verifying KYC documents, awaiting tax ID, or additional bank verification).
- **`Stripe Payouts Active`**: `stripe_payouts_enabled` is `true`. Transfers on delivery confirmation execute immediately.

---

## 3. Idempotency & Failure Recovery

### A. Transfer Idempotency Keys
Stripe transfers are vulnerable to double-payout bugs if network timeouts or retries occur.
Every transfer request includes an explicit header:
```http
Idempotency-Key: tr_<order_id>
```
Additionally, the database enforces a `UNIQUE(idempotency_key)` constraint on the `seller_transfers` table. Repeated requests for the same order ID return the existing transfer record without issuing a duplicate transfer to Stripe.

### B. Un-onboarded / Restricted Seller Queueing
If an order is delivered but the seller's connected account is not payout-enabled (`payouts_enabled === false` or not yet onboarded):
- The transfer is NOT aborted or lost.
- A record is created in `seller_transfers` with `status = 'queued'`.
- The seller's `/seller/payouts` dashboard displays the queued funds under their pending ledger with an alert: *"Payouts paused until Stripe verification is completed."*
- As soon as the `account.updated` webhook arrives with `payouts_enabled: true`, Biddr triggers the payout worker to drain the queued transfers.

### C. Append-Only Audit Logging
All financial movements (transfers, administrative releases, refunds) write an immutable row to `audit_logs` capturing:
- `actor_id` (system worker or admin ID)
- `action` (`seller_payout_transferred`, `seller_payout_queued`, `dispute_refund`, `dispute_release`)
- `target_type` (`order`, `transfer`)
- `target_id`
- `before_state` & `after_state`
- `reason`

---

## 4. Legal & Compliance Assumptions & Disclaimers

1. **Marketplace Payment Facilitator / Commercial Agent Exemption:**
   - Biddr relies on the commercial agent exemption (under European PSD2 / UK payment services regulations) and US Marketplace Facilitator doctrines. Under Biddr terms of service, Biddr is authorized by sellers as an agent to accept payments on their behalf. Payment by the buyer to Biddr completely satisfies the buyer's debt to the seller.
2. **KYC / AML Offloading:**
   - Identity verification, Anti-Money Laundering (AML) checks, Office of Foreign Assets Control (OFAC) sanctions screening, and bank account verification are performed directly by Stripe Payments Company (licensed money transmitter) under Stripe Connect Express terms. Biddr does not store bank routing numbers, IBANs, or government identity documents.
3. **Sales Tax & Marketplace Facilitator Laws:**
   - In jurisdictions where Marketplace Facilitator legislation applies, the marketplace platform may be required to collect and remit sales tax. Biddr currently processes item transactions with sales tax handling designated in Stripe Tax / fee configurations; sellers remain responsible for corporate income tax reporting (1099-K issued by Stripe for US sellers meeting threshold).
4. **Buyer Protection Period:**
   - Funds are held until delivery confirmation or maximum protection duration (14 calendar days post-shipping if unconfirmed and no dispute filed). Buyers are informed that filing a dispute freezes payout release pending administrative mediation.
