import { createClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase Service Role client.
 * Strictly used in server route handlers for operations requiring service role privileges
 * (e.g. inserting into append-only audit_logs, seller_transfers, and seller_verification_history).
 */
export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase service role environment variables');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
