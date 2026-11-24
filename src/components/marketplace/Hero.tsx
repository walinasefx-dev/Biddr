'use client';

import Image from 'next/image';
import { ArrowRight, Flame, Shield, Zap, Sparkles, Clock, Eye } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-32">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-lime/10 blur-[130px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-1/3 right-10 w-[350px] h-[350px] bg-coral/10 blur-[140px] rounded-full pointer-events-none -z-10" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Headline and Call-to-Actions */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            {/* Status Pill Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface/80 px-3.5 py-1.5 text-xs font-semibold backdrop-blur-md mb-6">
              <span className="flex h-2 w-2 rounded-full bg-lime animate-pulse"></span>
              <span className="text-secondaryText">Introducing Biddr Web Alpha</span>
              <span className="text-white font-bold ml-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-lime" />
                Next-Gen Auctions
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight text-white leading-[1.05]">
              Scroll. Watch.{' '}
              <span className="block text-lime drop-shadow-[0_0_35px_rgba(204,255,0,0.35)]">
                Outbid.
              </span>
            </h1>

            {/* Supporting Description */}
            <p className="mt-6 text-lg sm:text-xl text-secondaryText leading-relaxed max-w-2xl">
              The social marketplace where every drop is a chance to win. Discover unique finds,
              follow your favourite sellers, and compete for products through exciting timed live auctions.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
              <a
                href="#waitlist"
                className="inline-flex items-center justify-center gap-2.5 rounded-full bg-lime px-8 py-4 text-base font-extrabold text-black hover:bg-lime-hover hover:shadow-glow transition-all duration-300 active:scale-95"
              >
                Join Early Access
                <ArrowRight className="w-5 h-5" />
              </a>
              <a
                href="#trending"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-surface-border bg-surface px-7 py-4 text-base font-bold text-white hover:bg-surface-hover hover:border-white/30 transition-all duration-200"
              >
                Explore Live Drops
              </a>
            </div>

            {/* Trust Badges */}
            <div className="mt-10 pt-8 border-t border-surface-border/80 grid grid-cols-3 gap-4 w-full max-w-lg">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface border border-surface-border flex-shrink-0">
                  <Zap className="w-4 h-4 text-lime" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">10s Anti-Snipe</div>
                  <div className="text-[11px] text-secondaryText">Fair timer engine</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface border border-surface-border flex-shrink-0">
                  <Shield className="w-4 h-4 text-biddrBlue" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Escrow Guard</div>
                  <div className="text-[11px] text-secondaryText">100% buyer protection</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface border border-surface-border flex-shrink-0">
                  <Flame className="w-4 h-4 text-coral" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Live Drops</div>
                  <div className="text-[11px] text-secondaryText">Curated sellers</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Editorial Product Composition Showcase */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Primary Showcase Card */}
              <div className="relative rounded-3xl border border-surface-border bg-surface p-4 shadow-2xl overflow-hidden hover:border-lime/40 transition-all duration-500">
                {/* Visual Image */}
                <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden">
                  <Image
                    src="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1000&q=80"
                    alt="Leica M6 Classic 35mm Rangefinder"
                    fill
                    priority
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

                  {/* Live Broadcast Badge */}
                  <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-coral/90 px-3 py-1 text-xs font-extrabold text-white backdrop-blur-md">
                    <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                    LIVE DROP
                  </div>

                  {/* Watching Count */}
                  <div className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
                    <Eye className="w-3.5 h-3.5 text-lime" />
                    184 watching
                  </div>

                  {/* Timer overlay */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-xl bg-black/85 px-4 py-2.5 border border-white/10 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-lime" />
                      <span className="text-xs font-medium text-secondaryText">Closes in</span>
                      <span className="font-mono text-sm font-bold text-white">00:08:42</span>
                    </div>
                    <span className="text-xs font-bold text-coral bg-coral/20 px-2 py-0.5 rounded">
                      Anti-Snipe Active
                    </span>
                  </div>
                </div>

                {/* Details Footer */}
                <div className="p-4 pt-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-secondaryText">@analogarchive</span>
                        <span className="h-1.5 w-1.5 rounded-full bg-biddrBlue" />
                        <span className="text-[11px] text-biddrBlue font-bold">Verified Collector</span>
                      </div>
                      <h3 className="text-xl font-bold text-white mt-1">
                        Leica M6 Classic 35mm Rangefinder
                      </h3>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-surface-border flex items-center justify-between">
                    <div>
                      <span className="text-[11px] uppercase tracking-wider font-semibold text-secondaryText">
                        Current High Bid
                      </span>
                      <div className="text-3xl font-black text-lime tracking-tight">$2,850</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold text-white">34 competitive bids</div>
                      <div className="text-[11px] text-lime font-medium mt-0.5">+ $50 min increment</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Secondary Floating Card (Simulating high-energy social bid notification) */}
              <div className="absolute -bottom-6 -left-6 hidden sm:flex items-center gap-3.5 rounded-2xl border border-surface-border bg-surface/95 p-3.5 shadow-2xl backdrop-blur-xl max-w-xs animate-pulse-subtle">
                <div className="relative h-12 w-12 rounded-xl overflow-hidden border border-lime/40 flex-shrink-0">
                  <Image
                    src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=300&q=80"
                    alt="Seiko Vintage Chrono"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="text-xs">
                  <div className="flex items-center gap-1.5 text-lime font-bold">
                    <span className="h-1.5 w-1.5 rounded-full bg-lime animate-ping" />
                    NEW BID PLACED
                  </div>
                  <div className="text-white font-semibold truncate">Vintage Seiko Speedtimer</div>
                  <div className="text-secondaryText font-mono">$620 by @tokyovault</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
