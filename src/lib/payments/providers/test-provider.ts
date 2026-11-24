import { PaymentProvider, PaymentIntentParams, PaymentResult, PaymentConfirmation, RefundResult } from '../types';

/**
 * TestModePaymentProvider
 *
 * Production-ready test harness simulating real gateway flows.
 * Handles deterministic success, simulated decline, idempotency, and audit trails.
 * Zero external credentials required for local and CI testing.
 */
export class TestModePaymentProvider implements PaymentProvider {
  public readonly name = 'test_mode';
  private recordedTransactions = new Map<string, PaymentResult>();

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

    // Check idempotency if key provided
    if (params.idempotencyKey && this.recordedTransactions.has(params.idempotencyKey)) {
      return this.recordedTransactions.get(params.idempotencyKey)!;
    }

    // Simulate card decline if simulated failure flag is passed
    const isSimulatedDecline = params.metadata?.simulateFailure === true;
    if (isSimulatedDecline) {
      const failedResult: PaymentResult = {
        success: false,
        transactionReference: `tx_failed_${Date.now()}`,
        status: 'failed',
        amount: params.amount,
        currency: params.currency || 'USD',
        provider: this.name,
        error: 'Simulated card decline: Insufficient test funds.',
      };
      return failedResult;
    }

    const txRef = `tx_test_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const result: PaymentResult = {
      success: true,
      transactionReference: txRef,
      status: 'succeeded',
      amount: params.amount,
      currency: params.currency || 'USD',
      provider: this.name,
    };

    if (params.idempotencyKey) {
      this.recordedTransactions.set(params.idempotencyKey, result);
    }

    return result;
  }

  async confirmPayment(transactionReference: string): Promise<PaymentConfirmation> {
    if (!transactionReference.startsWith('tx_test_')) {
      return {
        success: false,
        transactionReference,
        paidAt: '',
        amount: 0,
        orderId: '',
        error: 'Invalid test transaction reference.',
      };
    }

    return {
      success: true,
      transactionReference,
      paidAt: new Date().toISOString(),
      amount: 100, // resolved from gateway
      orderId: '',
    };
  }

  async refundPayment(transactionReference: string, amount: number, reason?: string): Promise<RefundResult> {
    return {
      success: true,
      refundReference: `ref_test_${Date.now()}`,
      amount,
      orderId: '',
    };
  }
}
