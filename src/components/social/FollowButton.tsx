'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toggleFollowSeller, checkIsFollowing } from '@/lib/social/follow-service';
import { UserPlus, UserCheck } from 'lucide-react';

interface FollowButtonProps {
  sellerId: string;
  initialFollowing?: boolean;
  onCountChange?: (newCount: number) => void;
  size?: 'sm' | 'md';
}

export function FollowButton({
  sellerId,
  initialFollowing = false,
  onCountChange,
  size = 'md',
}: FollowButtonProps) {
  const router = useRouter();
  const supabase = createClient();

  const [following, setFollowing] = useState(initialFollowing);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setCurrentUserId(user.id);
        if (initialFollowing === undefined) {
          const isF = await checkIsFollowing(sellerId, user.id);
          setFollowing(isF);
        }
      }
    }

    checkAuth();
  }, [sellerId, initialFollowing, supabase]);

  // Don't render follow button if viewing own profile
  if (currentUserId && currentUserId === sellerId) {
    return null;
  }

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUserId) {
      router.push(`/login?redirect=/profile`);
      return;
    }

    // Optimistic toggle
    const nextFollowing = !following;
    setFollowing(nextFollowing);
    setLoading(true);

    try {
      const result = await toggleFollowSeller(sellerId);
      setFollowing(result.following);
      if (onCountChange) {
        onCountChange(result.followerCount);
      }
    } catch {
      // Revert on error
      setFollowing(!nextFollowing);
    } finally {
      setLoading(false);
    }
  };

  const isSmall = size === 'sm';

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full font-bold transition-all ${
        isSmall ? 'px-3 py-1.5 text-[11px]' : 'px-5 py-2 text-xs'
      } ${
        following
          ? 'bg-surface border border-surface-border text-secondaryText hover:text-coral hover:border-coral/40'
          : 'bg-lime text-black hover:bg-lime-hover shadow-glow'
      }`}
    >
      {following ? (
        <>
          <UserCheck className={isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          <span>Following</span>
        </>
      ) : (
        <>
          <UserPlus className={isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          <span>Follow Seller</span>
        </>
      )}
    </button>
  );
}
