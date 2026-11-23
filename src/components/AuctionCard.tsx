'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ShieldCheck, Flame, ArrowUpRight } from 'lucide-react';
import type { AuctionItem } from '@/types';
import CountdownTimer from './CountdownTimer';

interface AuctionCardProps {
  auction: AuctionItem;
}

export default function AuctionCard({ auction }: AuctionCardProps) {
  const detailUrl = `/auction/${auction.id}`;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-surface-border bg-surface transition-all duration-300 hover:-translate-y-1 hover:border-lime/50 hover:shadow-glow">
      {/* Product Image Container */}
      <Link href={detailUrl} className="relative aspect-[4/3] w-full overflow-hidden bg-surface-border block">
        <Image
          src={auction.imageUrl}
          alt={auction.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Top Badges Overlay */}
        <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
          {/* Live / Status Pill */}
          {auction.isLive ? (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-black/75 px-3 py-1 text-xs font-bold text-coral border border-coral/30 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-coral opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-coral"></span>
              </span>
              LIVE DROP
            </div>
          ) : auction.isEnded ? (
            <div className="inline-flex items-center gap-1 rounded-full bg-surface/90 px-3 py-1 text-xs font-semibold text-secondaryText border border-surface-border backdrop-blur-md">
              AUCTION ENDED
            </div>
          ) : (
            <div className="inline-flex items-center gap-1 rounded-full bg-black/75 px-3 py-1 text-xs font-semibold text-lime border border-lime/30 backdrop-blur-md">
              UPCOMING DROP
            </div>
          )}

          {/* Category Tag */}
          <span className="rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium text-secondaryText border border-white/10 backdrop-blur-md">
            {auction.categoryLabel || auction.category}
          </span>
        </div>

        {/* Timer Bar Overlay at Bottom of Image */}
        <div className="absolute bottom-3 inset-x-3 flex items-center justify-between rounded-xl bg-black/80 px-3 py-2 text-xs backdrop-blur-md border border-white/10">
          <CountdownTimer endsAt={auction.endsAt} status={auction.isLive ? 'live' : 'ended'} />
          <div className="flex items-center gap-1 text-secondaryText">
            <Flame className="w-3.5 h-3.5 text-coral" />
            <span className="font-medium text-white">{auction.bidCount} bids</span>
          </div>
        </div>
      </Link>

      {/* Card Content Details */}
      <div className="flex flex-1 flex-col p-5">
        {/* Seller Info */}
        <div className="flex items-center gap-2 mb-3">
          <div className="relative h-6 w-6 overflow-hidden rounded-full border border-surface-border bg-surface-hover">
            <Image
              src={auction.seller.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
              alt={auction.seller.name}
              fill
              className="object-cover"
            />
          </div>
          <Link
            href={`/profile/${auction.seller.handle}`}
            className="text-xs font-medium text-secondaryText hover:text-white transition-colors truncate"
          >
            @{auction.seller.handle}
          </Link>
          {auction.seller.verified && (
            <ShieldCheck className="w-3.5 h-3.5 text-biddrBlue flex-shrink-0" title="Verified Seller" />
          )}
          {auction.condition && (
            <span className="ml-auto text-[10px] font-semibold text-secondaryText/80 bg-surface-hover px-2 py-0.5 rounded border border-surface-border">
              {auction.condition}
            </span>
          )}
        </div>

        {/* Product Title */}
        <Link href={detailUrl} className="block">
          <h3 className="text-base font-bold text-white line-clamp-1 group-hover:text-lime transition-colors">
            {auction.title}
          </h3>
        </Link>

        {/* Price & Action Footer */}
        <div className="mt-4 pt-4 border-t border-surface-border flex items-end justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-secondaryText">
              Current Bid
            </span>
            <div className="text-2xl font-black text-lime tracking-tight">
              ${auction.currentBid.toLocaleString()}
            </div>
          </div>

          <Link
            href={detailUrl}
            className="inline-flex items-center justify-center gap-1 rounded-xl bg-surface-hover px-3.5 py-2 text-xs font-bold text-white hover:bg-lime hover:text-black border border-surface-border transition-all duration-200"
          >
            <span>Bid</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
