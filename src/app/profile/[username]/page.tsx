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
  Star,
  CheckCircle2,
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

  // Public profiles query enabled by RLS
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', cleanUsername)
    .maybeSingle();

  if (!profile || error) {
    notFound();
  }

  const userProfile = profile as UserProfile;

  // Fetch verified reviews for this seller
  const { data: reviewsData } = await supabase
    .from('reviews')
    .select(`
      id,
      rating,
      comment,
      created_at,
      buyer:profiles!reviews_buyer_id_fkey(username, avatar_url)
    `)
    .eq('seller_id', userProfile.id)
    .order('created_at', { ascending: false });

  const reviews = (reviewsData as any[]) || [];
  const totalReviews = reviews.length;
  const avgRating =
    totalReviews > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
      : null;

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

            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-white">
                  {userProfile.full_name || `@${userProfile.username}`}
                </h1>
                {userProfile.seller_verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-biddrBlue/20 text-biddrBlue border border-biddrBlue/40 px-2.5 py-0.5 text-xs font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified Seller
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

              {avgRating && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-1 text-lime font-bold text-xs bg-lime/10 px-2.5 py-0.5 rounded-full border border-lime/30">
                    <Star className="w-3.5 h-3.5 fill-lime" />
                    <span>{avgRating} Rating</span>
                  </div>
                  <span className="text-xs text-secondaryText">({totalReviews} verified purchases)</span>
                </div>
              )}

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

        {/* Verified Reviews Section */}
        {userProfile.is_seller && (
          <div className="mt-8 rounded-3xl border border-surface-border bg-surface p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-surface-border">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-lime fill-lime" />
                <h3 className="text-base font-bold text-white">Verified Customer Reviews</h3>
              </div>
              <span className="text-xs text-secondaryText font-mono">
                {totalReviews} recorded
              </span>
            </div>

            {reviews.length === 0 ? (
              <div className="py-8 text-center text-xs text-secondaryText">
                No customer reviews yet. Reviews unlock automatically when buyers confirm order delivery.
              </div>
            ) : (
              <div className="divide-y divide-surface-border mt-4">
                {reviews.map((rev: any) => (
                  <div key={rev.id} className="py-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center text-lime">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < rev.rating ? 'fill-lime text-lime' : 'text-surface-border'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-bold text-white">
                          @{rev.buyer?.username || 'buyer'}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] text-lime font-bold bg-lime/10 px-1.5 py-0.2 rounded">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Verified Purchase
                        </span>
                      </div>
                      <span className="text-[11px] text-secondaryText">
                        {new Date(rev.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {rev.comment && (
                      <p className="text-xs text-secondaryText leading-relaxed pl-1">
                        &quot;{rev.comment}&quot;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Drops Activity */}
        <div className="mt-8 rounded-3xl border border-surface-border bg-surface p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-hover border border-surface-border text-secondaryText mb-3">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">Drops & Upcoming Shows</h3>
          <p className="mt-1 text-xs text-secondaryText max-w-sm mx-auto">
            Check back soon for new drops and catalogue shows from @{userProfile.username}.
          </p>
        </div>
      </div>
    </div>
  );
}
