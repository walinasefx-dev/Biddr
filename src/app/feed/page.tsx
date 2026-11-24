'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar, Footer, PostCard } from '@/components';
import { createClient } from '@/lib/supabase/client';
import type { PostRecord, PostType } from '@/types';
import {
  Sparkles,
  Flame,
  Plus,
  ShoppingBag,
  Video,
  Users,
  Compass,
} from 'lucide-react';

export default function SocialFeedPage() {
  const router = useRouter();
  const supabase = createClient();

  const [posts, setPosts] = useState<PostRecord[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'for_you' | 'following'>('for_you');
  const [typeFilter, setTypeFilter] = useState<PostType | 'all'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFeed() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);

      let query = supabase
        .from('posts')
        .select(`
          *,
          author:profiles!posts_author_id_fkey(username, avatar_url, full_name, seller_verified),
          drop:drops(id, title, image_url, current_bid, is_fixed_price, fixed_price),
          session:auction_sessions(id, title, status, total_lots)
        `)
        .order('created_at', { ascending: false });

      if (typeFilter !== 'all') {
        query = query.eq('post_type', typeFilter);
      }

      // If "following" tab is selected, filter by followed seller IDs
      if (activeTab === 'following' && user) {
        const { data: followRecords } = await supabase
          .from('follows')
          .select('seller_id')
          .eq('follower_id', user.id);

        const sellerIds = followRecords?.map((f) => f.seller_id) || [];
        if (sellerIds.length > 0) {
          query = query.in('author_id', sellerIds);
        } else {
          setPosts([]);
          setLoading(false);
          return;
        }
      }

      const { data } = await query;
      if (data) {
        setPosts(data as any);
      }
      setLoading(false);
    }

    loadFeed();
  }, [activeTab, typeFilter, supabase]);

  return (
    <div className="min-h-screen bg-background text-primaryText flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10 w-full">
        {/* Feed Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-surface-border">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-lime uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Social Marketplace Stream</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Community & Live Drops Feed
            </h1>
            <p className="text-xs sm:text-sm text-secondaryText mt-0.5">
              Discover product demos, upcoming live auctions, and updates from your favorite sellers.
            </p>
          </div>

          <Link
            href="/post/new"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-lime hover:bg-lime-hover px-5 py-2.5 text-xs font-black text-black shadow-glow transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create Post</span>
          </Link>
        </div>

        {/* Feed Mode Switcher (For You vs Following) */}
        <div className="flex items-center gap-6 mt-6 pb-2 border-b border-surface-border/60">
          <button
            onClick={() => setActiveTab('for_you')}
            className={`pb-2 text-sm font-bold transition-all relative ${
              activeTab === 'for_you' ? 'text-white' : 'text-secondaryText hover:text-white'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-lime" />
              <span>For You</span>
            </span>
            {activeTab === 'for_you' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-lime rounded-full" />
            )}
          </button>

          <button
            onClick={() => {
              if (!currentUser) {
                router.push('/login?redirect=/feed');
                return;
              }
              setActiveTab('following');
            }}
            className={`pb-2 text-sm font-bold transition-all relative ${
              activeTab === 'following' ? 'text-white' : 'text-secondaryText hover:text-white'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-lime" />
              <span>Following</span>
            </span>
            {activeTab === 'following' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-lime rounded-full" />
            )}
          </button>
        </div>

        {/* Post Type Filter Pills */}
        <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2">
          {[
            { id: 'all', label: 'All Content' },
            { id: 'product_showcase', label: 'Product Showcases', icon: ShoppingBag },
            { id: 'auction_teaser', label: 'Auction Teasers', icon: Flame },
            { id: 'live_announcement', label: 'Live Shows', icon: Video },
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setTypeFilter(type.id as any)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                typeFilter === type.id
                  ? 'bg-lime text-black shadow-glow-sm'
                  : 'bg-surface border border-surface-border text-secondaryText hover:text-white'
              }`}
            >
              {type.icon && <type.icon className="w-3.5 h-3.5" />}
              <span>{type.label}</span>
            </button>
          ))}
        </div>

        {/* Posts Stream */}
        <div className="mt-6 space-y-6">
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
              <span className="h-3 w-3 rounded-full bg-lime animate-ping" />
              <span className="text-sm font-bold text-secondaryText">Curating social feed...</span>
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-3xl border border-surface-border bg-surface p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-hover text-secondaryText border border-surface-border mb-4">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">No posts found</h3>
              <p className="text-xs text-secondaryText mt-1 max-w-sm mx-auto">
                {activeTab === 'following'
                  ? 'Follow sellers and creators to see their product demonstrations and auction announcements here.'
                  : 'Be the first to share a product demonstration or auction teaser!'}
              </p>
              <div className="mt-6">
                <Link
                  href="/post/new"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-lime px-6 py-2.5 text-xs font-black text-black hover:bg-lime-hover shadow-glow"
                >
                  Create Your First Post
                </Link>
              </div>
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={currentUser?.id}
              />
            ))
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
