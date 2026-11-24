import { describe, it, expect } from 'vitest';
import { StripeConnectService } from '../../src/lib/payments/connect';

describe('StripeConnectService Unit Tests', () => {
  const service = new StripeConnectService('sk_test_mock_123');

  it('calculates 0% commission for introductory sellers under 30 sales', () => {
    const payout = service.calculatePayout(100, 15);
    expect(payout.grossAmount).toBe(100);
    expect(payout.commissionRate).toBe(0.0);
    expect(payout.commissionAmount).toBe(0.0);
    expect(payout.processingFeeAmount).toBe(3.2); // 2.9% + $0.30
    expect(payout.netSellerPayout).toBe(96.8);
  });

  it('calculates 6% standard commission for sellers at and above 30 sales', () => {
    const payout = service.calculatePayout(100, 30);
    expect(payout.grossAmount).toBe(100);
    expect(payout.commissionRate).toBe(0.06);
    expect(payout.commissionAmount).toBe(6.0);
    expect(payout.processingFeeAmount).toBe(3.2);
    expect(payout.netSellerPayout).toBe(90.8);
  });

  it('queues transfers when seller has an account but payouts are not yet enabled', async () => {
    const result = await service.executeSellerPayout({
      orderId: 'test-order-queued-1',
      grossAmount: 150,
      destinationAccountId: 'acct_express_pending_1',
      payoutsEnabled: false,
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('queued');
    expect(result.destinationAccount).toBe('acct_express_pending_1');
    expect(result.error).toContain('queued');
  });

  it('handles custodial payout internally when seller has not connected external Stripe account', async () => {
    const result = await service.executeSellerPayout({
      orderId: 'test-order-999',
      grossAmount: 200,
      destinationAccountId: null,
      sellerCompletedSalesCount: 10,
    });

    expect(result.success).toBe(true);
    expect(result.orderId).toBe('test-order-999');
    expect(result.grossAmount).toBe(200);
    expect(result.commissionAmount).toBe(0); // 10 sales < 30 -> 0%
    expect(result.status).toBe('held_internally');
  });

  it('gracefully fails when Stripe secret key is absent', async () => {
    const unconfigured = new StripeConnectService('');
    const res = await unconfigured.createConnectedAccount('seller-123');
    expect(res.success).toBe(false);
    expect(res.error).toContain('Stripe secret key not configured');
  });
});
