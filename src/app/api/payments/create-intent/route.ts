import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { paymentService } from '@/lib/payments';

/**
 * POST /api/payments/create-intent
 *
 * Secure server-side payment intent generation.
 * Validates buyer authorization, order eligibility, and executes intent creation
 * via PaymentService (Stripe or Test Mode).
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

    const body = await request.json();
    const { orderId, provider } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    // 1. Fetch order details from database
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, seller:profiles!orders_seller_id_fkey(*)')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // 2. Validate ownership (only buyer can pay for their order)
    if (order.buyer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden: You are not the buyer of this order' }, { status: 403 });
    }

    // 3. Validate status
    if (order.status !== 'awaiting_payment' && order.status !== 'pending') {
      return NextResponse.json(
        { error: `Order is not awaiting payment (current status: ${order.status})` },
        { status: 400 }
      );
    }

    const amount = Number(order.total_amount || order.amount);
    if (amount <= 0) {
      return NextResponse.json({ error: 'Invalid order amount' }, { status: 400 });
    }

    // 4. Create Payment Intent via PaymentService
    const idempotencyKey = `intent_${order.id}_${user.id}_${Math.floor(Date.now() / 60000)}`;
    const paymentResult = await paymentService.processOrderPayment(
      {
        orderId: order.id,
        amount,
        currency: 'USD',
        buyerId: user.id,
        sellerId: order.seller_id,
        idempotencyKey,
        metadata: {
          orderId: order.id,
          buyerId: user.id,
          sellerId: order.seller_id,
          itemTitle: order.item_title,
        },
      },
      provider
    );

    if (!paymentResult.success) {
      return NextResponse.json(
        { error: paymentResult.error || 'Payment intent creation failed' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      transactionReference: paymentResult.transactionReference,
      amount: paymentResult.amount,
      currency: paymentResult.currency,
      provider: paymentResult.provider,
      status: paymentResult.status,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
