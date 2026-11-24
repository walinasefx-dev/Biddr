import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { liveKitService } from '@/lib/streaming/livekit';

/**
 * POST /api/live/token
 *
 * Mints an authenticated LiveKit WebRTC Access Token for an auction session.
 * Enforces role-based permissions:
 * - Session Seller (Host): Granted publisher privileges (canPublish: true, canSubscribe: true)
 * - Viewers/Bidders: Granted subscriber privileges (canPublish: false, canSubscribe: true)
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const roomName = `biddr-session-${sessionId}`;
    const participantIdentity = user?.id || `viewer_${Math.random().toString(36).substring(2, 9)}`;
    let participantName = user?.email?.split('@')[0] || 'Collector';
    let isHost = false;

    // Check database if valid UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId);
    if (isUUID) {
      const { data: session } = await supabase
        .from('auction_sessions')
        .select('seller_id')
        .eq('id', sessionId)
        .maybeSingle();

      if (session && user) {
        if (session.seller_id === user.id) {
          isHost = true;
          participantName = `Host (${participantName})`;
        }
      }
    }

    // Generate token with role separation
    const result = liveKitService.generateAccessToken({
      roomName,
      participantIdentity,
      participantName,
      canPublish: isHost,
      canSubscribe: true,
      ttlSeconds: 6 * 3600,
    });

    return NextResponse.json({
      success: true,
      token: result.token,
      role: isHost ? 'host' : 'viewer',
      roomName: result.roomName,
      serverUrl: result.serverUrl,
      isConfigured: !result.isSimulated,
      participantIdentity: result.participantIdentity,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error minting live token' }, { status: 500 });
  }
}
