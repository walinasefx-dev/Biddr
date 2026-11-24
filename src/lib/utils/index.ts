/**
 * BIDDR SHARED UTILITIES
 */

import { isValidUuid, isDemoAuctionId } from '../auction/demo-auctions';

export { isValidUuid, isDemoAuctionId };

/**
 * Formats a numeric price into USD currency representation.
 */
export function formatCurrency(amount: number): string {
  return `$${Number(amount || 0).toLocaleString('en-US')}`;
}

/**
 * Truncates an email address or username gracefully.
 */
export function formatHandle(handle?: string | null): string {
  if (!handle) return 'collector';
  return handle.startsWith('@') ? handle : `@${handle}`;
}
