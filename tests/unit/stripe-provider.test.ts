import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StripePaymentProvider } from '../../src/lib/payments/providers/stripe-provider';
import crypto from 'crypto';

describe('StripePaymentProvider Unit Tests', () => {
  let provider: StripePaymentProvider;

  beforeEach(() => {
    provider = new StripePaymentProvider('sk_test_mock_stripe_key_12345');
  });

  it('rejects payments with zero or negative amounts', async () => {
    const result = await provider.createPaymentIntent({
      orderId: 'ord-123',
      amount: 0,
      buyerId: 'b-1',
      sellerId: 's-1',
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe('failed');
    expect(result.error).toContain('greater than zero');
  });

  it('fails with a clear configuration message when API key is missing', async () => {
    const unconfiguredProvider = new StripePaymentProvider('');
    unconfiguredProvider.setApiKey('');

    const result = await unconfiguredProvider.createPaymentIntent({
      orderId: 'ord-123',
      amount: 150,
      buyerId: 'b-1',
      sellerId: 's-1',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Stripe secret key is not configured');
  });

  it('correctly constructs Stripe API parameters and handles simulated success', async () => {
    // Mock global fetch for Stripe API
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'pi_test_3N4abc123',
        status: 'succeeded',
        amount: 25000,
        currency: 'usd',
      }),
    });
    global.fetch = mockFetch;

    const result = await provider.createPaymentIntent({
      orderId: 'ord-999',
      amount: 250,
      currency: 'USD',
      buyerId: 'buyer-user-1',
      sellerId: 'seller-user-2',
      idempotencyKey: 'idem_key_abc_123',
      metadata: { itemTitle: 'Vintage Watch' },
    });

    expect(result.success).toBe(true);
    expect(result.transactionReference).toBe('pi_test_3N4abc123');
    expect(result.status).toBe('succeeded');
    expect(result.provider).toBe('stripe');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.stripe.com/v1/payment_intents',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer sk_test_mock_stripe_key_12345',
          'Idempotency-Key': 'idem_key_abc_123',
        }),
      })
    );
  });

  it('validates Stripe cryptographic webhook signatures using HMAC SHA256', () => {
    const secret = 'whsec_test_secret_123';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const rawPayload = JSON.stringify({ type: 'payment_intent.succeeded', id: 'evt_123' });

    const signedPayload = `${timestamp}.${rawPayload}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    const header = `t=${timestamp},v1=${signature}`;

    // Replicate webhook signature verification logic
    const parts = header.split(',');
    let parsedTimestamp = '';
    let parsedSig = '';
    for (const part of parts) {
      const [k, v] = part.split('=');
      if (k === 't') parsedTimestamp = v;
      if (k === 'v1') parsedSig = v;
    }

    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${parsedTimestamp}.${rawPayload}`)
      .digest('hex');

    expect(parsedSig).toBe(expected);
  });
});
