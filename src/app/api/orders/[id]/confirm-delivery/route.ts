import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripeConnectService } from '@/lib/payments/connect';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/orders/[id]/confirm-delivery
 *
 * Confirms order delivery by buyer and triggers automated seller payout release.
 * Deducts Biddr 5% marketplace commission and transfers net funds to seller.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch Order with Seller Profile
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, seller:profiles!orders_seller_id_fkey(*)')
      .eq('id', id)
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // 2. Authorize Buyer
    if (order.buyer_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: Only the buyer can confirm order delivery' },
        { status: 403 }
      );
    }

    // 3. Validate Status
    if (order.status === 'delivered' || order.status === 'completed') {
      return NextResponse.json(
        { error: 'Order delivery has already been confirmed' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const grossAmount = Number(order.total_amount || 0);

    // 4. Execute Seller Payout via Stripe Connect
    const destinationAccount = (order.seller as any)?.stripe_connect_account_id || null;
    const payoutResult = await stripeConnectService.executeSellerPayout({
      orderId: order.id,
      grossAmount,
      destinationAccountId: destinationAccount,
    });

    // 5. Update Order Record in Database
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'delivered',
        fulfillment_status: 'delivered',
        delivered_at: now,
        updated_at: now,
      })
      .eq('id', order.id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 });
    }

    // 6. Dispatch Notifications to Buyer and Seller
    await supabase.from('notifications').insert([
      {
        user_id: user.id,
        type: 'order_delivered',
        title: 'Delivery Confirmed — Order Completed',
        message: `You confirmed delivery for "${order.item_title || 'Item'}". Please take a moment to leave a review!`,
        link_url: `/orders/${order.id}`,
      },
      {
        user_id: order.seller_id,
        type: 'payout_released',
        title: 'Funds Released — Delivery Confirmed',
        message: `Buyer confirmed delivery of "${order.item_title || 'Item'}". Net payout of $${payoutResult.netPayoutAmount.toLocaleString()} has been released.`,
        link_url: `/seller/orders/${order.id}`,
      },
    ]);

    return NextResponse.json({
      success: true,
      orderId: order.id,
      status: 'delivered',
      deliveredAt: now,
      payout: payoutResult,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error processing delivery confirmation' },
      { status: 500 }
    );
  }
}
