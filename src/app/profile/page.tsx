'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { UserProfile } from '@/types';
import {
  User,
  MapPin,
  Calendar,
  ShieldCheck,
  Sparkles,
  Edit3,
  LogOut,
  Flame,
  Clock,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'activity' | 'bids' | 'drops'>('activity');

  useEffect(() => {
    async function fetchUserProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login?redirect=/profile');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (data) {
        setProfile(data as UserProfile);
      } else {
        // If trigger hasn't fired or profile needs fallback creation
        const newProfile: UserProfile = {
          id: user.id,
          username: user.email?.split('@')[0] || `user_${user.id.substring(0, 6)}`,
          full_name: (user.user_metadata?.full_name as string) || null,
          avatar_url:
            (user.user_metadata?.avatar_url as string) ||
            'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
          bio: null,
          location: null,
          is_seller: false,
          seller_verified: false,
          created_at: user.created_at,
          updated_at: user.created_at,
        };
        setProfile(newProfile);
      }
      setLoading(false);
    }

    fetchUserProfile();
  }, [router, supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-primaryText flex items-center justify-center">
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-full bg-lime animate-ping" />
          <span className="text-sm font-bold text-secondaryText">Loading profile...</span>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const joinDate = new Date(profile.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-background text-primaryText">
      {/* Top Banner & Header */}
      <div className="h-48 sm:h-64 w-full bg-gradient-to-r from-surface via-surface-border to-surface relative border-b border-surface-border overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-32 bg-lime/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 h-full flex items-start justify-between pt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-black/60 border border-white/10 px-4 py-2 text-xs font-bold text-white hover:border-lime/40 backdrop-blur-md transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </Link>

          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 rounded-full bg-black/60 border border-white/10 px-4 py-2 text-xs font-bold text-coral hover:bg-coral/20 backdrop-blur-md transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Profile Info Section */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 -mt-20 pb-20 relative">
        <div className="rounded-3xl border border-surface-border bg-surface p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 pb-6 border-b border-surface-border">
            {/* Avatar & Identifiers */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="relative h-28 w-28 rounded-2xl overflow-hidden border-2 border-lime shadow-glow bg-surface-border flex-shrink-0">
                <Image
                  src={
                    profile.avatar_url ||
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
                  }
                  alt={profile.username}
                  fill
                  className="object-cover"
                />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-black text-white">
                    {profile.full_name || `@${profile.username}`}
                  </h1>
                  {profile.seller_verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-biddrBlue/20 text-biddrBlue border border-biddrBlue/40 px-2.5 py-0.5 text-xs font-bold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Verified
                    </span>
                  )}
                  {profile.is_seller && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-lime/20 text-lime border border-lime/40 px-2.5 py-0.5 text-xs font-bold">
                      <Sparkles className="w-3.5 h-3.5" />
                      Seller
                    </span>
                  )}
                </div>

                <div className="text-sm font-semibold text-lime mt-0.5">
                  @{profile.username}
                </div>

                <div className="flex items-center gap-4 mt-3 text-xs text-secondaryText flex-wrap">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-secondaryText" />
                    <span>Member since {joinDate}</span>
                  </div>
                  {profile.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-secondaryText" />
                      <span>{profile.location}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Edit Profile Action */}
            <Link
              href="/profile/edit"
              className="inline-flex items-center gap-2 rounded-full bg-surface-hover border border-surface-border px-5 py-2.5 text-xs font-bold text-white hover:border-lime hover:text-lime transition-all self-stretch sm:self-auto justify-center"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit Profile
            </Link>
          </div>

          {/* Bio */}
          {profile.bio ? (
            <div className="mt-5 text-sm text-secondaryText leading-relaxed">
              {profile.bio}
            </div>
          ) : (
            <div className="mt-5 text-xs text-secondaryText italic">
              No biography added yet.{' '}
              <Link href="/profile/edit" className="text-lime hover:underline font-semibold not-italic">
                Add a bio
              </Link>
            </div>
          )}

          {/* Account Badges and Capabilities */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-surface-border">
            <div className="rounded-2xl border border-surface-border bg-background p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-secondaryText">
                Buyer & Bidder Status
              </span>
              <div className="text-base font-extrabold text-white mt-1 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-lime" />
                Active • Ready to Bid
              </div>
              <p className="text-xs text-secondaryText mt-1">
                You can participate in any live auction drop.
              </p>
            </div>

            <div className="rounded-2xl border border-surface-border bg-background p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-secondaryText">
                Seller Privilege
              </span>
              <div className="text-base font-extrabold text-white mt-1">
                {profile.is_seller ? (
                  <span className="text-lime flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-lime" />
                    Authorized Seller
                  </span>
                ) : (
                  <span className="text-secondaryText flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-secondaryText/40" />
                    Buyer Only
                  </span>
                )}
              </div>
              <p className="text-xs text-secondaryText mt-1">
                {profile.is_seller
                  ? 'You have permission to schedule drops.'
                  : 'Hosting auctions requires seller verification.'}
              </p>
            </div>

            <div className="rounded-2xl border border-surface-border bg-background p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-secondaryText">
                Verification Tier
              </span>
              <div className="text-base font-extrabold text-white mt-1">
                {profile.seller_verified ? (
                  <span className="text-biddrBlue flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" />
                    Verified Collector
                  </span>
                ) : (
                  <span className="text-secondaryText">Standard Member</span>
                )}
              </div>
              <p className="text-xs text-secondaryText mt-1">
                Admin verification protects our escrow system.
              </p>
            </div>
          </div>
        </div>

        {/* Profile Tabs */}
        <div className="mt-10">
          <div className="flex items-center gap-2 border-b border-surface-border pb-4">
            <button
              onClick={() => setActiveTab('activity')}
              className={`rounded-full px-5 py-2 text-xs font-bold transition-all ${
                activeTab === 'activity'
                  ? 'bg-lime text-black shadow-glow-sm'
                  : 'text-secondaryText hover:text-white bg-surface'
              }`}
            >
              Recent Activity
            </button>
            <button
              onClick={() => setActiveTab('bids')}
              className={`rounded-full px-5 py-2 text-xs font-bold transition-all ${
                activeTab === 'bids'
                  ? 'bg-lime text-black shadow-glow-sm'
                  : 'text-secondaryText hover:text-white bg-surface'
              }`}
            >
              My Bids
            </button>
            <button
              onClick={() => setActiveTab('drops')}
              className={`rounded-full px-5 py-2 text-xs font-bold transition-all ${
                activeTab === 'drops'
                  ? 'bg-lime text-black shadow-glow-sm'
                  : 'text-secondaryText hover:text-white bg-surface'
              }`}
            >
              Hosted Drops
            </button>
          </div>

          <div className="mt-8 rounded-3xl border border-surface-border bg-surface p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-hover border border-surface-border text-secondaryText mb-3">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">No active bids yet</h3>
            <p className="mt-1 text-xs text-secondaryText max-w-sm mx-auto">
              Ready to win your first piece? Head over to the live drops section to explore current auctions.
            </p>
            <Link
              href="/#trending"
              className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-lime px-5 py-2.5 text-xs font-bold text-black hover:bg-lime-hover shadow-glow"
            >
              <span>Explore Live Drops</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
