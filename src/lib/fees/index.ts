/**
 * Biddr Centralized Marketplace Fee Engine
 *
 * NON-NEGOTIABLE CORE FEE RULE:
 * 1. 0% platform commission until a seller has closed 30 completed sales.
 * 2. 6% standard platform commission on and after the 30th completed sale.
 * 3. Payment-processing fees (Stripe standard: 2.9% + $0.30) are passed through at cost.
 *
 * This module is the single source of truth for all fee and commission logic.
 */

export interface FeeStructure {
  completedSalesThreshold: number;
  introductoryCommissionRate: number; // 0.00
  standardCommissionRate: number;     // 0.06
  processingFeePercent: number;       // 0.029 (2.9%)
  processingFeeFixed: number;         // 0.30 ($0.30)
}

export const BIDDR_FEE_CONFIG: FeeStructure = {
  completedSalesThreshold: 30,
  introductoryCommissionRate: 0.0,
  standardCommissionRate: 0.06,
  processingFeePercent: 0.029,
  processingFeeFixed: 0.3,
};

export interface OrderFinancialBreakdown {
  grossAmount: number;
  sellerCompletedSales: number;
  isIntroductoryRate: boolean;
  commissionRate: number;
  commissionAmount: number;
  processingFeeAmount: number;
  totalPlatformDeductions: number;
  netSellerPayout: number;
}

/**
 * Returns the platform commission rate (0.0 or 0.06) based on seller's historical sales count.
 */
export function getCommissionRate(completedSalesCount: number): number {
  if (completedSalesCount < BIDDR_FEE_CONFIG.completedSalesThreshold) {
    return BIDDR_FEE_CONFIG.introductoryCommissionRate;
  }
  return BIDDR_FEE_CONFIG.standardCommissionRate;
}

/**
 * Calculates payment processing fees passed through at cost (2.9% + $0.30).
 */
export function calculateProcessingFee(grossAmount: number): number {
  if (grossAmount <= 0) return 0;
  const fee = grossAmount * BIDDR_FEE_CONFIG.processingFeePercent + BIDDR_FEE_CONFIG.processingFeeFixed;
  return Math.round(fee * 100) / 100;
}

/**
 * Computes complete financial breakdown for an order.
 */
export function calculateOrderFinancials(
  grossAmount: number,
  sellerCompletedSalesCount: number
): OrderFinancialBreakdown {
  const safeGross = Math.max(0, grossAmount);
  const rate = getCommissionRate(sellerCompletedSalesCount);
  const isIntro = sellerCompletedSalesCount < BIDDR_FEE_CONFIG.completedSalesThreshold;

  const commission = Math.round(safeGross * rate * 100) / 100;
  const processingFee = calculateProcessingFee(safeGross);
  const totalDeductions = Math.round((commission + processingFee) * 100) / 100;
  const netPayout = Math.max(0, Math.round((safeGross - totalDeductions) * 100) / 100);

  return {
    grossAmount: safeGross,
    sellerCompletedSales: sellerCompletedSalesCount,
    isIntroductoryRate: isIntro,
    commissionRate: rate,
    commissionAmount: commission,
    processingFeeAmount: processingFee,
    totalPlatformDeductions: totalDeductions,
    netSellerPayout: netPayout,
  };
}
