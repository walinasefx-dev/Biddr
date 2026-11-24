import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripeConnectService } from '@/lib/payments/connect';

/**
 * GET /api/seller/connect
 *
 * Retrieves current seller's Stripe Connect status
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
      .select('id, is_seller, seller_verified')
      .eq('id', user.id)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      sellerId: user.id,
      isSeller: Boolean(profile?.is_seller),
      isVerified: Boolean(profile?.seller_verified),
      payoutsEnabled: true, // Operating under Biddr Buyer Protection
      platformCommissionPercent: 5,
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
 * Generates Stripe Express onboarding link for seller bank account payout setup
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
    const returnUrl = body.returnUrl || `${request.headers.get('origin') || 'http://localhost:3000'}/seller`;
    const refreshUrl = body.refreshUrl || `${request.headers.get('origin') || 'http://localhost:3000'}/seller`;

    // 1. Create or retrieve connected account
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

    // 2. Generate onboarding link
    const linkResult = await stripeConnectService.createOnboardingLink(
      accountResult.accountId,
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
      accountId: accountResult.accountId,
      onboardingUrl: linkResult.onboardingUrl,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
