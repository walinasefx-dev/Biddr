'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Navbar, Footer } from '@/components';
import { createClient } from '@/lib/supabase/client';
import { MARKETPLACE_CATEGORIES, type UserProfile } from '@/types';
import {
  ArrowLeft,
  Sparkles,
  Plus,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Clock,
  Tag,
  DollarSign,
  ShieldCheck,
  Package,
  Layers,
} from 'lucide-react';

const CONDITION_OPTIONS = [
  'Brand New (Sealed)',
  'Like New (Open Box)',
  'Excellent Vintage',
  'Good (Minor Wear)',
  'Collector Grade',
  'Refurbished / Restored',
] as const;

const DURATION_PRESETS = [
  { label: '1 Hour (Flash Drop)', hours: 1 },
  { label: '6 Hours (Evening Rush)', hours: 6 },
  { label: '24 Hours (1 Day Standard)', hours: 24 },
  { label: '3 Days (Weekend Special)', hours: 72 },
  { label: '7 Days (Full Week Feature)', hours: 168 },
] as const;

// Quick sample presets for testing
const SAMPLE_PRESETS = [
  {
    title: 'Sony FX3 Cinema Line Full-Frame Camera',
    category: 'electronics',
    condition: 'Like New (Open Box)',
    startingPrice: 2200,
    minIncrement: 50,
    description:
      'Pristine condition Sony FX3 body with XLR handle unit. Low shutter count, sensor is flawless. Includes 3 authentic Sony NP-FZ100 batteries, dual charger, and Pelican hard case.',
    location: 'Brooklyn, NY, USA',
    shipping: 'Insured UPS Next Day Air with Direct Signature Required ($45)',
    images: [
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    title: '1984 Macintosh 128K Computer (Fully Operational)',
    category: 'vintage',
    condition: 'Collector Grade',
    startingPrice: 1400,
    minIncrement: 50,
    description:
      'Museum-grade 1984 Apple Macintosh 128K signed by the original team inside the chassis. Completely restored motherboard with refreshed capacitors. Powers on cleanly with authentic mechanical keyboard and mouse.',
    location: 'Palo Alto, CA, USA',
    shipping: 'Double-boxed custom crate via FedEx Express Insured ($85)',
    images: [
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    title: 'Porsche 911 (992) GT3 OEM Carbon Fiber Wing',
    category: 'automotive',
    condition: 'Brand New (Sealed)',
    startingPrice: 3800,
    minIncrement: 100,
    description:
      'Genuine Porsche Motorsport carbon rear wing for 992 GT3. Gloss clear coat finish with Swan-neck mounting brackets. Factory part number documented with Certificate of Authenticity.',
    location: 'Stuttgart / Miami, FL',
    shipping: 'Freight Wooden Crate Insured Courier Delivery ($120)',
    images: [
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    title: 'Omega Speedmaster Professional Moonwatch (Hesalite)',
    category: 'watches',
    condition: 'Like New (Open Box)',
    startingPrice: 4200,
    minIncrement: 100,
    description:
      'Classic Omega Moonwatch Calibre 3861 with hesalite crystal. Full set with inner and outer presentation box, warranty card, pictograms, and NASA commemorative medallion.',
    location: 'Geneva / New York, NY',
    shipping: 'Armored Courier Express with Full Valuation Insurance ($95)',
    images: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80',
    ],
  },
];

export default function CreateAuctionPage() {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('electronics');
  const [condition, setCondition] = useState('Brand New (Sealed)');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('United States');
  const [shippingInfo, setShippingInfo] = useState('Standard Insured Shipping (3-5 business days)');
  const [startingPrice, setStartingPrice] = useState('100');
  const [minIncrement, setMinIncrement] = useState('10');
  const [durationHours, setDurationHours] = useState(24);
  const [images, setImages] = useState<string[]>([
    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80',
  ]);
  const [newImageUrl, setNewImageUrl] = useState('');

  // 1. Authenticate Seller
  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login?redirect=/seller/auctions/new');
        return;
      }

      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (userProfile) {
        setProfile(userProfile as UserProfile);
      }
      setLoading(false);
    }

    checkAuth();
  }, [router, supabase]);

  // Load a sample preset
  const handleApplyPreset = (preset: (typeof SAMPLE_PRESETS)[0]) => {
    setTitle(preset.title);
    setCategory(preset.category);
    setCondition(preset.condition);
    setDescription(preset.description);
    setLocation(preset.location);
    setShippingInfo(preset.shipping);
    setStartingPrice(String(preset.startingPrice));
    setMinIncrement(String(preset.minIncrement));
    setImages(preset.images);
    setError(null);
  };

  // Image helpers
  const handleAddImage = () => {
    if (!newImageUrl.trim()) return;
    if (images.includes(newImageUrl.trim())) {
      setError('Image URL is already added.');
      return;
    }
    setImages((prev) => [...prev, newImageUrl.trim()]);
    setNewImageUrl('');
    setError(null);
  };

  const handleRemoveImage = (indexToRemove: number) => {
    if (images.length === 1) {
      setError('Auctions require at least one product photo.');
      return;
    }
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // 2. Submit Handler: supports 'draft' or 'live'
  const handleSaveAuction = async (status: 'draft' | 'live') => {
    setError(null);
    setSuccessMessage(null);

    // Validation
    if (!title.trim() || title.trim().length < 4) {
      setError('Please provide a descriptive title (at least 4 characters).');
      return;
    }

    const price = parseFloat(startingPrice);
    if (isNaN(price) || price <= 0) {
      setError('Starting price must be a positive number greater than 0.');
      return;
    }

    const increment = parseFloat(minIncrement);
    if (isNaN(increment) || increment <= 0) {
      setError('Minimum bid increment must be greater than 0.');
      return;
    }

    if (images.length === 0) {
      setError('At least one product image is required.');
      return;
    }

    if (!profile) {
      setError('Unable to detect active user profile.');
      return;
    }

    setSubmitting(true);

    try {
      const now = new Date();
      const endsAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000);

      const dropPayload = {
        seller_id: profile.id,
        title: title.trim(),
        description: description.trim() || null,
        category,
        condition,
        location: location.trim() || 'United States',
        shipping_information: shippingInfo.trim() || 'Standard Insured Shipping',
        starting_price: price,
        current_bid: price,
        min_increment: increment,
        bid_count: 0,
        status,
        starts_at: status === 'live' ? now.toISOString() : null,
        ends_at: endsAt.toISOString(),
        image_url: images[0],
        images,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };

      const { data, error: insertError } = await supabase
        .from('drops')
        .insert(dropPayload)
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      setSuccessMessage(
        status === 'live'
          ? 'Auction published successfully! Your drop is now live.'
          : 'Draft auction saved successfully!'
      );

      // Redirect after brief delay
      setTimeout(() => {
        if (status === 'live' && data?.id) {
          router.push(`/auction/${data.id}`);
        } else {
          router.push('/seller');
        }
      }, 1200);
    } catch (err: any) {
      setError(err?.message || 'Failed to create auction. Please check your inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-primaryText flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-lime animate-ping" />
            <span className="text-sm font-bold text-secondaryText">Loading auction creator...</span>
          </div>
        </div>
      </div>
    );
  }

  const validCategories = MARKETPLACE_CATEGORIES.filter((c) => c.id !== 'all');

  return (
    <div className="min-h-screen bg-background text-primaryText flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 w-full">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/seller"
            className="inline-flex items-center gap-2 text-xs font-bold text-secondaryText hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Seller Studio</span>
          </Link>
          <div className="inline-flex items-center gap-1.5 text-xs text-secondaryText">
            <ShieldCheck className="w-4 h-4 text-lime" />
            <span>Authenticated Seller: @{profile?.username || 'seller'}</span>
          </div>
        </div>

        {/* Title Header */}
        <div className="pb-8 border-b border-surface-border">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-lime mb-1 uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            New Auction Listing
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Create Auction Drop
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-secondaryText">
            Configure your item specifications, set starting pricing and bid increments, and publish to collectors.
          </p>
        </div>

        {/* Quick Sample Presets (For fast testing & demonstration) */}
        <div className="mt-8 rounded-2xl border border-surface-border bg-surface/60 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-lime" />
              Quick Fill Demo Presets
            </span>
            <span className="text-[11px] text-secondaryText">Click to populate sample product details</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {SAMPLE_PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className="rounded-xl border border-surface-border bg-surface px-3 py-2 text-left hover:border-lime/60 hover:bg-surface-hover transition-all group"
              >
                <div className="text-[11px] font-bold text-white group-hover:text-lime truncate">
                  {p.title}
                </div>
                <div className="text-[10px] text-secondaryText mt-0.5">
                  ${p.startingPrice} • {p.category}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="mt-6 rounded-2xl border border-coral/40 bg-coral/10 p-4 text-xs text-coral flex items-center gap-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mt-6 rounded-2xl border border-lime/40 bg-lime/10 p-4 text-xs text-lime flex items-center gap-3 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form Container */}
        <div className="mt-8 space-y-8">
          {/* Section 1: Item Basic Details */}
          <div className="rounded-3xl border border-surface-border bg-surface p-6 sm:p-8 space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-surface-border pb-4">
              <Package className="w-5 h-5 text-lime" />
              1. Item Specifications
            </h2>

            {/* Title */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-secondaryText mb-2">
                Listing Title <span className="text-coral">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 1972 Vintage Polaroid SX-70 Original Alpha"
                className="w-full rounded-2xl border border-surface-border bg-background px-4 py-3 text-sm text-white placeholder-secondaryText/50 focus:border-lime focus:outline-none focus:ring-1 focus:ring-lime"
              />
            </div>

            {/* Category & Condition */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-secondaryText mb-2">
                  Marketplace Category <span className="text-coral">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-2xl border border-surface-border bg-background px-4 py-3 text-sm text-white focus:border-lime focus:outline-none focus:ring-1 focus:ring-lime"
                >
                  {validCategories.map((c) => (
                    <option key={c.id} value={c.id} className="bg-surface text-white">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-secondaryText mb-2">
                  Condition Grade <span className="text-coral">*</span>
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full rounded-2xl border border-surface-border bg-background px-4 py-3 text-sm text-white focus:border-lime focus:outline-none focus:ring-1 focus:ring-lime"
                >
                  {CONDITION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt} className="bg-surface text-white">
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-secondaryText mb-2">
                Full Item Description & Provenance
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Detail technical specifications, cosmetic wear, included accessories, provenance, and authentication papers..."
                className="w-full rounded-2xl border border-surface-border bg-background px-4 py-3 text-sm text-white placeholder-secondaryText/50 focus:border-lime focus:outline-none focus:ring-1 focus:ring-lime resize-none"
              />
            </div>

            {/* Location & Shipping */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-secondaryText mb-2">
                  Item Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Los Angeles, CA, USA"
                  className="w-full rounded-2xl border border-surface-border bg-background px-4 py-3 text-sm text-white placeholder-secondaryText/50 focus:border-lime focus:outline-none focus:ring-1 focus:ring-lime"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-secondaryText mb-2">
                  Shipping & Handling Method
                </label>
                <input
                  type="text"
                  value={shippingInfo}
                  onChange={(e) => setShippingInfo(e.target.value)}
                  placeholder="e.g. Insured Courier Delivery (2-4 business days)"
                  className="w-full rounded-2xl border border-surface-border bg-background px-4 py-3 text-sm text-white placeholder-secondaryText/50 focus:border-lime focus:outline-none focus:ring-1 focus:ring-lime"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Pricing, Increments & Duration */}
          <div className="rounded-3xl border border-surface-border bg-surface p-6 sm:p-8 space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-surface-border pb-4">
              <DollarSign className="w-5 h-5 text-lime" />
              2. Auction Pricing & Timing
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Starting Price */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-secondaryText mb-2">
                  Starting Bid ($ USD) <span className="text-coral">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondaryText font-bold">
                    $
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={startingPrice}
                    onChange={(e) => setStartingPrice(e.target.value)}
                    className="w-full rounded-2xl border border-surface-border bg-background pl-8 pr-4 py-3 text-sm font-bold text-lime focus:border-lime focus:outline-none focus:ring-1 focus:ring-lime"
                  />
                </div>
                <span className="text-[11px] text-secondaryText mt-1 block">
                  The initial opening bid amount for collectors.
                </span>
              </div>

              {/* Min Increment */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-secondaryText mb-2">
                  Minimum Bid Increment ($ USD) <span className="text-coral">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondaryText font-bold">
                    $
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={minIncrement}
                    onChange={(e) => setMinIncrement(e.target.value)}
                    className="w-full rounded-2xl border border-surface-border bg-background pl-8 pr-4 py-3 text-sm font-bold text-white focus:border-lime focus:outline-none focus:ring-1 focus:ring-lime"
                  />
                </div>
                <span className="text-[11px] text-secondaryText mt-1 block">
                  Each subsequent outbid must exceed current bid by this amount.
                </span>
              </div>
            </div>

            {/* Auction Duration Preset */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-secondaryText mb-2 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-biddrBlue" />
                Auction Duration
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {DURATION_PRESETS.map((preset) => (
                  <button
                    key={preset.hours}
                    type="button"
                    onClick={() => setDurationHours(preset.hours)}
                    className={`rounded-2xl p-3 border text-xs font-bold text-center transition-all ${
                      durationHours === preset.hours
                        ? 'border-lime bg-lime/10 text-lime shadow-glow-sm'
                        : 'border-surface-border bg-background text-secondaryText hover:text-white'
                    }`}
                  >
                    <div>{preset.label.split(' ')[0]} {preset.label.split(' ')[1]}</div>
                    <div className="text-[10px] font-normal text-secondaryText mt-0.5">
                      {preset.hours} hours
                    </div>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-secondaryText">
                Protected by Biddr Anti-Snipe: Bids placed within the final 10 seconds automatically extend the auction clock by 10 seconds.
              </p>
            </div>
          </div>

          {/* Section 3: Product Photography */}
          <div className="rounded-3xl border border-surface-border bg-surface p-6 sm:p-8 space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-surface-border pb-4">
              <ImageIcon className="w-5 h-5 text-lime" />
              3. Product Photography (Multiple Images)
            </h2>

            {/* Add Image Input */}
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="url"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="Paste high-res image URL (e.g. Unsplash or Cloudflare R2)"
                className="flex-1 rounded-2xl border border-surface-border bg-background px-4 py-3 text-sm text-white placeholder-secondaryText/50 focus:border-lime focus:outline-none focus:ring-1 focus:ring-lime"
              />
              <button
                type="button"
                onClick={handleAddImage}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-surface-hover border border-surface-border px-5 py-3 text-xs font-bold text-white hover:border-lime/60 transition-all"
              >
                <Plus className="w-4 h-4 text-lime" />
                <span>Add Image</span>
              </button>
            </div>

            {/* Image Preview Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              {images.map((imgUrl, idx) => (
                <div
                  key={idx}
                  className="group relative rounded-2xl overflow-hidden border border-surface-border bg-background aspect-square"
                >
                  <Image
                    src={imgUrl}
                    alt={`Product photo ${idx + 1}`}
                    fill
                    className="object-cover transition-transform group-hover:scale-105 duration-300"
                  />
                  {idx === 0 && (
                    <div className="absolute top-2 left-2 rounded-full bg-lime text-black text-[9px] font-black px-2 py-0.5 shadow-md">
                      COVER PHOTO
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-2 right-2 rounded-full bg-black/80 text-coral p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black"
                    title="Remove Image"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-secondaryText">
              The first photo will be used as the primary marketplace card thumbnail. You can add multiple angles for bidders.
            </p>
          </div>

          {/* Form Actions Footer */}
          <div className="pt-4 border-t border-surface-border flex flex-col sm:flex-row items-center justify-end gap-4">
            <Link
              href="/seller"
              className="w-full sm:w-auto text-center rounded-full border border-surface-border bg-surface px-6 py-3.5 text-xs font-bold text-secondaryText hover:text-white"
            >
              Discard
            </Link>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSaveAuction('draft')}
              className="w-full sm:w-auto rounded-full border border-surface-border bg-surface-hover px-6 py-3.5 text-xs font-bold text-white hover:border-lime/40 transition-all disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save as Draft'}
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSaveAuction('live')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-lime px-8 py-3.5 text-xs font-black text-black hover:bg-lime-hover shadow-glow transition-all disabled:opacity-50 active:scale-95"
            >
              <span>{submitting ? 'Publishing...' : 'Publish Auction Now'}</span>
              <Sparkles className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
