import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripeConnectService } from '@/lib/payments/connect';
import { getCommissionRate, calculateOrderFinancials } from '@/lib/fees';

/**
 * GET /api/seller/payouts
 *
 * Supplies the Seller Payouts Dashboard with:
 * 1. Stripe Connect account status and onboarding state badge
 * 2. Pending balances (held under Biddr Buyer Protection awaiting delivery)
 * 3. Released balances (transferred to seller's Stripe Express account)
 * 4. Queued balances (delivered orders awaiting Stripe payout capability)
 * 5. Platform fee tier metrics (0% tier progress vs 6% standard)
 * 6. Detailed transfer and payout ledger
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

    // 1. Fetch Seller Profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, is_seller, seller_verified, stripe_connect_account_id, stripe_payouts_enabled')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.is_seller) {
      return NextResponse.json(
        { error: 'Seller privileges required to access payouts dashboard' },
        { status: 403 }
      );
    }

    // 2. Fetch Completed Sales Count for Tier Determination
    const { count: completedSalesCount } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', user.id)
      .in('status', ['delivered', 'completed']);

    const salesCount = completedSalesCount || 0;
    const commissionRate = getCommissionRate(salesCount);
    const salesUntilStandardRate = Math.max(0, 30 - salesCount);

    // 3. Check Live Stripe Connect Status if account exists
    let payoutsEnabled = Boolean(profile.stripe_payouts_enabled);
    let chargesEnabled = false;
    let requirements: any = null;

    if (profile.stripe_connect_account_id) {
      const stripeAccount = await stripeConnectService.getAccountStatus(profile.stripe_connect_account_id);
      if (stripeAccount) {
        payoutsEnabled = Boolean(stripeAccount.payouts_enabled);
        chargesEnabled = Boolean(stripeAccount.charges_enabled);
        requirements = stripeAccount.requirements;

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
    if (profile.stripe_connect_account_id) {
      if (payoutsEnabled) {
        statusBadge = 'payouts_active';
      } else {
        statusBadge = 'under_review';
      }
    }

    // 4. Fetch All Transfers for Seller
    const { data: transfersData } = await supabase
      .from('seller_transfers')
      .select(`
        id,
        order_id,
        gross_amount,
        commission_rate,
        commission_amount,
        processing_fee_amount,
        net_amount,
        transfer_reference,
        idempotency_key,
        status,
        created_at,
        orders (
          id,
          total_amount,
          drops (
            title,
            image_url
          )
        )
      `)
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false });

    const transfers = transfersData || [];

    // Calculate Released, Queued, and Fees
    let releasedBalance = 0;
    let queuedBalance = 0;
    let totalCommissionPaid = 0;
    let totalProcessingFees = 0;

    for (const t of transfers) {
      const net = Number(t.net_amount) || 0;
      const comm = Number(t.commission_amount) || 0;
      const proc = Number(t.processing_fee_amount) || 0;

      if (t.status === 'transferred') {
        releasedBalance += net;
        totalCommissionPaid += comm;
        totalProcessingFees += proc;
      } else if (t.status === 'queued') {
        queuedBalance += net;
      }
    }

    // 5. Calculate Pending Balance (Orders paid/dispatched awaiting delivery)
    const { data: pendingOrders } = await supabase
      .from('orders')
      .select(`
        id,
        total_amount,
        status,
        created_at,
        paid_at,
        drops (
          title,
          image_url
        )
      `)
      .eq('seller_id', user.id)
      .in('status', ['paid', 'dispatched'])
      .order('created_at', { ascending: false });

    let pendingBalance = 0;
    const formattedPendingOrders = (pendingOrders || []).map((o) => {
      const gross = Number(o.total_amount) || 0;
      const breakdown = calculateOrderFinancials(gross, salesCount);
      pendingBalance += breakdown.netSellerPayout;

      return {
        id: o.id,
        title: (o.drops as any)?.title || 'Auction Lot',
        imageUrl: (o.drops as any)?.image_url || null,
        grossAmount: gross,
        estimatedNetPayout: breakdown.netSellerPayout,
        commissionAmount: breakdown.commissionAmount,
        processingFeeAmount: breakdown.processingFeeAmount,
        status: o.status,
        paidAt: o.paid_at,
        createdAt: o.created_at,
      };
    });

    return NextResponse.json({
      success: true,
      sellerId: user.id,
      stripe: {
        accountId: profile.stripe_connect_account_id || null,
        payoutsEnabled,
        chargesEnabled,
        statusBadge,
        requirements,
      },
      balances: {
        pending: Math.round(pendingBalance * 100) / 100,
        released: Math.round(releasedBalance * 100) / 100,
        queued: Math.round(queuedBalance * 100) / 100,
      },
      tier: {
        completedSalesCount: salesCount,
        commissionRate,
        commissionPercent: commissionRate * 100,
        isZeroFeeTier: commissionRate === 0,
        salesUntilStandardRate,
      },
      fees: {
        totalCommissionPaid: Math.round(totalCommissionPaid * 100) / 100,
        totalProcessingFees: Math.round(totalProcessingFees * 100) / 100,
      },
      history: transfers.map((t) => ({
        id: t.id,
        orderId: t.order_id,
        itemTitle: (t.orders as any)?.drops?.title || 'Auction Lot',
        itemImageUrl: (t.orders as any)?.drops?.image_url || null,
        grossAmount: Number(t.gross_amount),
        commissionRate: Number(t.commission_rate),
        commissionAmount: Number(t.commission_amount),
        processingFeeAmount: Number(t.processing_fee_amount),
        netAmount: Number(t.net_amount),
        status: t.status,
        transferReference: t.transfer_reference,
        idempotencyKey: t.idempotency_key,
        createdAt: t.created_at,
      })),
      pendingOrders: formattedPendingOrders,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch seller payouts summary' },
      { status: 500 }
    );
  }
}
