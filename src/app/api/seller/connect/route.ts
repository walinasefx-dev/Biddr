import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripeConnectService } from '@/lib/payments/connect';
import { getCommissionRate } from '@/lib/fees';

/**
 * GET /api/seller/connect
 *
 * Retrieves current seller's Stripe Connect status, onboarding status, and commission tier.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, is_seller, seller_verified, stripe_connect_account_id, stripe_payouts_enabled')
      .eq('id', user.id)
      .maybeSingle();

    // Query completed sales count for accurate commission rate
    const { count: completedSalesCount } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', user.id)
      .in('status', ['delivered', 'completed']);

    const salesCount = completedSalesCount || 0;
    const commissionRate = getCommissionRate(salesCount);

    let stripeAccountDetails = null;
    let payoutsEnabled = Boolean(profile?.stripe_payouts_enabled);
    let chargesEnabled = false;
    let requirements: any = null;

    if (profile?.stripe_connect_account_id) {
      const stripeAccount = await stripeConnectService.getAccountStatus(profile.stripe_connect_account_id);
      if (stripeAccount) {
        payoutsEnabled = Boolean(stripeAccount.payouts_enabled);
        chargesEnabled = Boolean(stripeAccount.charges_enabled);
        requirements = stripeAccount.requirements;

        // If DB state is stale compared to Stripe, update it
        if (profile.stripe_payouts_enabled !== payoutsEnabled) {
          await supabase
            .from('profiles')
            .update({ stripe_payouts_enabled: payoutsEnabled })
            .eq('id', user.id);
        }
      }
    }

    // Determine status badge
    let statusBadge: 'onboarding_required' | 'under_review' | 'payouts_active' = 'onboarding_required';
    if (profile?.stripe_connect_account_id) {
      if (payoutsEnabled) {
        statusBadge = 'payouts_active';
      } else {
        statusBadge = 'under_review';
      }
    }

    return NextResponse.json({
      success: true,
      sellerId: user.id,
      isSeller: Boolean(profile?.is_seller),
      isVerified: Boolean(profile?.seller_verified),
      stripeConnectAccountId: profile?.stripe_connect_account_id || null,
      payoutsEnabled,
      chargesEnabled,
      statusBadge,
      requirements,
      completedSalesCount: salesCount,
      commissionRate,
      commissionPercent: commissionRate * 100,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to retrieve connect status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/seller/connect
 *
 * Generates Stripe Express onboarding link for seller bank account payout setup.
 * Persists the created Stripe account ID into profiles table.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const origin = request.headers.get('origin') || 'http://localhost:3000';
    const returnUrl = body.returnUrl || `${origin}/seller/payouts?status=returned`;
    const refreshUrl = body.refreshUrl || `${origin}/seller/payouts?status=refresh`;

    // 1. Fetch current profile to see if account already exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_connect_account_id')
      .eq('id', user.id)
      .maybeSingle();

    let accountId = profile?.stripe_connect_account_id;

    // 2. If no connected account yet, create one
    if (!accountId) {
      const accountResult = await stripeConnectService.createConnectedAccount(
        user.id,
        user.email,
        user.user_metadata?.username
      );

      if (!accountResult.success || !accountResult.accountId) {
        return NextResponse.json(
          { error: accountResult.error || 'Failed to initialize Stripe Connect account' },
          { status: 500 }
        );
      }

      accountId = accountResult.accountId;

      // Persist account ID to profile
      await supabase
        .from('profiles')
        .update({ stripe_connect_account_id: accountId })
        .eq('id', user.id);
    }

    // 3. Generate onboarding link
    const linkResult = await stripeConnectService.createOnboardingLink(
      accountId,
      returnUrl,
      refreshUrl
    );

    if (!linkResult.success) {
      return NextResponse.json(
        { error: linkResult.error || 'Failed to generate onboarding link' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      accountId,
      onboardingUrl: linkResult.onboardingUrl,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
