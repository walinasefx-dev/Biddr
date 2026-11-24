import type {
  PaymentProvider,
  PaymentIntentParams,
  PaymentResult,
  PaymentConfirmation,
  RefundResult,
} from '../types';

/**
 * StripePaymentProvider
 *
 * Production Stripe Payment Intent gateway implementation.
 * Uses Stripe's REST API over HTTPS with Idempotency-Key guarantees,
 * metadata binding for orders, and transaction audit trails.
 */
export class StripePaymentProvider implements PaymentProvider {
  public readonly name = 'stripe';
  private apiKey: string | null;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.STRIPE_SECRET_KEY || null;
  }

  /**
   * Sets or updates API Key dynamically
   */
  public setApiKey(key: string): void {
    this.apiKey = key;
  }

  /**
   * Creates a Stripe PaymentIntent for an order.
   */
  async createPaymentIntent(params: PaymentIntentParams): Promise<PaymentResult> {
    if (params.amount <= 0) {
      return {
        success: false,
        transactionReference: '',
        status: 'failed',
        amount: params.amount,
        currency: params.currency || 'USD',
        provider: this.name,
        error: 'Payment amount must be greater than zero.',
      };
    }

    if (!this.apiKey) {
      return {
        success: false,
        transactionReference: '',
        status: 'failed',
        amount: params.amount,
        currency: params.currency || 'USD',
        provider: this.name,
        error: 'Stripe secret key is not configured. Set STRIPE_SECRET_KEY.',
      };
    }

    try {
      // Amount in smallest currency unit (cents for USD)
      const amountInCents = Math.round(params.amount * 100);
      const currency = (params.currency || 'USD').toLowerCase();

      const bodyParams = new URLSearchParams();
      bodyParams.append('amount', amountInCents.toString());
      bodyParams.append('currency', currency);
      bodyParams.append('metadata[orderId]', params.orderId);
      bodyParams.append('metadata[buyerId]', params.buyerId);
      bodyParams.append('metadata[sellerId]', params.sellerId);
      bodyParams.append('automatic_payment_methods[enabled]', 'true');

      if (params.metadata) {
        for (const [key, val] of Object.entries(params.metadata)) {
          bodyParams.append(`metadata[${key}]`, String(val));
        }
      }

      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      };

      if (params.idempotencyKey) {
        headers['Idempotency-Key'] = params.idempotencyKey;
      }

      const response = await fetch('https://api.stripe.com/v1/payment_intents', {
        method: 'POST',
        headers,
        body: bodyParams.toString(),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        return {
          success: false,
          transactionReference: '',
          status: 'failed',
          amount: params.amount,
          currency: params.currency || 'USD',
          provider: this.name,
          error: data.error?.message || 'Stripe payment intent creation failed',
        };
      }

      return {
        success: true,
        transactionReference: data.id,
        status: data.status === 'succeeded' ? 'succeeded' : 'pending',
        amount: params.amount,
        currency: params.currency || 'USD',
        provider: this.name,
      };
    } catch (err: any) {
      return {
        success: false,
        transactionReference: '',
        status: 'failed',
        amount: params.amount,
        currency: params.currency || 'USD',
        provider: this.name,
        error: err.message || 'Network error communicating with Stripe API',
      };
    }
  }

  /**
   * Confirms payment state by retrieving the PaymentIntent from Stripe.
   */
  async confirmPayment(transactionReference: string): Promise<PaymentConfirmation> {
    if (!this.apiKey) {
      return {
        success: false,
        transactionReference,
        paidAt: '',
        amount: 0,
        orderId: '',
        error: 'Stripe secret key is not configured.',
      };
    }

    try {
      const response = await fetch(
        `https://api.stripe.com/v1/payment_intents/${encodeURIComponent(transactionReference)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || data.error) {
        return {
          success: false,
          transactionReference,
          paidAt: '',
          amount: 0,
          orderId: '',
          error: data.error?.message || 'Failed to retrieve payment intent from Stripe',
        };
      }

      const isSucceeded = data.status === 'succeeded';
      return {
        success: isSucceeded,
        transactionReference: data.id,
        paidAt: isSucceeded ? new Date().toISOString() : '',
        amount: data.amount / 100,
        orderId: data.metadata?.orderId || '',
        error: isSucceeded ? undefined : `PaymentIntent status is "${data.status}"`,
      };
    } catch (err: any) {
      return {
        success: false,
        transactionReference,
        paidAt: '',
        amount: 0,
        orderId: '',
        error: err.message || 'Network error confirming Stripe payment',
      };
    }
  }

  /**
   * Issues a refund on a Stripe charge/payment intent.
   */
  async refundPayment(
    transactionReference: string,
    amount: number,
    reason?: string
  ): Promise<RefundResult> {
    if (!this.apiKey) {
      return {
        success: false,
        refundReference: '',
        amount,
        orderId: '',
        error: 'Stripe secret key is not configured.',
      };
    }

    try {
      const bodyParams = new URLSearchParams();
      bodyParams.append('payment_intent', transactionReference);
      bodyParams.append('amount', Math.round(amount * 100).toString());
      if (reason) {
        bodyParams.append('reason', reason === 'fraudulent' ? 'fraudulent' : 'requested_by_customer');
      }

      const response = await fetch('https://api.stripe.com/v1/refunds', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyParams.toString(),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        return {
          success: false,
          refundReference: '',
          amount,
          orderId: '',
          error: data.error?.message || 'Stripe refund failed',
        };
      }

      return {
        success: true,
        refundReference: data.id,
        amount,
        orderId: data.metadata?.orderId || '',
      };
    } catch (err: any) {
      return {
        success: false,
        refundReference: '',
        amount,
        orderId: '',
        error: err.message || 'Network error processing Stripe refund',
      };
    }
  }
}
