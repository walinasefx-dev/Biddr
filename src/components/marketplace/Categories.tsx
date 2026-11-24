'use client';

import Image from 'next/image';
import { ArrowRight, Layers, Watch, Cpu, Wrench } from 'lucide-react';
import type { CategoryCard } from '@/types';

const LAUNCH_CATEGORIES: CategoryCard[] = [
  {
    id: 'cat-1',
    name: 'Electronics & Gadgets',
    slug: 'electronics',
    tagline: 'Audio Synths, Cameras & Handhelds',
    description: 'Rare mechanical keyboards, analog synthesisers, mirrorless bodies, retro consoles, and high-end audio gear.',
    itemCount: 420,
    activeDrops: 24,
    imageUrl: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'cat-2',
    name: 'Thrift & Vintage',
    slug: 'vintage',
    tagline: '90s Workwear, Archive & Rare Denim',
    description: 'Curated Detroit workwear jackets, 90s band tees, single-stitch grails, Japanese selvedge, and retro watches.',
    itemCount: 890,
    activeDrops: 58,
    imageUrl: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'cat-3',
    name: 'Car Parts & Accessories',
    slug: 'automotive',
    tagline: 'JDM Aftermarket, Aero & Track Gear',
    description: 'Authentic Japanese tuning parts, forged wheels, bucket seats, deep corn steering wheels, and performance upgrades.',
    itemCount: 310,
    activeDrops: 17,
    imageUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80',
  },
];

export default function Categories() {
  return (
    <section id="categories" className="py-16 md:py-24 bg-surface/40 border-y border-surface-border relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-lime">
              Launch Categories
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-white">
              Curated For True Collectors
            </h2>
            <p className="mt-2 text-base text-secondaryText max-w-xl">
              We focus on 3 high-passion categories where provenance, rarity, and live walk-throughs matter most.
            </p>
          </div>
          <a
            href="#waitlist"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-lime hover:underline self-start md:self-auto"
          >
            <span>Request a new category</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* Category Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {LAUNCH_CATEGORIES.map((cat) => (
            <div
              key={cat.id}
              className="group relative flex flex-col overflow-hidden rounded-3xl border border-surface-border bg-surface transition-all duration-300 hover:border-lime/50 hover:shadow-glow hover:-translate-y-1.5"
            >
              {/* Image banner */}
              <div className="relative aspect-[16/10] w-full overflow-hidden">
                <Image
                  src={cat.imageUrl}
                  alt={cat.name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />

                {/* Drop count badge */}
                <div className="absolute top-4 right-4 rounded-full bg-black/75 px-3 py-1 text-xs font-bold text-lime border border-lime/30 backdrop-blur-md">
                  {cat.activeDrops} Live Drops
                </div>
              </div>

              {/* Card Body */}
              <div className="flex flex-1 flex-col p-6 pt-2">
                <div className="text-xs font-bold text-coral uppercase tracking-wider mb-1">
                  {cat.tagline}
                </div>
                <h3 className="text-2xl font-black text-white group-hover:text-lime transition-colors">
                  {cat.name}
                </h3>
                <p className="mt-3 text-sm text-secondaryText leading-relaxed flex-1">
                  {cat.description}
                </p>

                <div className="mt-6 pt-5 border-t border-surface-border flex items-center justify-between">
                  <span className="text-xs font-semibold text-secondaryText">
                    {cat.itemCount}+ cataloged lots
                  </span>
                  <a
                    href="#waitlist"
                    className="inline-flex items-center gap-1 text-xs font-bold text-white group-hover:text-lime transition-colors"
                  >
                    <span>Explore Category</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
