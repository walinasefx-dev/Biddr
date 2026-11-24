import { describe, it, expect } from 'vitest';
import {
  getCommissionRate,
  calculateProcessingFee,
  calculateOrderFinancials,
  BIDDR_FEE_CONFIG,
} from '../../src/lib/fees';

describe('Biddr Centralized Fee Engine Unit Tests', () => {
  it('applies 0% commission for introductory sellers (sales 0 to 29)', () => {
    // 0 sales
    expect(getCommissionRate(0)).toBe(0.0);
    // 1 sale
    expect(getCommissionRate(1)).toBe(0.0);
    // 15 sales
    expect(getCommissionRate(15)).toBe(0.0);
    // 29 sales (edge case right before threshold)
    expect(getCommissionRate(29)).toBe(0.0);
  });

  it('applies 6% standard commission starting strictly at the 30th sale and above', () => {
    // 30 sales (exact threshold)
    expect(getCommissionRate(30)).toBe(0.06);
    // 31 sales
    expect(getCommissionRate(31)).toBe(0.06);
    // 100 sales
    expect(getCommissionRate(100)).toBe(0.06);
  });

  it('calculates payment-processing fees passed through at cost (2.9% + $0.30)', () => {
    // $100 sale -> 2.90 + 0.30 = $3.20
    expect(calculateProcessingFee(100)).toBe(3.2);

    // $50 sale -> 1.45 + 0.30 = $1.75
    expect(calculateProcessingFee(50)).toBe(1.75);

    // $0 sale
    expect(calculateProcessingFee(0)).toBe(0);
  });

  it('computes exact financials for 29th sale (0% commission, only pass-through fee)', () => {
    const breakdown = calculateOrderFinancials(100, 29);
    expect(breakdown.grossAmount).toBe(100);
    expect(breakdown.isIntroductoryRate).toBe(true);
    expect(breakdown.commissionRate).toBe(0.0);
    expect(breakdown.commissionAmount).toBe(0.0);
    expect(breakdown.processingFeeAmount).toBe(3.2);
    expect(breakdown.totalPlatformDeductions).toBe(3.2);
    expect(breakdown.netSellerPayout).toBe(96.8); // $100 - $3.20
  });

  it('computes exact financials for 30th sale (6% commission + pass-through fee)', () => {
    const breakdown = calculateOrderFinancials(100, 30);
    expect(breakdown.grossAmount).toBe(100);
    expect(breakdown.isIntroductoryRate).toBe(false);
    expect(breakdown.commissionRate).toBe(0.06);
    expect(breakdown.commissionAmount).toBe(6.0); // 6% of $100
    expect(breakdown.processingFeeAmount).toBe(3.2);
    expect(breakdown.totalPlatformDeductions).toBe(9.2); // $6.00 + $3.20
    expect(breakdown.netSellerPayout).toBe(90.8); // $100 - $9.20
  });

  it('computes exact financials for 31st sale (6% commission + pass-through fee)', () => {
    const breakdown = calculateOrderFinancials(200, 31);
    expect(breakdown.grossAmount).toBe(200);
    expect(breakdown.commissionRate).toBe(0.06);
    expect(breakdown.commissionAmount).toBe(12.0); // 6% of $200
    // Processing: $200 * 0.029 + 0.30 = $5.80 + $0.30 = $6.10
    expect(breakdown.processingFeeAmount).toBe(6.1);
    expect(breakdown.totalPlatformDeductions).toBe(18.1);
    expect(breakdown.netSellerPayout).toBe(181.9);
  });
});
