import { calculateOrderFinancials, getCommissionRate, OrderFinancialBreakdown } from '../fees';

/**
 * StripeConnectService
 *
 * Automated Seller Payouts & Marketplace Custody Engine.
 * Implements SEPARATE CHARGES AND TRANSFERS:
 * 1. Buyer pays platform directly (held under Biddr Buyer Protection).
 * 2. Platform creates an idempotent transfer to seller's Stripe Express account
 *    upon confirmed delivery or dispute resolution in seller's favor.
 * 3. Platform fee rule enforced: 0% under 30 completed sales, 6% standard.
 *    Payment-processing fee passed through at cost (2.9% + $0.30).
 */
export interface SellerPayoutResult {
  success: boolean;
  orderId: string;
  grossAmount: number;
  commissionRate: number;
  commissionAmount: number;
  processingFeeAmount: number;
  netPayoutAmount: number;
  transferReference?: string;
  destinationAccount?: string;
  status: 'transferred' | 'held_internally' | 'queued' | 'failed';
  error?: string;
}

export interface ConnectAccountResult {
  success: boolean;
  accountId?: string;
  onboardingUrl?: string;
  error?: string;
}

export class StripeConnectService {
  private apiKey: string | null;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.STRIPE_SECRET_KEY || null;
  }

  /**
   * Calculates financials using centralized fee engine
   */
  public calculatePayout(grossAmount: number, sellerCompletedSales = 0): OrderFinancialBreakdown {
    return calculateOrderFinancials(grossAmount, sellerCompletedSales);
  }

  /**
   * Initiates a Stripe Express connected account for a seller
   */
  async createConnectedAccount(
    sellerId: string,
    email?: string,
    businessName?: string
  ): Promise<ConnectAccountResult> {
    if (!this.apiKey) {
      return { success: false, error: 'Stripe secret key not configured' };
    }

    try {
      const bodyParams = new URLSearchParams();
      bodyParams.append('type', 'express');
      bodyParams.append('capabilities[card_payments][requested]', 'true');
      bodyParams.append('capabilities[transfers][requested]', 'true');
      bodyParams.append('metadata[sellerId]', sellerId);

      if (email) {
        bodyParams.append('email', email);
      }
      if (businessName) {
        bodyParams.append('business_profile[name]', businessName);
      }

      const response = await fetch('https://api.stripe.com/v1/accounts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyParams.toString(),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        return { success: false, error: data.error?.message || 'Failed to create Stripe account' };
      }

      return {
        success: true,
        accountId: data.id,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error creating Stripe account' };
    }
  }

  /**
   * Creates an account link for the seller to complete Stripe onboarding
   */
  async createOnboardingLink(
    accountId: string,
    returnUrl: string,
    refreshUrl: string
  ): Promise<ConnectAccountResult> {
    if (!this.apiKey) {
      return { success: false, error: 'Stripe secret key not configured' };
    }

    try {
      const bodyParams = new URLSearchParams();
      bodyParams.append('account', accountId);
      bodyParams.append('refresh_url', refreshUrl);
      bodyParams.append('return_url', returnUrl);
      bodyParams.append('type', 'account_onboarding');

      const response = await fetch('https://api.stripe.com/v1/account_links', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyParams.toString(),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        return { success: false, error: data.error?.message || 'Failed to generate onboarding link' };
      }

      return {
        success: true,
        accountId,
        onboardingUrl: data.url,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error generating onboarding link' };
    }
  }

  /**
   * Retrieves account status from Stripe (payouts_enabled, charges_enabled)
   */
  async getAccountStatus(accountId: string) {
    if (!this.apiKey) return null;
    try {
      const response = await fetch(`https://api.stripe.com/v1/accounts/${encodeURIComponent(accountId)}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  /**
   * Executes a direct transfer to a connected Stripe Express account with idempotency
   */
  async executeDirectTransfer(params: {
    amountInCents: number;
    destinationAccountId: string;
    orderId: string;
    idempotencyKey?: string;
  }): Promise<{ success: boolean; transferId?: string; error?: string }> {
    if (!this.apiKey) {
      return { success: false, error: 'Stripe API key not configured' };
    }

    try {
      const bodyParams = new URLSearchParams();
      bodyParams.append('amount', params.amountInCents.toString());
      bodyParams.append('currency', 'usd');
      bodyParams.append('destination', params.destinationAccountId);
      bodyParams.append('metadata[orderId]', params.orderId);
      bodyParams.append('description', `Biddr Seller Payout for Order ${params.orderId}`);

      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': params.idempotencyKey || `tr_${params.orderId}`,
      };

      const response = await fetch('https://api.stripe.com/v1/transfers', {
        method: 'POST',
        headers,
        body: bodyParams.toString(),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        return { success: false, error: data.error?.message || 'Stripe transfer failed' };
      }

      return { success: true, transferId: data.id };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error on Stripe transfer' };
    }
  }

  /**
   * Releases custodial funds to the seller upon confirmed buyer delivery.
   * Guarantees idempotency via Stripe Idempotency-Key header.
   */
  async executeSellerPayout(params: {
    orderId: string;
    grossAmount: number;
    destinationAccountId?: string | null;
    sellerCompletedSalesCount?: number;
    payoutsEnabled?: boolean;
    idempotencyKey?: string;
  }): Promise<SellerPayoutResult> {
    const financials = this.calculatePayout(params.grossAmount, params.sellerCompletedSalesCount || 0);

    // If destination account is not provided, record payout for internal manual ledger
    if (!params.destinationAccountId || !this.apiKey) {
      return {
        success: true,
        orderId: params.orderId,
        grossAmount: financials.grossAmount,
        commissionRate: financials.commissionRate,
        commissionAmount: financials.commissionAmount,
        processingFeeAmount: financials.processingFeeAmount,
        netPayoutAmount: financials.netSellerPayout,
        status: 'held_internally',
      };
    }

    // Block sellers who are not payout-enabled from receiving release; queue transfer
    if (params.payoutsEnabled === false) {
      return {
        success: true,
        orderId: params.orderId,
        grossAmount: financials.grossAmount,
        commissionRate: financials.commissionRate,
        commissionAmount: financials.commissionAmount,
        processingFeeAmount: financials.processingFeeAmount,
        netPayoutAmount: financials.netSellerPayout,
        destinationAccount: params.destinationAccountId,
        status: 'queued',
        error: 'Seller payouts are not yet enabled on Stripe Connect. Transfer queued.',
      };
    }

    const amountInCents = Math.round(financials.netSellerPayout * 100);
    const transferResult = await this.executeDirectTransfer({
      amountInCents,
      destinationAccountId: params.destinationAccountId,
      orderId: params.orderId,
      idempotencyKey: params.idempotencyKey,
    });

    if (!transferResult.success) {
      return {
        success: false,
        orderId: params.orderId,
        grossAmount: financials.grossAmount,
        commissionRate: financials.commissionRate,
        commissionAmount: financials.commissionAmount,
        processingFeeAmount: financials.processingFeeAmount,
        netPayoutAmount: financials.netSellerPayout,
        status: 'failed',
        error: transferResult.error || 'Stripe transfer failed',
      };
    }

    return {
      success: true,
      orderId: params.orderId,
      grossAmount: financials.grossAmount,
      commissionRate: financials.commissionRate,
      commissionAmount: financials.commissionAmount,
      processingFeeAmount: financials.processingFeeAmount,
      netPayoutAmount: financials.netSellerPayout,
      transferReference: transferResult.transferId,
      destinationAccount: params.destinationAccountId,
      status: 'transferred',
    };
  }
}

export const stripeConnectService = new StripeConnectService();
