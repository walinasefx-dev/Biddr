import { PaymentProvider, PaymentIntentParams, PaymentResult, PaymentConfirmation, RefundResult } from './types';
import { TestModePaymentProvider } from './providers/test-provider';

/**
 * PaymentService
 *
 * Central payment orchestrator. Decouples application routes from any specific
 * payment provider implementation (Stripe, Mobile Money, PayPal, Test Mode).
 */
export class PaymentService {
  private providers = new Map<string, PaymentProvider>();
  private defaultProvider: PaymentProvider;

  constructor() {
    this.defaultProvider = new TestModePaymentProvider();
    this.registerProvider(this.defaultProvider);
  }

  public registerProvider(provider: PaymentProvider): void {
    this.providers.set(provider.name, provider);
  }

  public getProvider(name?: string): PaymentProvider {
    if (!name) return this.defaultProvider;
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Payment provider "${name}" is not registered.`);
    }
    return provider;
  }

  /**
   * Processes a payment for an order using the designated provider.
   */
  public async processOrderPayment(
    params: PaymentIntentParams,
    providerName?: string
  ): Promise<PaymentResult> {
    const provider = this.getProvider(providerName);
    return await provider.createPaymentIntent(params);
  }

  /**
   * Confirms payment through trusted server verification.
   */
  public async verifyPayment(
    transactionReference: string,
    providerName?: string
  ): Promise<PaymentConfirmation> {
    const provider = this.getProvider(providerName);
    return await provider.confirmPayment(transactionReference);
  }

  /**
   * Issues a refund.
   */
  public async refund(
    transactionReference: string,
    amount: number,
    reason?: string,
    providerName?: string
  ): Promise<RefundResult> {
    const provider = this.getProvider(providerName);
    return await provider.refundPayment(transactionReference, amount, reason);
  }
}

export const paymentService = new PaymentService();
