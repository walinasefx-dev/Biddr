import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/admin';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { stripeConnectService } from '@/lib/payments/connect';

/**
 * GET /api/admin/disputes
 *
 * Lists all marketplace disputes with joined order and participant profiles.
 * Strictly restricted to admins.
 */
export async function GET() {
  const auth = await verifyAdminAuth();
  if (!auth.authorized) {
    return auth.errorResponse!;
  }

  const supabase = await createClient();

  try {
    const { data: disputes, error } = await supabase
      .from('disputes')
      .select(`
        *,
        raiser:profiles!disputes_raised_by_fkey(username, avatar_url),
        order:orders(
          *,
          buyer:profiles!orders_buyer_id_fkey(username, avatar_url),
          seller:profiles!orders_seller_id_fkey(username, avatar_url, stripe_connect_account_id, stripe_payouts_enabled)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      disputes: disputes || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/disputes
 *
 * Resolves a dispute:
 * - refund: Issues full/partial Stripe refund, transitions order to refunded, dispute to resolved_refund
 * - release: Releases funds to seller via Stripe Connect, transitions order to delivered, dispute to resolved_release
 * - dismiss: Dismisses dispute, transitions dispute to dismissed
 *
 * Enforces mandatory resolution reason and append-only audit logging.
 */
export async function POST(request: Request) {
  const auth = await verifyAdminAuth();
  if (!auth.authorized) {
    return auth.errorResponse!;
  }

  try {
    const body = await request.json();
    const { disputeId, action, reason, refundAmount } = body;

    if (!disputeId || !action || !reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'Missing required parameters: disputeId, action, and mandatory reason.' },
        { status: 400 }
      );
    }

    if (!['refund', 'release', 'dismiss'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Supported: refund, release, dismiss' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    let serviceClient: any;
    try {
      serviceClient = createServiceClient();
    } catch {
      serviceClient = supabase;
    }

    // 1. Fetch Dispute with Order
    const { data: dispute, error: disputeErr } = await supabase
      .from('disputes')
      .select(`
        *,
        order:orders(
          *,
          seller:profiles!orders_seller_id_fkey(*)
        )
      `)
      .eq('id', disputeId)
      .maybeSingle();

    if (disputeErr || !dispute) {
      return NextResponse.json({ error: 'Dispute record not found' }, { status: 404 });
    }

    // Enforce idempotency: prevent re-resolving already resolved dispute
    if (['resolved_refund', 'resolved_release', 'dismissed', 'resolved_buyer', 'resolved_seller'].includes(dispute.status)) {
      return NextResponse.json(
        { error: `Dispute is already resolved (status: ${dispute.status})` },
        { status: 400 }
      );
    }

    const order = dispute.order as any;
    if (!order) {
      return NextResponse.json({ error: 'Associated order not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const beforeState = { dispute_status: dispute.status, order_status: order.status };

    // ============================================================
    // ACTION: REFUND (Full or Partial via Stripe Refunds API)
    // ============================================================
    if (action === 'refund') {
      const gross = Number(order.total_amount || 0);
      const amountToRefund = refundAmount ? Number(refundAmount) : gross;
      const stripeKey = process.env.STRIPE_SECRET_KEY;

      let refundRef = `ref_sim_${Date.now()}`;

      if (stripeKey && order.payment_reference && order.payment_reference.startsWith('pi_')) {
        try {
          const bodyParams = new URLSearchParams();
          bodyParams.append('payment_intent', order.payment_reference);
          bodyParams.append('amount', Math.round(amountToRefund * 100).toString());
          bodyParams.append('reason', 'requested_by_customer');
          bodyParams.append('metadata[orderId]', order.id);
          bodyParams.append('metadata[disputeId]', dispute.id);

          const refundRes = await fetch('https://api.stripe.com/v1/refunds', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${stripeKey}`,
              'Content-Type': 'application/x-www-form-urlencoded',
              'Idempotency-Key': `ref_${dispute.id}`,
            },
            body: bodyParams.toString(),
          });

          const refundData = await refundRes.json();
          if (!refundRes.ok || refundData.error) {
            return NextResponse.json(
              { error: refundData.error?.message || 'Stripe refund call failed' },
              { status: 500 }
            );
          }
          refundRef = refundData.id;
        } catch (rfErr: any) {
          return NextResponse.json(
            { error: rfErr.message || 'Network error processing Stripe refund' },
            { status: 500 }
          );
        }
      }

      // Update Dispute & Order
      await supabase
        .from('disputes')
        .update({
          status: 'resolved_refund',
          resolution_notes: reason.trim(),
          resolved_by: auth.user.id,
          resolved_at: now,
          updated_at: now,
        })
        .eq('id', dispute.id);

      await supabase
        .from('orders')
        .update({
          status: 'refunded',
          payment_status: 'refunded',
          updated_at: now,
        })
        .eq('id', order.id);

      const afterState = {
        dispute_status: 'resolved_refund',
        order_status: 'refunded',
        refund_amount: amountToRefund,
        refund_ref: refundRef,
      };

      // Append-only Audit Log
      await serviceClient.from('audit_logs').insert({
        actor_id: auth.user.id,
        action: 'dispute.resolve_refund',
        target_type: 'dispute',
        target_id: dispute.id,
        before_state: beforeState,
        after_state: afterState,
        reason: reason.trim(),
      });

      // Notifications
      await supabase.from('notifications').insert([
        {
          user_id: order.buyer_id,
          type: 'system',
          title: 'Dispute Resolved: Refund Issued',
          message: `Your dispute for order "${order.item_title}" was resolved. A refund of $${amountToRefund.toLocaleString()} has been processed. Note: "${reason.trim()}"`,
          link_url: `/orders/${order.id}`,
        },
        {
          user_id: order.seller_id,
          type: 'system',
          title: 'Dispute Resolution: Buyer Refunded',
          message: `The dispute for order "${order.item_title}" was closed with a refund issued to the buyer. Resolution note: "${reason.trim()}"`,
          link_url: `/seller/orders/${order.id}`,
        },
      ]);

      return NextResponse.json({
        success: true,
        action: 'resolved_refund',
        disputeId: dispute.id,
        refundRef,
        amountRefunded: amountToRefund,
      });
    }

    // ============================================================
    // ACTION: RELEASE FUNDS TO SELLER
    // ============================================================
    if (action === 'release') {
      const gross = Number(order.total_amount || 0);

      // Query seller completed sales count for accurate fee calculation
      const { count: completedSalesCount } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', order.seller_id)
        .in('status', ['delivered', 'completed']);

      const destinationAccount = order.seller?.stripe_connect_account_id || null;
      const payoutsEnabled = order.seller?.stripe_payouts_enabled ?? true;

      const payoutResult = await stripeConnectService.executeSellerPayout({
        orderId: order.id,
        grossAmount: gross,
        destinationAccountId: destinationAccount,
        sellerCompletedSalesCount: completedSalesCount || 0,
        payoutsEnabled,
        idempotencyKey: `tr_dispute_${dispute.id}`,
      });

      // Update Dispute & Order
      await supabase
        .from('disputes')
        .update({
          status: 'resolved_release',
          resolution_notes: reason.trim(),
          resolved_by: auth.user.id,
          resolved_at: now,
          updated_at: now,
        })
        .eq('id', dispute.id);

      await supabase
        .from('orders')
        .update({
          status: 'delivered',
          fulfillment_status: 'delivered',
          delivered_at: now,
          updated_at: now,
        })
        .eq('id', order.id);

      const afterState = {
        dispute_status: 'resolved_release',
        order_status: 'delivered',
        payout: payoutResult,
      };

      // Append-only Audit Log
      await serviceClient.from('audit_logs').insert({
        actor_id: auth.user.id,
        action: 'dispute.resolve_release',
        target_type: 'dispute',
        target_id: dispute.id,
        before_state: beforeState,
        after_state: afterState,
        reason: reason.trim(),
      });

      // Notifications
      await supabase.from('notifications').insert([
        {
          user_id: order.seller_id,
          type: 'payout_released',
          title: 'Dispute Resolved: Funds Released',
          message: `The dispute for order "${order.item_title}" was resolved in your favor. Net payout of $${payoutResult.netPayoutAmount.toLocaleString()} has been released. Note: "${reason.trim()}"`,
          link_url: `/seller/payouts`,
        },
        {
          user_id: order.buyer_id,
          type: 'system',
          title: 'Dispute Resolution: Closed in Seller Favor',
          message: `The dispute for order "${order.item_title}" was reviewed and resolved. Funds released to seller. Moderator note: "${reason.trim()}"`,
          link_url: `/orders/${order.id}`,
        },
      ]);

      return NextResponse.json({
        success: true,
        action: 'resolved_release',
        disputeId: dispute.id,
        payout: payoutResult,
      });
    }

    // ============================================================
    // ACTION: DISMISS DISPUTE
    // ============================================================
    if (action === 'dismiss') {
      await supabase
        .from('disputes')
        .update({
          status: 'dismissed',
          resolution_notes: reason.trim(),
          resolved_by: auth.user.id,
          resolved_at: now,
          updated_at: now,
        })
        .eq('id', dispute.id);

      const afterState = { dispute_status: 'dismissed' };

      // Append-only Audit Log
      await serviceClient.from('audit_logs').insert({
        actor_id: auth.user.id,
        action: 'dispute.dismiss',
        target_type: 'dispute',
        target_id: dispute.id,
        before_state: beforeState,
        after_state: afterState,
        reason: reason.trim(),
      });

      // Notification
      await supabase.from('notifications').insert({
        user_id: dispute.raised_by,
        type: 'system',
        title: 'Dispute Dismissed by Moderation',
        message: `Your dispute for order "${order.item_title}" was dismissed. Moderator note: "${reason.trim()}"`,
        link_url: `/orders/${order.id}`,
      });

      return NextResponse.json({
        success: true,
        action: 'dismissed',
        disputeId: dispute.id,
      });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to resolve dispute' }, { status: 500 });
  }
}
