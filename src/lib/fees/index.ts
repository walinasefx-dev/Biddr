/**
 * Biddr Centralized Marketplace Fee Engine
 *
 * NON-NEGOTIABLE CORE FEE RULE:
 * 1. 0% platform commission for a seller's first 30 completed sales (Sales 1 through 30).
 * 2. 6% standard platform commission from sale 31 onward.
 * 3. Payment-processing fees (Stripe standard: 2.9% + $0.30) are passed through at cost.
 *
 * HOW SALES ARE COUNTED:
 * In order settlement (e.g. /api/orders/[id]/confirm-delivery), sales are counted BEFORE
 * this current order is marked delivered:
 * - When prior completed sales count = 0 (1st sale): 0% commission.
 * - When prior completed sales count = 29 (30th sale): 0% commission.
 * - When prior completed sales count = 30 (30 sales already completed; this is sale 31): 6% commission.
 *
 * If evaluated by 1-based order sequence (countIncludesCurrentOrder = true):
 * - Sales 1 through 30: 0% commission.
 * - Sale 31 onward: 6% commission.
 *
 * This module is the single source of truth for all fee and commission logic.
 */

export interface FeeStructure {
  completedSalesThreshold: number;    // 30 completed sales
  introductoryCommissionRate: number; // 0.00 (0%)
  standardCommissionRate: number;     // 0.06 (6%)
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
 * Returns platform commission rate (0.0 or 0.06) based on seller's completed sales count.
 *
 * @param completedSalesCount Count of sales (default: prior sales before this order).
 * @param options.countIncludesCurrentOrder Set to true if count already includes the current order.
 */
export function getCommissionRate(
  completedSalesCount: number,
  options?: { countIncludesCurrentOrder?: boolean }
): number {
  const threshold = BIDDR_FEE_CONFIG.completedSalesThreshold;
  if (options?.countIncludesCurrentOrder) {
    return completedSalesCount <= threshold
      ? BIDDR_FEE_CONFIG.introductoryCommissionRate
      : BIDDR_FEE_CONFIG.standardCommissionRate;
  }
  return completedSalesCount < threshold
    ? BIDDR_FEE_CONFIG.introductoryCommissionRate
    : BIDDR_FEE_CONFIG.standardCommissionRate;
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
 *
 * @param grossAmount Total order amount paid by buyer.
 * @param sellerCompletedSalesCount Number of prior completed sales for this seller.
 * @param options.countIncludesCurrentOrder Set to true if count includes current order.
 */
export function calculateOrderFinancials(
  grossAmount: number,
  sellerCompletedSalesCount: number,
  options?: { countIncludesCurrentOrder?: boolean }
): OrderFinancialBreakdown {
  const safeGross = Math.max(0, grossAmount);
  const rate = getCommissionRate(sellerCompletedSalesCount, options);
  const isIntro = rate === BIDDR_FEE_CONFIG.introductoryCommissionRate;

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
