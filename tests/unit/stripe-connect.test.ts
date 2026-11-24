import { describe, it, expect } from 'vitest';
import { StripeConnectService } from '../../src/lib/payments/connect';

describe('StripeConnectService Unit Tests', () => {
  const service = new StripeConnectService('sk_test_mock_123');

  it('calculates 5% marketplace commission and 95% net seller payout correctly', () => {
    const payout100 = service.calculatePayout(100);
    expect(payout100.grossAmount).toBe(100);
    expect(payout100.commissionAmount).toBe(5);
    expect(payout100.netPayoutAmount).toBe(95);

    const payout50 = service.calculatePayout(50);
    expect(payout50.grossAmount).toBe(50);
    expect(payout50.commissionAmount).toBe(2.5);
    expect(payout50.netPayoutAmount).toBe(47.5);

    const payout250 = service.calculatePayout(250);
    expect(payout250.grossAmount).toBe(250);
    expect(payout250.commissionAmount).toBe(12.5);
    expect(payout250.netPayoutAmount).toBe(237.5);
  });

  it('handles custodial payout internally when seller has not connected external Stripe account', async () => {
    const result = await service.executeSellerPayout({
      orderId: 'test-order-999',
      grossAmount: 200,
      destinationAccountId: null,
    });

    expect(result.success).toBe(true);
    expect(result.orderId).toBe('test-order-999');
    expect(result.grossAmount).toBe(200);
    expect(result.commissionAmount).toBe(10);
    expect(result.netPayoutAmount).toBe(190);
    expect(result.status).toBe('held_internally');
  });

  it('gracefully fails when Stripe secret key is absent', async () => {
    const unconfigured = new StripeConnectService('');
    const res = await unconfigured.createConnectedAccount('seller-123');
    expect(res.success).toBe(false);
    expect(res.error).toContain('Stripe secret key not configured');
  });
});
