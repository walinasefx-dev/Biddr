import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/admin';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/analytics
 *
 * Executes server-side SQL RPC get_marketplace_analytics()
 * Strictly restricted to users with role === 'admin'.
 */
export async function GET() {
  const auth = await verifyAdminAuth();
  if (!auth.authorized) {
    return auth.errorResponse!;
  }

  const supabase = await createClient();

  try {
    const { data, error } = await supabase.rpc('get_marketplace_analytics');

    if (error) {
      // Fallback manual query if RPC is not yet registered in remote Postgres
      const { data: orders } = await supabase.from('orders').select('status, total_amount');
      const { data: drops } = await supabase.from('drops').select('id, seller_id, status');
      const { data: sessions } = await supabase.from('auction_sessions').select('id, status');
      const { data: disputes } = await supabase.from('disputes').select('id, status');
      const { data: bids } = await supabase.from('bids').select('id, created_at');
      const { data: transfers } = await supabase.from('seller_transfers').select('commission_amount');

      const safeOrders = orders || [];
      const totalGmv = safeOrders
        .filter((o) => ['paid', 'dispatched', 'delivered', 'completed'].includes(o.status))
        .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

      const ordersByStatus: Record<string, number> = {};
      for (const o of safeOrders) {
        ordersByStatus[o.status] = (ordersByStatus[o.status] || 0) + 1;
      }

      const activeSellers = new Set((drops || []).map((d) => d.seller_id)).size;
      const activeStreams = (sessions || []).filter((s) => s.status === 'live').length;
      const openDisputes = (disputes || []).filter((d) => ['open', 'under_review'].includes(d.status)).length;
      const dailyBids = (bids || []).length;
      const platformFees = (transfers || []).reduce((sum, t) => sum + Number(t.commission_amount || 0), 0);

      return NextResponse.json({
        success: true,
        analytics: {
          total_gmv: totalGmv,
          total_orders: safeOrders.length,
          orders_by_status: ordersByStatus,
          active_sellers: activeSellers,
          active_streams: activeStreams,
          open_disputes: openDisputes,
          daily_bid_volume: dailyBids,
          platform_fee_earnings: platformFees,
        },
      });
    }

    return NextResponse.json({
      success: true,
      analytics: data,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to retrieve marketplace analytics' },
      { status: 500 }
    );
  }
}
