import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/admin';
import { createClient } from '@/lib/supabase/server';
import { liveKitService } from '@/lib/streaming/livekit';

/**
 * GET /api/admin/streams
 *
 * Lists all active or paused live auction broadcasts.
 * Strictly restricted to admins.
 */
export async function GET() {
  const auth = await verifyAdminAuth();
  if (!auth.authorized) {
    return auth.errorResponse!;
  }

  const supabase = await createClient();

  try {
    const { data: sessions, error } = await supabase
      .from('auction_sessions')
      .select(`
        *,
        seller:profiles!auction_sessions_seller_id_fkey(username, avatar_url, seller_verified)
      `)
      .in('status', ['live', 'paused', 'scheduled'])
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      streams: sessions || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/streams
 *
 * Moderates a live broadcast (Pause or Force-Terminate).
 * Requires confirmation reason and records an append-only audit log row.
 */
export async function POST(request: Request) {
  const auth = await verifyAdminAuth();
  if (!auth.authorized) {
    return auth.errorResponse!;
  }

  try {
    const body = await request.json();
    const { sessionId, action, reason } = body;

    if (!sessionId || !action || !reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'Missing required parameters: sessionId, action, and mandatory reason.' },
        { status: 400 }
      );
    }

    if (!['pause', 'terminate'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Supported: pause, terminate' }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Fetch Session
    const { data: session, error: sessionErr } = await supabase
      .from('auction_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (sessionErr || !session) {
      return NextResponse.json({ error: 'Live auction session not found' }, { status: 404 });
    }

    const beforeState = { status: session.status, ended_at: session.ended_at };
    const now = new Date().toISOString();

    if (action === 'terminate') {
      // 2. Terminate LiveKit Cloud Room Server-Side
      await liveKitService.terminateRoom(sessionId);

      // 3. Mark Session Ended
      await supabase
        .from('auction_sessions')
        .update({
          status: 'ended',
          ended_at: now,
          updated_at: now,
        })
        .eq('id', sessionId);

      // 4. Mark active lot as unsold
      await supabase
        .from('auction_lots')
        .update({ status: 'unsold', updated_at: now })
        .eq('session_id', sessionId)
        .eq('status', 'active');

      const afterState = { status: 'ended', ended_at: now };

      // 5. Append-only Audit Log
      await supabase.from('audit_logs').insert({
        actor_id: auth.user.id,
        action: 'stream.terminate',
        target_type: 'auction_session',
        target_id: sessionId,
        before_state: beforeState,
        after_state: afterState,
        reason: reason.trim(),
      });

      // 6. Notify Host
      await supabase.from('notifications').insert({
        user_id: session.seller_id,
        type: 'system',
        title: 'Broadcast Terminated by Trust & Safety',
        message: `Your live auction session was terminated by platform moderation. Reason: "${reason.trim()}"`,
        link_url: `/seller/sessions`,
      });

      return NextResponse.json({
        success: true,
        action: 'terminated',
        sessionId,
        endedAt: now,
      });
    }

    if (action === 'pause') {
      // Pause Session
      await supabase
        .from('auction_sessions')
        .update({
          status: 'paused',
          updated_at: now,
        })
        .eq('id', sessionId);

      const afterState = { status: 'paused', updated_at: now };

      // Audit Log
      await supabase.from('audit_logs').insert({
        actor_id: auth.user.id,
        action: 'stream.pause',
        target_type: 'auction_session',
        target_id: sessionId,
        before_state: beforeState,
        after_state: afterState,
        reason: reason.trim(),
      });

      // Notify Host
      await supabase.from('notifications').insert({
        user_id: session.seller_id,
        type: 'system',
        title: 'Broadcast Paused by Trust & Safety',
        message: `Your live auction session has been temporarily paused. Reason: "${reason.trim()}"`,
        link_url: `/seller/live/${sessionId}`,
      });

      return NextResponse.json({
        success: true,
        action: 'paused',
        sessionId,
      });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to moderate stream' }, { status: 500 });
  }
}
