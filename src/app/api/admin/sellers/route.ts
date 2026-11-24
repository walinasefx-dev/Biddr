import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/admin';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/sellers
 *
 * Lists all sellers pending verification queue.
 * Strictly restricted to admins.
 */
export async function GET() {
  const auth = await verifyAdminAuth();
  if (!auth.authorized) {
    return auth.errorResponse!;
  }

  const supabase = await createClient();

  try {
    const { data: sellers, error } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, bio, location, is_seller, seller_verified, created_at')
      .eq('is_seller', true)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      sellers: sellers || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/sellers
 *
 * Approves or Rejects seller verification.
 * Requires confirmation reason, updates verification history, and writes audit log.
 */
export async function POST(request: Request) {
  const auth = await verifyAdminAuth();
  if (!auth.authorized) {
    return auth.errorResponse!;
  }

  try {
    const body = await request.json();
    const { sellerId, action, reason } = body;

    if (!sellerId || !action || !reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'Missing required parameters: sellerId, action, and mandatory reason.' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Supported: approve, reject' }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Fetch Seller Profile
    const { data: seller, error: sellerErr } = await supabase
      .from('profiles')
      .select('id, username, is_seller, seller_verified')
      .eq('id', sellerId)
      .maybeSingle();

    if (sellerErr || !seller) {
      return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 });
    }

    const beforeState = { seller_verified: seller.seller_verified };
    const isApproved = action === 'approve';
    const now = new Date().toISOString();

    // 2. Update Profile
    await supabase
      .from('profiles')
      .update({
        seller_verified: isApproved,
        updated_at: now,
      })
      .eq('id', sellerId);

    const afterState = { seller_verified: isApproved };

    // 3. Record in Seller Verification History
    await supabase.from('seller_verification_history').insert({
      seller_id: sellerId,
      reviewed_by: auth.user.id,
      status: isApproved ? 'approved' : 'rejected',
      reason: reason.trim(),
    });

    // 4. Append-Only Audit Log
    await supabase.from('audit_logs').insert({
      actor_id: auth.user.id,
      action: isApproved ? 'seller.verify_approve' : 'seller.verify_reject',
      target_type: 'profile',
      target_id: sellerId,
      before_state: beforeState,
      after_state: afterState,
      reason: reason.trim(),
    });

    // 5. Notify Seller
    await supabase.from('notifications').insert({
      user_id: sellerId,
      type: 'system',
      title: isApproved ? 'Seller Verification Approved!' : 'Seller Verification Update',
      message: isApproved
        ? `Congratulations! Your seller verification has been approved. The verified badge is now active on your profile. Moderator note: "${reason.trim()}"`
        : `Your seller verification was not approved at this time. Moderator note: "${reason.trim()}"`,
      link_url: `/profile/${seller.username}`,
    });

    return NextResponse.json({
      success: true,
      sellerId,
      action: isApproved ? 'approved' : 'rejected',
      sellerVerified: isApproved,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update seller verification' }, { status: 500 });
  }
}
