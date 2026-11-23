import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { UserProfile } from '@/types';
import {
  MapPin,
  Calendar,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface PublicProfileProps {
  params: Promise<{
    username: string;
  }>;
}

export default async function PublicProfilePage({ params }: PublicProfileProps) {
  const { username } = await params;
  const cleanUsername = username.toLowerCase().replace('@', '');

  const supabase = await createClient();

  // Public profiles query enabled by RLS: "Public profiles are viewable by everyone"
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', cleanUsername)
    .maybeSingle();

  if (!profile || error) {
    notFound();
  }

  const userProfile = profile as UserProfile;

  const joinDate = new Date(userProfile.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-background text-primaryText">
      {/* Top Banner */}
      <div className="h-48 sm:h-64 w-full bg-gradient-to-r from-surface via-surface-border to-surface relative border-b border-surface-border overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 h-full flex items-start justify-between pt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-black/60 border border-white/10 px-4 py-2 text-xs font-bold text-white hover:border-lime/40 backdrop-blur-md transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </Link>
        </div>
      </div>

      {/* Profile Card */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 -mt-20 pb-20 relative">
        <div className="rounded-3xl border border-surface-border bg-surface p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-6 border-b border-surface-border">
            <div className="relative h-28 w-28 rounded-2xl overflow-hidden border-2 border-lime shadow-glow bg-surface-border flex-shrink-0">
              <Image
                src={
                  userProfile.avatar_url ||
                  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
                }
                alt={userProfile.username}
                fill
                className="object-cover"
              />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-white">
                  {userProfile.full_name || `@${userProfile.username}`}
                </h1>
                {userProfile.seller_verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-biddrBlue/20 text-biddrBlue border border-biddrBlue/40 px-2.5 py-0.5 text-xs font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified
                  </span>
                )}
                {userProfile.is_seller && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-lime/20 text-lime border border-lime/40 px-2.5 py-0.5 text-xs font-bold">
                    <Sparkles className="w-3.5 h-3.5" />
                    Seller
                  </span>
                )}
              </div>

              <div className="text-sm font-semibold text-lime mt-0.5">
                @{userProfile.username}
              </div>

              <div className="flex items-center gap-4 mt-3 text-xs text-secondaryText flex-wrap">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-secondaryText" />
                  <span>Member since {joinDate}</span>
                </div>
                {userProfile.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-secondaryText" />
                    <span>{userProfile.location}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {userProfile.bio && (
            <div className="mt-5 text-sm text-secondaryText leading-relaxed">
              {userProfile.bio}
            </div>
          )}
        </div>

        {/* Drops / Activity Feed */}
        <div className="mt-8 rounded-3xl border border-surface-border bg-surface p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-hover border border-surface-border text-secondaryText mb-3">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">No active drops right now</h3>
          <p className="mt-1 text-xs text-secondaryText max-w-sm mx-auto">
            Check back soon for new drops from @{userProfile.username}.
          </p>
        </div>
      </div>
    </div>
  );
}
