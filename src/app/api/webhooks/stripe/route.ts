import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';

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

    const event = JSON.parse(rawBody);
    const supabase = await createClient();
    const now = new Date().toISOString();

    // 2. Handle Payment Succeeded
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

    // 3. Handle Payment Failed
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

    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Webhook handler error' }, { status: 500 });
  }
}
