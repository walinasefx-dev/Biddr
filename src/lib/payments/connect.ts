/**
 * StripeConnectService
 *
 * Stage 6: Automated Seller Payouts & Marketplace Custody Engine.
 * Manages Stripe Express onboarding for sellers, payout status tracking,
 * and automated transfer disbursement upon confirmed buyer delivery.
 */
export interface SellerPayoutResult {
  success: boolean;
  orderId: string;
  grossAmount: number;
  commissionAmount: number;
  netPayoutAmount: number;
  transferReference?: string;
  destinationAccount?: string;
  status: 'transferred' | 'held_internally' | 'failed';
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
  private readonly platformCommissionPercent = 5; // 5% marketplace commission

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.STRIPE_SECRET_KEY || null;
  }

  /**
   * Calculates net payout and marketplace platform commission
   */
  public calculatePayout(grossAmount: number, commissionPercent = this.platformCommissionPercent) {
    const commission = Math.round(grossAmount * (commissionPercent / 100) * 100) / 100;
    const netPayout = Math.round((grossAmount - commission) * 100) / 100;
    return {
      grossAmount,
      commissionAmount: commission,
      netPayoutAmount: netPayout,
    };
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
   * Releases custodial funds to the seller upon confirmed buyer delivery
   */
  async executeSellerPayout(params: {
    orderId: string;
    grossAmount: number;
    destinationAccountId?: string | null;
  }): Promise<SellerPayoutResult> {
    const { grossAmount, commissionAmount, netPayoutAmount } = this.calculatePayout(params.grossAmount);

    // If destination account is not provided, record payout for internal manual/ledger disbursement
    if (!params.destinationAccountId || !this.apiKey) {
      return {
        success: true,
        orderId: params.orderId,
        grossAmount,
        commissionAmount,
        netPayoutAmount,
        status: 'held_internally',
      };
    }

    try {
      const amountInCents = Math.round(netPayoutAmount * 100);
      const bodyParams = new URLSearchParams();
      bodyParams.append('amount', amountInCents.toString());
      bodyParams.append('currency', 'usd');
      bodyParams.append('destination', params.destinationAccountId);
      bodyParams.append('metadata[orderId]', params.orderId);
      bodyParams.append('description', `Biddr Seller Payout for Order ${params.orderId}`);

      const response = await fetch('https://api.stripe.com/v1/transfers', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyParams.toString(),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        return {
          success: false,
          orderId: params.orderId,
          grossAmount,
          commissionAmount,
          netPayoutAmount,
          status: 'failed',
          error: data.error?.message || 'Stripe transfer failed',
        };
      }

      return {
        success: true,
        orderId: params.orderId,
        grossAmount,
        commissionAmount,
        netPayoutAmount,
        transferReference: data.id,
        destinationAccount: params.destinationAccountId,
        status: 'transferred',
      };
    } catch (err: any) {
      return {
        success: false,
        orderId: params.orderId,
        grossAmount,
        commissionAmount,
        netPayoutAmount,
        status: 'failed',
        error: err.message || 'Network error processing seller transfer',
      };
    }
  }
}

export const stripeConnectService = new StripeConnectService();
