'use client';

import Image from 'next/image';
import { Sparkles, TrendingUp, DollarSign, Users, CheckCircle2, ArrowRight } from 'lucide-react';

export default function SellerPromotion() {
  return (
    <section id="sellers" className="py-20 md:py-28 bg-surface/50 border-t border-surface-border relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Content */}
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-lime/30 bg-lime/10 px-4 py-1.5 text-xs font-bold text-lime mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              Founding Seller Program
            </div>

            <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              Turn Your Inventory Into{' '}
              <span className="text-lime">High-Energy Live Drops.</span>
            </h2>

            <p className="mt-4 text-base sm:text-lg text-secondaryText leading-relaxed max-w-2xl">
              Stop waiting weeks for static marketplace listings to sell. Biddr gives vintage curators,
              electronics specialists, and car enthusiasts an engaged audience ready to compete for your drops.
            </p>

            {/* Seller Value Pillars */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="rounded-2xl border border-surface-border bg-surface p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime/10 text-lime mb-3">
                  <DollarSign className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-white">0% Platform Fee at Launch</h4>
                <p className="mt-1 text-xs text-secondaryText leading-relaxed">
                  First 100 approved founding sellers pay zero commission for their first 90 days of live drops.
                </p>
              </div>

              <div className="rounded-2xl border border-surface-border bg-surface p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-biddrBlue/10 text-biddrBlue mb-3">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-white">Dynamic Bidding Fever</h4>
                <p className="mt-1 text-xs text-secondaryText leading-relaxed">
                  Timed drops create urgency. Bidders compete in real time, frequently driving higher closing prices.
                </p>
              </div>

              <div className="rounded-2xl border border-surface-border bg-surface p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-coral/10 text-coral mb-3">
                  <Users className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-white">Built-In Collector Following</h4>
                <p className="mt-1 text-xs text-secondaryText leading-relaxed">
                  Buyers follow your profile and receive push notifications the second you schedule a new drop.
                </p>
              </div>

              <div className="rounded-2xl border border-surface-border bg-surface p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime/10 text-lime mb-3">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-white">Guaranteed Payouts</h4>
                <p className="mt-1 text-xs text-secondaryText leading-relaxed">
                  Winning bids are pre-authorized and held in escrow. No ghosting, no fake non-paying buyers.
                </p>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <a
                href="#waitlist"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-lime px-8 py-4 text-base font-extrabold text-black hover:bg-lime-hover hover:shadow-glow transition-all duration-300"
              >
                Apply for Seller Access
                <ArrowRight className="w-5 h-5" />
              </a>
              <span className="text-xs text-secondaryText text-center sm:text-left">
                Takes 2 minutes • Verified seller badge included
              </span>
            </div>
          </div>

          {/* Right Column: Visual Seller Showcase Card */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-3xl border border-surface-border bg-surface p-6 shadow-2xl">
              <div className="relative aspect-[4/5] w-full rounded-2xl overflow-hidden mb-5">
                <Image
                  src="https://images.unsplash.com/photo-1556742049-0a67e5572293?auto=format&fit=crop&w=800&q=80"
                  alt="Seller Drop Live"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30" />

                <div className="absolute top-4 left-4 rounded-full bg-coral px-3 py-1 text-xs font-bold text-white">
                  SELLER LIVE DASHBOARD
                </div>

                <div className="absolute bottom-4 left-4 right-4 rounded-xl bg-black/80 p-4 border border-white/10 backdrop-blur-md">
                  <div className="flex items-center justify-between text-xs text-secondaryText">
                    <span>Live Drop Gross Volume</span>
                    <span className="text-lime font-bold">+184% vs static sale</span>
                  </div>
                  <div className="text-2xl font-black text-white mt-1">$4,820.00</div>
                  <div className="mt-2 text-xs text-secondaryText flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-lime" />
                    <span>3 drops completed today • 89 unique bidders</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs py-2 border-b border-surface-border">
                  <span className="text-secondaryText">Seller Verification</span>
                  <span className="text-lime font-bold">Fast Track Approved</span>
                </div>
                <div className="flex items-center justify-between text-xs py-2 border-b border-surface-border">
                  <span className="text-secondaryText">Launch Fee Tier</span>
                  <span className="text-white font-bold">0% Commission (Tier 1)</span>
                </div>
                <div className="flex items-center justify-between text-xs py-2">
                  <span className="text-secondaryText">Payout Schedule</span>
                  <span className="text-white font-bold">Instant Escrow Release</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
