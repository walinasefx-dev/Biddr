import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export interface AdminAuthResult {
  authorized: boolean;
  user?: any;
  profile?: any;
  errorResponse?: NextResponse;
}

/**
 * Server-side admin authorization verifier.
 * Strictly checks that:
 * 1. An authenticated session exists.
 * 2. The user's profile has role === 'admin'.
 * 
 * Returns 401 if unauthenticated, 403 if authenticated but not admin.
 */
export async function verifyAdminAuth(): Promise<AdminAuthResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      authorized: false,
      errorResponse: NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 }),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile || (profile as any).role !== 'admin') {
    return {
      authorized: false,
      user,
      errorResponse: NextResponse.json(
        { error: 'Forbidden: Platform administrator credentials required' },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    user,
    profile,
  };
}
