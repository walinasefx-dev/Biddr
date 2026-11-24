'use client';

import { Search, Video, Zap, Trophy, ShieldCheck, Clock } from 'lucide-react';

const STEPS = [
  {
    step: '01',
    title: 'Discover Unique Drops',
    subtitle: 'Curated Niche Lots',
    description:
      'Explore live drops across Electronics, Vintage Fashion, and Automotive Gear from vetted creators and independent boutiques.',
    icon: Search,
    color: 'lime',
  },
  {
    step: '02',
    title: 'Watch Sellers Showcase',
    subtitle: '360° Live Inspection',
    description:
      'Sellers showcase items live with macro close-ups, authenticity verification, and condition checks so you know exactly what you get.',
    icon: Video,
    color: 'biddrBlue',
  },
  {
    step: '03',
    title: 'Place Timed Bids',
    subtitle: '10s Anti-Sniping Protection',
    description:
      'Compete with confidence. If a bid lands in the final 10 seconds, the clock extends by 10s—guaranteeing genuine high bidders win.',
    icon: Zap,
    color: 'coral',
  },
  {
    step: '04',
    title: 'Win & Escrow Protection',
    subtitle: '100% Safe Settlement',
    description:
      'Your payment is held safely in escrow until you receive and inspect the item. Only then are funds released to the seller.',
    icon: Trophy,
    color: 'lime',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 md:py-32 bg-background relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface px-4 py-1.5 text-xs font-bold text-lime mb-4">
            <Clock className="w-3.5 h-3.5" />
            Social Auction Mechanics
          </div>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
            How Biddr Works
          </h2>
          <p className="mt-4 text-base sm:text-lg text-secondaryText leading-relaxed">
            We replaced boring classified listings and bot-infested auction sites with live, high-energy,
            community-verified timed drops.
          </p>
        </div>

        {/* 4 Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((stepItem, idx) => {
            const Icon = stepItem.icon;
            return (
              <div
                key={stepItem.step}
                className="relative rounded-3xl border border-surface-border bg-surface p-7 flex flex-col justify-between transition-all duration-300 hover:border-lime/40 hover:-translate-y-1"
              >
                {/* Step badge */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-full bg-surface-hover text-secondaryText border border-surface-border">
                      STEP {stepItem.step}
                    </span>
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${
                        stepItem.color === 'lime'
                          ? 'border-lime/40 bg-lime/10 text-lime'
                          : stepItem.color === 'coral'
                          ? 'border-coral/40 bg-coral/10 text-coral'
                          : 'border-biddrBlue/40 bg-biddrBlue/10 text-biddrBlue'
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>

                  <span className="text-xs font-bold uppercase tracking-wider text-secondaryText">
                    {stepItem.subtitle}
                  </span>
                  <h3 className="text-xl font-bold text-white mt-1 mb-3">
                    {stepItem.title}
                  </h3>
                  <p className="text-sm text-secondaryText leading-relaxed">
                    {stepItem.description}
                  </p>
                </div>

                {/* Connecting arrow indicator for desktop */}
                {idx < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-surface-border">
                    <div className="w-6 h-6 rounded-full bg-surface border border-surface-border flex items-center justify-center text-secondaryText text-xs font-bold">
                      →
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Anti-Sniping Feature Spotlight Box */}
        <div className="mt-16 rounded-3xl border border-surface-border bg-gradient-to-r from-surface via-surface/90 to-surface-hover p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-extrabold text-coral uppercase tracking-wider mb-2">
              <Zap className="w-4 h-4 text-coral" />
              The Biddr Anti-Sniping Engine
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-white">
              No More Last-Second Sniping Bots.
            </h3>
            <p className="mt-2 text-sm sm:text-base text-secondaryText">
              Ever been outbid by 1 millisecond on traditional auction platforms? On Biddr, every bid placed
              with under 10 seconds remaining extends the countdown by an extra 10 seconds. Real bidders get
              a fair chance to respond until true market value is found.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 flex-shrink-0">
            <div className="flex items-center gap-3 rounded-2xl bg-black/60 border border-white/10 px-5 py-3">
              <ShieldCheck className="w-6 h-6 text-lime" />
              <div className="text-left text-xs">
                <div className="text-white font-bold">Atomic Server Logic</div>
                <div className="text-secondaryText">Realtime Supabase Engine</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
