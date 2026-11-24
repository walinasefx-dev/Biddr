import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/cron/advance-lots
 *
 * Server-authoritative automated catalogue progression worker.
 * Can be triggered on a recurring schedule (e.g. via Vercel Cron, Supabase pg_cron, or external ping).
 * Inspects all active live auction sessions with expired lots and advances them automatically.
 * Guarantees that Mode 1 & 2 catalogues never stall even if the seller's browser disconnects.
 */
export async function GET(request: Request) {
  try {
    // 0. Verify CRON_SECRET if configured in production
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized: Invalid cron secret' }, { status: 401 });
      }
    }

    const supabase = await createClient();
    const now = new Date().toISOString();

    // 1. Locate live auction lots whose countdown expired
    const { data: expiredLots, error } = await supabase
      .from('auction_lots')
      .select('session_id, id, lot_number, ends_at')
      .eq('status', 'active')
      .lte('ends_at', now);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!expiredLots || expiredLots.length === 0) {
      return NextResponse.json({ message: 'No expired lots found', advanced: 0 });
    }

    // 2. Advance each expired session atomically
    const results = [];
    const processedSessions = new Set<string>();

    for (const lot of expiredLots) {
      if (!processedSessions.has(lot.session_id)) {
        processedSessions.add(lot.session_id);

        const { data: advanceResult, error: advanceError } = await supabase.rpc(
          'advance_catalogue_lot',
          { p_session_id: lot.session_id }
        );

        results.push({
          sessionId: lot.session_id,
          lotId: lot.id,
          lotNumber: lot.lot_number,
          result: advanceResult || advanceError?.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now,
      advanced: results.length,
      details: results,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
