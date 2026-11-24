import { createClient } from '@/lib/supabase/client';
import type { ToggleFollowResult } from '@/features';

/**
 * FollowService
 *
 * Client-side follow/unfollow manager calling atomic database RPC `toggle_follow`.
 */
export async function toggleFollowSeller(sellerId: string): Promise<ToggleFollowResult> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('toggle_follow', {
    p_seller_id: sellerId,
  });

  if (error) {
    throw error;
  }

  return {
    following: Boolean(data?.following),
    followerCount: Number(data?.follower_count || 0),
  };
}

export async function checkIsFollowing(sellerId: string, currentUserId: string): Promise<boolean> {
  if (!currentUserId || sellerId === currentUserId) return false;
  const supabase = createClient();

  const { data } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', currentUserId)
    .eq('seller_id', sellerId)
    .maybeSingle();

  return Boolean(data);
}
