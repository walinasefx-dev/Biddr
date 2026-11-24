import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { stripeConnectService } from '@/lib/payments/connect';

/**
 * Validates Stripe signature using HMAC SHA256
 */
function verifyStripeSignature(rawBody: string, signatureHeader: string, secret: string): boolean {
  try {
    const parts = signatureHeader.split(',');
    let timestamp = '';
    let signature = '';

    for (const part of parts) {
      const [key, val] = part.split('=');
      if (key === 't') timestamp = val;
      if (key === 'v1') signature = val;
    }

    if (!timestamp || !signature) return false;

    const signedPayload = `${timestamp}.${rawBody}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch {
    return false;
  }
}

/**
 * POST /api/webhooks/stripe
 *
 * Ingests and processes asynchronous Stripe events:
 * - payment_intent.succeeded
 * - payment_intent.payment_failed
 * - account.updated (Stripe Connect Express onboarding & capability updates)
 *
 * Enforces webhook idempotency via `processed_webhook_events` table.
 */
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // 1. Verify signature if webhook secret is configured
    if (webhookSecret) {
      if (!signature) {
        return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
      }

      const isValid = verifyStripeSignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
      }
    }

    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
    }

    if (!event?.id || !event?.type) {
      return NextResponse.json({ error: 'Missing event ID or type' }, { status: 400 });
    }

    const supabase = await createClient();
    const now = new Date().toISOString();

    // 2. Webhook Idempotency Check: check if already processed
    const { data: existingEvent } = await supabase
      .from('processed_webhook_events')
      .select('event_id')
      .eq('event_id', event.id)
      .maybeSingle();

    if (existingEvent) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Mark event as processed
    await supabase.from('processed_webhook_events').insert({
      event_id: event.id,
      event_type: event.type,
      processed_at: now,
    });

    // 3. Handle Payment Succeeded
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data?.object;
      const orderId = paymentIntent?.metadata?.orderId;
      const buyerId = paymentIntent?.metadata?.buyerId;
      const sellerId = paymentIntent?.metadata?.sellerId;
      const amount = (paymentIntent?.amount || 0) / 100;
      const currency = paymentIntent?.currency?.toUpperCase() || 'USD';

      if (orderId) {
        // Update order status to paid
        await supabase
          .from('orders')
          .update({
            status: 'paid',
            payment_status: 'paid',
            payment_method: 'card',
            payment_reference: paymentIntent.id,
            paid_at: now,
            updated_at: now,
          })
          .eq('id', orderId);

        // Record audit payment entry
        if (buyerId && sellerId) {
          await supabase.from('payments').insert({
            order_id: orderId,
            buyer_id: buyerId,
            seller_id: sellerId,
            amount,
            currency,
            provider: 'stripe',
            transaction_reference: paymentIntent.id,
            status: 'succeeded',
            metadata: { stripeEventId: event.id },
            created_at: now,
            updated_at: now,
          });

          // In-app notifications
          await supabase.from('notifications').insert([
            {
              user_id: buyerId,
              type: 'payment_confirmed',
              title: 'Payment Confirmed — Buyer Protection Active',
              message: `Your payment of $${amount.toLocaleString()} was confirmed via Stripe. Funds are held under Biddr Buyer Protection.`,
              link_url: `/orders/${orderId}`,
              created_at: now,
            },
            {
              user_id: sellerId,
              type: 'order_received',
              title: 'Buyer Paid — Ready to Fulfill',
              message: `Payment of $${amount.toLocaleString()} confirmed via Stripe. Please dispatch the order.`,
              link_url: `/seller/orders/${orderId}`,
              created_at: now,
            },
          ]);
        }
      }
    }

    // 4. Handle Payment Failed
    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data?.object;
      const orderId = paymentIntent?.metadata?.orderId;
      const buyerId = paymentIntent?.metadata?.buyerId;

      if (orderId && buyerId) {
        await supabase.from('notifications').insert({
          user_id: buyerId,
          type: 'system',
          title: 'Payment Failed',
          message: 'Your payment attempt was declined. Please try another card or payment method.',
          link_url: `/orders/${orderId}`,
          created_at: now,
        });
      }
    }

    // 5. Handle Stripe Connect Account Updated (Onboarding & Payouts capability changes)
    if (event.type === 'account.updated') {
      const account = event.data?.object;
      const accountId = account?.id;
      const payoutsEnabled = Boolean(account?.payouts_enabled);
      const chargesEnabled = Boolean(account?.charges_enabled);

      if (accountId) {
        // Find seller profile by stripe_connect_account_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, stripe_payouts_enabled')
          .eq('stripe_connect_account_id', accountId)
          .maybeSingle();

        if (profile) {
          const beforePayoutsEnabled = profile.stripe_payouts_enabled;

          // Update seller's payouts status
          await supabase
            .from('profiles')
            .update({
              stripe_payouts_enabled: payoutsEnabled,
            })
            .eq('id', profile.id);

          // Write audit log
          await supabase.from('audit_logs').insert({
            actor_id: null,
            action: 'stripe_connect_account_updated',
            target_type: 'seller',
            target_id: profile.id,
            before_state: { payouts_enabled: beforePayoutsEnabled },
            after_state: { payouts_enabled: payoutsEnabled, charges_enabled: chargesEnabled },
            reason: `Stripe webhook account.updated received for account ${accountId}`,
            created_at: now,
          });

          // If payouts were just enabled, drain any queued transfers for this seller
          if (payoutsEnabled && !beforePayoutsEnabled) {
            const { data: queuedTransfers } = await supabase
              .from('seller_transfers')
              .select('*')
              .eq('seller_id', profile.id)
              .eq('status', 'queued');

            if (queuedTransfers && queuedTransfers.length > 0) {
              for (const transfer of queuedTransfers) {
                const amountInCents = Math.round(Number(transfer.net_amount) * 100);
                const transferResult = await stripeConnectService.executeDirectTransfer({
                  amountInCents,
                  destinationAccountId: accountId,
                  orderId: transfer.order_id,
                  idempotencyKey: transfer.idempotency_key,
                });

                if (transferResult.success) {
                  await supabase
                    .from('seller_transfers')
                    .update({
                      status: 'transferred',
                      transfer_reference: transferResult.transferId,
                    })
                    .eq('id', transfer.id);

                  await supabase.from('audit_logs').insert({
                    actor_id: null,
                    action: 'seller_transfer_drained',
                    target_type: 'transfer',
                    target_id: transfer.id,
                    before_state: { status: 'queued' },
                    after_state: { status: 'transferred', transfer_reference: transferResult.transferId },
                    reason: 'Queued payout drained after Stripe Connect payouts enabled',
                    created_at: new Date().toISOString(),
                  });

                  await supabase.from('notifications').insert({
                    user_id: profile.id,
                    type: 'payout_released',
                    title: 'Queued Payout Released',
                    message: `Your queued payout of $${Number(transfer.net_amount).toFixed(2)} has been transferred to your Stripe account.`,
                    link_url: '/seller/payouts',
                    created_at: new Date().toISOString(),
                  });
                }
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Webhook handler error' }, { status: 500 });
  }
}
