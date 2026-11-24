import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { FollowButton } from '@/components/social/FollowButton';
import type { UserProfile, AuctionDropRecord, AuctionSessionRecord, PostRecord } from '@/types';
import {
  MapPin,
  Calendar,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
  Clock,
  Star,
  CheckCircle2,
  Package,
  Video,
  Flame,
  Users,
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

  // 1. Fetch Profile
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', cleanUsername)
    .maybeSingle();

  if (!profile || error) {
    notFound();
  }

  const userProfile = profile as UserProfile;

  // 2. Fetch Seller's Active Drops (Auctions & Fixed Price)
  const { data: sellerDropsData } = await supabase
    .from('drops')
    .select('*')
    .eq('seller_id', userProfile.id)
    .in('status', ['live', 'scheduled'])
    .order('created_at', { ascending: false });

  const drops = (sellerDropsData as AuctionDropRecord[]) || [];

  // 3. Fetch Seller's Live Shows / Catalogues
  const { data: sessionsData } = await supabase
    .from('auction_sessions')
    .select('*')
    .eq('seller_id', userProfile.id)
    .in('status', ['live', 'scheduled'])
    .order('created_at', { ascending: false });

  const sessions = (sessionsData as AuctionSessionRecord[]) || [];

  // 4. Fetch Seller's Posts
  const { data: postsData } = await supabase
    .from('posts')
    .select(`
      *,
      drop:drops(title, image_url, current_bid, is_fixed_price, fixed_price)
    `)
    .eq('author_id', userProfile.id)
    .order('created_at', { ascending: false });

  const posts = (postsData as any[]) || [];

  // 5. Fetch Verified Reviews
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

      {/* Profile Card & Storefront Header */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 -mt-20 pb-20 relative">
        <div className="rounded-3xl border border-surface-border bg-surface p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 pb-6 border-b border-surface-border">
            <div className="flex items-center gap-5">
              <div className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-2xl overflow-hidden border-2 border-lime shadow-glow bg-surface-border flex-shrink-0">
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

            {/* Social Follower Stats & Action */}
            <div className="flex flex-col sm:items-end gap-3 w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-t-0 border-surface-border">
              <div className="flex items-center gap-6 text-xs">
                <div>
                  <span className="font-black text-base text-white block">
                    {userProfile.follower_count || 0}
                  </span>
                  <span className="text-secondaryText text-[11px]">Followers</span>
                </div>
                <div>
                  <span className="font-black text-base text-white block">
                    {userProfile.following_count || 0}
                  </span>
                  <span className="text-secondaryText text-[11px]">Following</span>
                </div>
                <div>
                  <span className="font-black text-base text-white block">
                    {drops.length}
                  </span>
                  <span className="text-secondaryText text-[11px]">Active Drops</span>
                </div>
              </div>

              <FollowButton sellerId={userProfile.id} />
            </div>
          </div>

          {userProfile.bio && (
            <div className="mt-5 text-sm text-secondaryText leading-relaxed">
              {userProfile.bio}
            </div>
          )}
        </div>

        {/* Live Shows & Catalogue Announcements */}
        {sessions.length > 0 && (
          <div className="mt-8 rounded-3xl border border-coral/30 bg-coral/5 p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-coral/20">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-coral" />
                <h3 className="text-base font-bold text-white">Live & Scheduled Shows</h3>
              </div>
              <span className="text-xs text-coral font-bold uppercase tracking-wider">
                {sessions.length} Available
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {sessions.map((sess) => (
                <div
                  key={sess.id}
                  className="rounded-2xl border border-surface-border bg-surface p-4 flex items-center justify-between gap-4"
                >
                  <div>
                    <span className="text-[10px] font-black uppercase text-coral bg-coral/10 border border-coral/30 px-2 py-0.5 rounded-full">
                      {sess.status === 'live' ? 'LIVE NOW' : 'SCHEDULED SHOW'}
                    </span>
                    <h4 className="text-sm font-bold text-white mt-1.5">{sess.title}</h4>
                    <p className="text-xs text-secondaryText mt-0.5">{sess.total_lots} Catalogue Items</p>
                  </div>

                  <Link
                    href={`/live/${sess.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-coral hover:bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-coral-glow flex-shrink-0"
                  >
                    <span>Watch</span>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Storefront Active Drops (Auctions & Buy Now Listings) */}
        <div className="mt-8 rounded-3xl border border-surface-border bg-surface p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center justify-between pb-4 border-b border-surface-border">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-lime" />
              <h3 className="text-base font-bold text-white">Storefront Drops & Listings</h3>
            </div>
            <span className="text-xs text-secondaryText font-mono">{drops.length} listed</span>
          </div>

          {drops.length === 0 ? (
            <div className="py-8 text-center text-xs text-secondaryText">
              No active listings available right now.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {drops.map((drop) => (
                <Link
                  key={drop.id}
                  href={`/auction/${drop.id}`}
                  className="rounded-2xl border border-surface-border bg-background overflow-hidden group hover:border-lime/50 transition-all"
                >
                  <div className="relative aspect-video w-full bg-surface-border">
                    <Image src={drop.image_url} alt={drop.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                    {drop.is_fixed_price && (
                      <span className="absolute top-2 left-2 text-[10px] font-black text-black bg-lime px-2 py-0.5 rounded-md shadow-glow-sm">
                        FIXED PRICE
                      </span>
                    )}
                  </div>
                  <div className="p-3.5">
                    <h4 className="text-xs font-bold text-white line-clamp-1">{drop.title}</h4>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[11px] text-secondaryText">
                        {drop.is_fixed_price ? 'Buy Now' : 'Current Bid'}
                      </span>
                      <span className="text-sm font-black text-lime">
                        ${Number(drop.is_fixed_price ? drop.fixed_price : drop.current_bid).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Social Posts by Seller */}
        {posts.length > 0 && (
          <div className="mt-8 rounded-3xl border border-surface-border bg-surface p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-surface-border">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-lime" />
                <h3 className="text-base font-bold text-white">Product Demonstrations & Posts</h3>
              </div>
              <span className="text-xs text-secondaryText font-mono">{posts.length} posts</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-6">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="rounded-2xl border border-surface-border bg-background p-3 flex flex-col justify-between"
                >
                  <div>
                    {post.media_urls && post.media_urls[0] && (
                      <div className="relative aspect-video w-full rounded-xl overflow-hidden mb-2">
                        <Image src={post.media_urls[0]} alt="Post media" fill className="object-cover" />
                      </div>
                    )}
                    <p className="text-xs text-white line-clamp-2">{post.caption}</p>
                  </div>

                  {post.drop && (
                    <div className="mt-3 pt-2 border-t border-surface-border flex items-center justify-between text-[11px]">
                      <span className="text-secondaryText font-bold">Linked Listing:</span>
                      <span className="text-lime font-black">
                        ${Number(post.drop.is_fixed_price ? post.drop.fixed_price : post.drop.current_bid).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

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
      </div>
    </div>
  );
}
