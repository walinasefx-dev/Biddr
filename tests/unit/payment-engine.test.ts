import { describe, it, expect } from 'vitest';
import { PaymentService } from '../../src/lib/payments/service';
import { TestModePaymentProvider } from '../../src/lib/payments/providers/test-provider';

describe('Stage 4 — Payment Architecture & Provider Abstraction', () => {
  const service = new PaymentService();

  it('successfully authorizes an escrow payment intent and issues a transaction reference', async () => {
    const result = await service.processOrderPayment({
      orderId: '00000000-0000-0000-0000-000000000001',
      amount: 450.0,
      currency: 'USD',
      buyerId: 'user-buyer-1',
      sellerId: 'user-seller-1',
      paymentMethod: 'card',
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('succeeded');
    expect(result.amount).toBe(450.0);
    expect(result.provider).toBe('test_mode');
    expect(result.transactionReference).toMatch(/^tx_test_/);
  });

  it('rejects payments with zero or negative amounts', async () => {
    const result = await service.processOrderPayment({
      orderId: '00000000-0000-0000-0000-000000000001',
      amount: -50.0,
      buyerId: 'user-buyer-1',
      sellerId: 'user-seller-1',
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe('failed');
    expect(result.error).toContain('greater than zero');
  });

  it('handles simulated card decline when simulateFailure flag is passed', async () => {
    const result = await service.processOrderPayment({
      orderId: '00000000-0000-0000-0000-000000000001',
      amount: 150.0,
      buyerId: 'user-buyer-1',
      sellerId: 'user-seller-1',
      metadata: { simulateFailure: true },
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe('failed');
    expect(result.error).toContain('Insufficient test funds');
  });

  it('guarantees idempotency when an idempotency key is reused', async () => {
    const key = `idem_${Date.now()}`;
    const firstCall = await service.processOrderPayment({
      orderId: 'ord-123',
      amount: 200,
      buyerId: 'b-1',
      sellerId: 's-1',
      idempotencyKey: key,
    });

    const secondCall = await service.processOrderPayment({
      orderId: 'ord-123',
      amount: 200,
      buyerId: 'b-1',
      sellerId: 's-1',
      idempotencyKey: key,
    });

    expect(firstCall.transactionReference).toBe(secondCall.transactionReference);
    expect(firstCall.success).toBe(true);
  });

  it('verifies valid transaction references and rejects malformed references', async () => {
    const validConfirm = await service.verifyPayment('tx_test_123456');
    expect(validConfirm.success).toBe(true);

    const invalidConfirm = await service.verifyPayment('invalid_ref');
    expect(invalidConfirm.success).toBe(false);
    expect(invalidConfirm.error).toContain('Invalid test transaction reference');
  });

  it('processes refund requests correctly', async () => {
    const refund = await service.refund('tx_test_123456', 200, 'Customer return');
    expect(refund.success).toBe(true);
    expect(refund.amount).toBe(200);
    expect(refund.refundReference).toMatch(/^ref_test_/);
  });
});
