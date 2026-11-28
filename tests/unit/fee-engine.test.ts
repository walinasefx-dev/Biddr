import { describe, it, expect } from 'vitest';
import {
  getCommissionRate,
  calculateProcessingFee,
  calculateOrderFinancials,
  BIDDR_FEE_CONFIG,
} from '../../src/lib/fees';

describe('Biddr Centralized Fee Engine Unit Tests', () => {
  it('applies 0% commission for introductory sellers during first 30 completed sales (prior sales 0 to 29)', () => {
    // 1st sale (0 prior completed sales)
    expect(getCommissionRate(0)).toBe(0.0);
    // 2nd sale (1 prior completed sale)
    expect(getCommissionRate(1)).toBe(0.0);
    // 16th sale (15 prior completed sales)
    expect(getCommissionRate(15)).toBe(0.0);
    // 30th sale (29 prior completed sales - exact threshold edge)
    expect(getCommissionRate(29)).toBe(0.0);
  });

  it('applies 6% standard commission strictly from sale 31 onward (30+ prior completed sales)', () => {
    // 31st sale (30 prior completed sales)
    expect(getCommissionRate(30)).toBe(0.06);
    // 32nd sale (31 prior completed sales)
    expect(getCommissionRate(31)).toBe(0.06);
    // 101st sale (100 prior completed sales)
    expect(getCommissionRate(100)).toBe(0.06);
  });

  it('supports 1-based order counting (countIncludesCurrentOrder = true)', () => {
    // Sales 1 to 30: 0%
    expect(getCommissionRate(1, { countIncludesCurrentOrder: true })).toBe(0.0);
    expect(getCommissionRate(30, { countIncludesCurrentOrder: true })).toBe(0.0);
    // Sale 31 onward: 6%
    expect(getCommissionRate(31, { countIncludesCurrentOrder: true })).toBe(0.06);
  });

  it('calculates payment-processing fees passed through at cost (2.9% + $0.30)', () => {
    // $100 sale -> 2.90 + 0.30 = $3.20
    expect(calculateProcessingFee(100)).toBe(3.2);

    // $50 sale -> 1.45 + 0.30 = $1.75
    expect(calculateProcessingFee(50)).toBe(1.75);

    // $0 sale
    expect(calculateProcessingFee(0)).toBe(0);
  });

  it('computes exact financials for 30th sale (0% commission, only pass-through fee)', () => {
    // 30th sale corresponds to 29 prior completed sales
    const breakdown = calculateOrderFinancials(100, 29);
    expect(breakdown.grossAmount).toBe(100);
    expect(breakdown.isIntroductoryRate).toBe(true);
    expect(breakdown.commissionRate).toBe(0.0);
    expect(breakdown.commissionAmount).toBe(0.0);
    expect(breakdown.processingFeeAmount).toBe(3.2);
    expect(breakdown.totalPlatformDeductions).toBe(3.2);
    expect(breakdown.netSellerPayout).toBe(96.8); // $100 - $3.20
  });

  it('computes exact financials for 31st sale (6% standard commission + pass-through fee)', () => {
    // 31st sale corresponds to 30 prior completed sales
    const breakdown = calculateOrderFinancials(100, 30);
    expect(breakdown.grossAmount).toBe(100);
    expect(breakdown.isIntroductoryRate).toBe(false);
    expect(breakdown.commissionRate).toBe(0.06);
    expect(breakdown.commissionAmount).toBe(6.0); // 6% of $100
    expect(breakdown.processingFeeAmount).toBe(3.2);
    expect(breakdown.totalPlatformDeductions).toBe(9.2); // $6.00 + $3.20
    expect(breakdown.netSellerPayout).toBe(90.8); // $100 - $9.20
  });

  it('handles edge case $0 or negative inputs gracefully', () => {
    const zeroBreakdown = calculateOrderFinancials(0, 5);
    expect(zeroBreakdown.grossAmount).toBe(0);
    expect(zeroBreakdown.commissionAmount).toBe(0);
    expect(zeroBreakdown.processingFeeAmount).toBe(0);
    expect(zeroBreakdown.netSellerPayout).toBe(0);
  });
});
