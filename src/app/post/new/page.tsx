'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar, Footer } from '@/components';
import { createClient } from '@/lib/supabase/client';
import type { PostType, AuctionDropRecord, AuctionSessionRecord } from '@/types';
import {
  ArrowLeft,
  Sparkles,
  ShoppingBag,
  Flame,
  Video,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function CreatePostPage() {
  const router = useRouter();
  const supabase = createClient();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [caption, setCaption] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [postType, setPostType] = useState<PostType>('standard');
  const [selectedDropId, setSelectedDropId] = useState<string>('');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');

  const [availableDrops, setAvailableDrops] = useState<AuctionDropRecord[]>([]);
  const [availableSessions, setAvailableSessions] = useState<AuctionSessionRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login?redirect=/post/new');
        return;
      }
      setCurrentUser(user);

      // Load user's drops to optionally attach
      const { data: dropsData } = await supabase
        .from('drops')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (dropsData) {
        setAvailableDrops(dropsData as any);
      }

      // Load user's auction sessions
      const { data: sessionsData } = await supabase
        .from('auction_sessions')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (sessionsData) {
        setAvailableSessions(sessionsData as any);
      }

      setLoading(false);
    }

    loadData();
  }, [router, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!caption.trim() && !mediaUrl.trim()) {
      setError('Please provide a caption or an image URL.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const mediaUrls = mediaUrl.trim() ? [mediaUrl.trim()] : [];
      const now = new Date().toISOString();

      const { error: insertError } = await supabase.from('posts').insert({
        author_id: currentUser.id,
        caption: caption.trim() || null,
        media_urls: mediaUrls,
        media_type: 'image',
        post_type: postType,
        drop_id: selectedDropId || null,
        session_id: selectedSessionId || null,
        created_at: now,
        updated_at: now,
      });

      if (insertError) {
        throw insertError;
      }

      router.push('/feed');
    } catch (err: any) {
      setError(err.message || 'Failed to publish post.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-primaryText flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/feed"
            className="inline-flex items-center gap-2 text-xs font-bold text-secondaryText hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Social Feed</span>
          </Link>
        </div>

        <div className="rounded-3xl border border-surface-border bg-surface p-6 sm:p-8 shadow-2xl">
          <div className="pb-6 border-b border-surface-border">
            <h1 className="text-2xl font-black text-white">Create Social Post</h1>
            <p className="text-xs text-secondaryText mt-1">
              Demonstrate products, tease upcoming live auctions, or share updates with your followers.
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-2xl border border-coral/30 bg-coral/10 p-3 text-xs text-coral flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            {/* Caption */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-secondaryText block mb-1.5">
                Caption & Story
              </label>
              <textarea
                rows={4}
                required
                placeholder="What are you showcasing today? Share product details, provenance, condition, or show announcements..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full rounded-2xl border border-surface-border bg-background p-4 text-sm text-white focus:border-lime focus:outline-none"
              />
            </div>

            {/* Media Image URL */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-secondaryText block mb-1.5">
                Media Image URL (Photo / Demonstration Frame)
              </label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/photo-..."
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                className="w-full rounded-2xl border border-surface-border bg-background px-4 py-3 text-xs text-white focus:border-lime focus:outline-none"
              />
            </div>

            {/* Post Type Selector */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-secondaryText block mb-2.5">
                Post Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'standard', label: 'Standard Post', icon: Sparkles },
                  { id: 'product_showcase', label: 'Product Showcase', icon: ShoppingBag },
                  { id: 'auction_teaser', label: 'Auction Teaser', icon: Flame },
                  { id: 'live_announcement', label: 'Live Show Alert', icon: Video },
                ].map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setPostType(type.id as any)}
                    className={`rounded-2xl border p-3 text-center transition-all flex flex-col items-center gap-1.5 ${
                      postType === type.id
                        ? 'border-lime bg-lime/10 text-white font-bold'
                        : 'border-surface-border bg-background text-secondaryText hover:text-white'
                    }`}
                  >
                    <type.icon className="w-4 h-4 text-lime" />
                    <span className="text-[11px] font-bold leading-tight">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Attach Commerce Listing */}
            <div className="space-y-4 pt-4 border-t border-surface-border">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-secondaryText block mb-1.5">
                  Link Product / Auction Listing (Turns post into direct checkout card)
                </label>
                <select
                  value={selectedDropId}
                  onChange={(e) => setSelectedDropId(e.target.value)}
                  className="w-full rounded-2xl border border-surface-border bg-background px-4 py-3 text-xs font-semibold text-white focus:border-lime focus:outline-none"
                >
                  <option value="">-- No linked listing --</option>
                  {availableDrops.map((drop) => (
                    <option key={drop.id} value={drop.id}>
                      {drop.is_fixed_price ? '[Buy Now]' : '[Auction]'} {drop.title} ($
                      {Number(drop.is_fixed_price ? drop.fixed_price : drop.current_bid).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Link Live Show */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-secondaryText block mb-1.5">
                  Link Live Show / Catalogue Session
                </label>
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="w-full rounded-2xl border border-surface-border bg-background px-4 py-3 text-xs font-semibold text-white focus:border-lime focus:outline-none"
                >
                  <option value="">-- No linked show --</option>
                  {availableSessions.map((sess) => (
                    <option key={sess.id} value={sess.id}>
                      {sess.title} ({sess.total_lots} items • {sess.status.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-4 border-t border-surface-border flex items-center justify-end gap-3">
              <Link
                href="/feed"
                className="rounded-full border border-surface-border bg-background px-5 py-2.5 text-xs font-bold text-secondaryText hover:text-white"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-lime hover:bg-lime-hover px-6 py-2.5 text-xs font-black text-black shadow-glow transition-all disabled:opacity-50"
              >
                {submitting ? 'Publishing...' : 'Publish to Feed'}
              </button>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
