'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { FollowButton } from './FollowButton';
import { CommentDrawer } from './CommentDrawer';
import type { PostRecord } from '@/types';
import {
  Heart,
  MessageSquare,
  Share2,
  Bookmark,
  ShieldCheck,
  Sparkles,
  ShoppingBag,
  Flame,
  Video,
  ArrowRight,
  Check,
} from 'lucide-react';

interface PostCardProps {
  post: PostRecord;
  currentUserId?: string;
}

export function PostCard({ post, currentUserId }: PostCardProps) {
  const router = useRouter();
  const supabase = createClient();

  const [isLiked, setIsLiked] = useState(Boolean(post.is_liked));
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [isSaved, setIsSaved] = useState(Boolean(post.is_saved));
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Toggle Like
  const handleToggleLike = async () => {
    if (!currentUserId) {
      router.push('/login?redirect=/feed');
      return;
    }

    const nextLiked = !isLiked;
    const nextCount = nextLiked ? likeCount + 1 : Math.max(0, likeCount - 1);
    setIsLiked(nextLiked);
    setLikeCount(nextCount);

    try {
      const { data, error } = await supabase.rpc('toggle_post_like', {
        p_post_id: post.id,
      });
      if (!error && data) {
        setIsLiked(Boolean(data.liked));
        setLikeCount(Number(data.like_count));
      }
    } catch {
      // Revert on error
      setIsLiked(!nextLiked);
      setLikeCount(likeCount);
    }
  };

  // Toggle Save / Bookmark
  const handleToggleSave = async () => {
    if (!currentUserId) {
      router.push('/login?redirect=/feed');
      return;
    }

    const nextSaved = !isSaved;
    setIsSaved(nextSaved);

    try {
      if (nextSaved) {
        await supabase.from('post_saves').insert({ user_id: currentUserId, post_id: post.id });
      } else {
        await supabase.from('post_saves').delete().eq('user_id', currentUserId).eq('post_id', post.id);
      }
    } catch {
      setIsSaved(!nextSaved);
    }
  };

  // Share Link to Clipboard
  const handleShare = () => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/feed#post-${post.id}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getPostTypeBadge = () => {
    switch (post.post_type) {
      case 'product_showcase':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-lime bg-lime/10 border border-lime/30 px-2.5 py-0.5 rounded-full">
            <ShoppingBag className="w-3 h-3" />
            Product Showcase
          </span>
        );
      case 'auction_teaser':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-coral bg-coral/10 border border-coral/30 px-2.5 py-0.5 rounded-full">
            <Flame className="w-3 h-3" />
            Auction Teaser
          </span>
        );
      case 'live_announcement':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/30 px-2.5 py-0.5 rounded-full">
            <Video className="w-3 h-3" />
            Live Show
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      id={`post-${post.id}`}
      className="rounded-3xl border border-surface-border bg-surface p-5 sm:p-6 shadow-2xl transition-all hover:border-surface-border/80"
    >
      {/* Post Header: Author & Follow CTA */}
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/profile/${post.author?.username || 'user'}`}
            className="relative h-11 w-11 rounded-2xl overflow-hidden border border-lime shadow-glow-sm bg-surface-border flex-shrink-0"
          >
            <Image
              src={
                post.author?.avatar_url ||
                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
              }
              alt={post.author?.username || 'Author'}
              fill
              className="object-cover"
            />
          </Link>

          <div>
            <div className="flex items-center gap-1.5">
              <Link
                href={`/profile/${post.author?.username || 'user'}`}
                className="text-sm font-bold text-white hover:text-lime transition-colors"
              >
                {post.author?.full_name || `@${post.author?.username || 'seller'}`}
              </Link>
              {post.author?.seller_verified && (
                <ShieldCheck className="w-3.5 h-3.5 text-biddrBlue" />
              )}
            </div>
            <div className="text-[11px] text-secondaryText">
              @{post.author?.username || 'seller'} •{' '}
              {new Date(post.created_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {getPostTypeBadge()}
          {post.author_id && <FollowButton sellerId={post.author_id} size="sm" />}
        </div>
      </div>

      {/* Caption Text */}
      {post.caption && (
        <p className="text-sm text-white leading-relaxed my-3 whitespace-pre-line">
          {post.caption}
        </p>
      )}

      {/* Media Image / Video Gallery */}
      {post.media_urls && post.media_urls.length > 0 && (
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-surface-border bg-background my-3">
          <Image
            src={post.media_urls[0]}
            alt="Post media"
            fill
            className="object-cover"
          />
        </div>
      )}

      {/* Embedded Commerce Card (Direct connection to Product, Auction, or Live Show) */}
      {post.drop && (
        <div className="mt-4 rounded-2xl border border-surface-border bg-background p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative h-14 w-14 rounded-xl overflow-hidden border border-surface-border bg-surface flex-shrink-0">
              <Image
                src={post.drop.image_url}
                alt={post.drop.title}
                fill
                className="object-cover"
              />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase text-secondaryText block">
                {post.drop.is_fixed_price ? 'Featured Product' : 'Auction Lot'}
              </span>
              <h4 className="text-xs font-bold text-white truncate">{post.drop.title}</h4>
              <div className="text-sm font-black text-lime mt-0.5">
                ${Number(post.drop.is_fixed_price ? post.drop.fixed_price : post.drop.current_bid).toLocaleString()}
              </div>
            </div>
          </div>

          <Link
            href={`/auction/${post.drop.id}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-lime hover:bg-lime-hover px-4 py-2 text-xs font-black text-black shadow-glow flex-shrink-0"
          >
            <span>{post.drop.is_fixed_price ? 'Buy Now' : 'Place Bid'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {post.session && (
        <div className="mt-4 rounded-2xl border border-coral/30 bg-coral/10 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-coral/20 text-coral flex-shrink-0">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-coral block">
                {post.session.status === 'live' ? 'Live Stream On Air' : 'Upcoming Catalogue Show'}
              </span>
              <h4 className="text-xs font-bold text-white line-clamp-1">{post.session.title}</h4>
              <span className="text-[11px] text-secondaryText">{post.session.total_lots} items</span>
            </div>
          </div>

          <Link
            href={`/live/${post.session.id}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-coral hover:bg-red-600 px-4 py-2 text-xs font-black text-white shadow-coral-glow flex-shrink-0"
          >
            <span>Join Show</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Engagement Actions Row */}
      <div className="mt-4 pt-3 border-t border-surface-border flex items-center justify-between text-xs text-secondaryText">
        <div className="flex items-center gap-4">
          {/* Like Button */}
          <button
            onClick={handleToggleLike}
            className={`flex items-center gap-1.5 transition-colors ${
              isLiked ? 'text-coral font-bold' : 'hover:text-white'
            }`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-coral text-coral' : ''}`} />
            <span>{likeCount}</span>
          </button>

          {/* Comment Toggle */}
          <button
            onClick={() => setCommentsOpen(!commentsOpen)}
            className="flex items-center gap-1.5 hover:text-white transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            <span>{post.comment_count || 0}</span>
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 hover:text-white transition-colors"
            title="Share Link"
          >
            {copied ? <Check className="w-4 h-4 text-lime" /> : <Share2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Share'}</span>
          </button>
        </div>

        {/* Bookmark Save */}
        <button
          onClick={handleToggleSave}
          className={`hover:text-white transition-colors ${isSaved ? 'text-lime' : ''}`}
          title="Save Post"
        >
          <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-lime text-lime' : ''}`} />
        </button>
      </div>

      {/* Comment Drawer Container */}
      <CommentDrawer
        postId={post.id}
        isOpen={commentsOpen}
        onClose={() => setCommentsOpen(false)}
      />
    </div>
  );
}
