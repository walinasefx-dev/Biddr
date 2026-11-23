'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { createClient } from '@/lib/supabase/client';
import { MARKETPLACE_CATEGORIES, type AuctionDropRecord, type UserProfile } from '@/types';
import {
  ArrowLeft,
  Sparkles,
  Plus,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  ShieldCheck,
  Package,
  Lock,
} from 'lucide-react';

const CONDITION_OPTIONS = [
  'Brand New (Sealed)',
  'Like New (Open Box)',
  'Excellent Vintage',
  'Good (Minor Wear)',
  'Collector Grade',
  'Refurbished / Restored',
] as const;

export default function EditAuctionPage() {
  const params = useParams();
  const dropId = params.id as string;
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [drop, setDrop] = useState<AuctionDropRecord | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('electronics');
  const [condition, setCondition] = useState('Brand New (Sealed)');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('United States');
  const [shippingInfo, setShippingInfo] = useState('Standard Insured Shipping');
  const [startingPrice, setStartingPrice] = useState('100');
  const [minIncrement, setMinIncrement] = useState('10');
  const [images, setImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');

  useEffect(() => {
    async function loadAuction() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push(`/login?redirect=/seller/auctions/${dropId}/edit`);
        return;
      }

      // Fetch user profile
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (userProfile) {
        setProfile(userProfile as UserProfile);
      }

      // Fetch drop
      const { data: dropData, error: dropError } = await supabase
        .from('drops')
        .select('*')
        .eq('id', dropId)
        .maybeSingle();

      if (dropError || !dropData) {
        setError('Auction not found or unavailable.');
        setLoading(false);
        return;
      }

      // Verify seller ownership
      if (dropData.seller_id !== user.id) {
        setError('You do not have permission to edit this auction.');
        setLoading(false);
        return;
      }

      setDrop(dropData as AuctionDropRecord);
      setTitle(dropData.title || '');
      setCategory(dropData.category || 'electronics');
      setCondition(dropData.condition || 'Brand New (Sealed)');
      setDescription(dropData.description || '');
      setLocation(dropData.location || 'United States');
      setShippingInfo(dropData.shipping_information || 'Standard Insured Shipping');
      setStartingPrice(String(dropData.starting_price || 100));
      setMinIncrement(String(dropData.min_increment || 10));

      const existingImages =
        dropData.images && dropData.images.length > 0
          ? dropData.images
          : dropData.image_url
          ? [dropData.image_url]
          : [];
      setImages(existingImages);

      setLoading(false);
    }

    if (dropId) {
      loadAuction();
    }
  }, [dropId, router, supabase]);

  const handleAddImage = () => {
    if (!newImageUrl.trim()) return;
    if (images.includes(newImageUrl.trim())) {
      setError('Image URL is already in the list.');
      return;
    }
    setImages((prev) => [...prev, newImageUrl.trim()]);
    setNewImageUrl('');
    setError(null);
  };

  const handleRemoveImage = (indexToRemove: number) => {
    if (images.length === 1) {
      setError('Auctions require at least one image.');
      return;
    }
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const hasBids = (drop?.bid_count || 0) > 0;
  const isDraft = drop?.status === 'draft';

  // Save handler
  const handleSaveAuction = async (targetStatus?: 'draft' | 'live') => {
    setError(null);
    setSuccessMessage(null);

    if (!title.trim() || title.trim().length < 4) {
      setError('Please provide a descriptive title (at least 4 characters).');
      return;
    }

    const price = parseFloat(startingPrice);
    if (isNaN(price) || price <= 0) {
      setError('Starting price must be a positive number.');
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

    setSubmitting(true);

    try {
      const now = new Date();
      const statusToSet = targetStatus || drop?.status || 'draft';

      const updatePayload: Record<string, any> = {
        title: title.trim(),
        description: description.trim() || null,
        category,
        condition,
        location: location.trim(),
        shipping_information: shippingInfo.trim(),
        image_url: images[0],
        images,
        updated_at: now.toISOString(),
      };

      // Only allow modifying prices if no bids placed yet
      if (!hasBids) {
        updatePayload.starting_price = price;
        // If draft or no bids, current_bid stays synced to starting price
        if (drop?.bid_count === 0) {
          updatePayload.current_bid = price;
        }
        updatePayload.min_increment = increment;
      }

      // If publishing from draft to live
      if (isDraft && targetStatus === 'live') {
        updatePayload.status = 'live';
        updatePayload.starts_at = now.toISOString();
        updatePayload.ends_at = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      }

      const { error: updateError } = await supabase
        .from('drops')
        .update(updatePayload)
        .eq('id', dropId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      setSuccessMessage('Auction listing updated successfully!');
      setTimeout(() => {
        router.push(targetStatus === 'live' ? `/auction/${dropId}` : '/seller');
      }, 1000);
    } catch (err: any) {
      setError(err?.message || 'Failed to update auction.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete draft handler
  const handleDeleteDraft = async () => {
    if (!confirm('Are you sure you want to delete this draft auction?')) {
      return;
    }

    try {
      setSubmitting(true);
      const { error: deleteError } = await supabase.from('drops').delete().eq('id', dropId);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      router.push('/seller');
    } catch (err: any) {
      setError(err?.message || 'Failed to delete auction draft.');
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
            <span className="text-sm font-bold text-secondaryText">Loading auction details...</span>
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
            <span>Seller: @{profile?.username || 'seller'}</span>
          </div>
        </div>

        {/* Title Header */}
        <div className="pb-8 border-b border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-lime mb-1 uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              Listing Editor
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Edit Auction
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-secondaryText">
              Update listing specs, photos, or publish to live marketplace collectors.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-surface-border px-3 py-1 text-xs font-bold text-white uppercase">
              Status: {drop?.status}
            </span>
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

        {hasBids && (
          <div className="mt-6 rounded-2xl border border-biddrBlue/40 bg-biddrBlue/10 p-4 text-xs text-blue-300 flex items-center gap-3">
            <Lock className="w-5 h-5 flex-shrink-0 text-biddrBlue" />
            <span>
              This auction has already received {drop?.bid_count} bid(s). Starting price and
              minimum increment are locked to protect auction fairness and bidder agreements.
            </span>
          </div>
        )}

        {/* Form Container */}
        <div className="mt-8 space-y-8">
          {/* Section 1: Specifications */}
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
                className="w-full rounded-2xl border border-surface-border bg-background px-4 py-3 text-sm text-white focus:border-lime focus:outline-none focus:ring-1 focus:ring-lime"
              />
            </div>

            {/* Category & Condition */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-secondaryText mb-2">
                  Marketplace Category
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
                  Condition Grade
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
                Item Description & Provenance
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-surface-border bg-background px-4 py-3 text-sm text-white focus:border-lime focus:outline-none focus:ring-1 focus:ring-lime resize-none"
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
                  className="w-full rounded-2xl border border-surface-border bg-background px-4 py-3 text-sm text-white focus:border-lime focus:outline-none focus:ring-1 focus:ring-lime"
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
                  className="w-full rounded-2xl border border-surface-border bg-background px-4 py-3 text-sm text-white focus:border-lime focus:outline-none focus:ring-1 focus:ring-lime"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Pricing */}
          <div className="rounded-3xl border border-surface-border bg-surface p-6 sm:p-8 space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-surface-border pb-4">
              <DollarSign className="w-5 h-5 text-lime" />
              2. Auction Pricing
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-secondaryText mb-2">
                  Starting Bid ($ USD)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondaryText font-bold">
                    $
                  </span>
                  <input
                    type="number"
                    min="1"
                    disabled={hasBids}
                    value={startingPrice}
                    onChange={(e) => setStartingPrice(e.target.value)}
                    className="w-full rounded-2xl border border-surface-border bg-background pl-8 pr-4 py-3 text-sm font-bold text-lime focus:border-lime focus:outline-none focus:ring-1 focus:ring-lime disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-secondaryText mb-2">
                  Minimum Bid Increment ($ USD)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondaryText font-bold">
                    $
                  </span>
                  <input
                    type="number"
                    min="1"
                    disabled={hasBids}
                    value={minIncrement}
                    onChange={(e) => setMinIncrement(e.target.value)}
                    className="w-full rounded-2xl border border-surface-border bg-background pl-8 pr-4 py-3 text-sm font-bold text-white focus:border-lime focus:outline-none focus:ring-1 focus:ring-lime disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Photography */}
          <div className="rounded-3xl border border-surface-border bg-surface p-6 sm:p-8 space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-surface-border pb-4">
              <ImageIcon className="w-5 h-5 text-lime" />
              3. Product Photography
            </h2>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="url"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="Paste high-res image URL"
                className="flex-1 rounded-2xl border border-surface-border bg-background px-4 py-3 text-sm text-white placeholder-secondaryText/50 focus:border-lime focus:outline-none focus:ring-1 focus:ring-lime"
              />
              <button
                type="button"
                onClick={handleAddImage}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-surface-hover border border-surface-border px-5 py-3 text-xs font-bold text-white hover:border-lime/60 transition-all"
              >
                <Plus className="w-4 h-4 text-lime" />
                <span>Add Photo</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              {images.map((imgUrl, idx) => (
                <div
                  key={idx}
                  className="group relative rounded-2xl overflow-hidden border border-surface-border bg-background aspect-square"
                >
                  <Image
                    src={imgUrl}
                    alt={`Photo ${idx + 1}`}
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
          </div>

          {/* Form Actions Footer */}
          <div className="pt-4 border-t border-surface-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              {isDraft && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleDeleteDraft}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-coral hover:text-red-400 p-2 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Draft</span>
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <Link
                href="/seller"
                className="w-full sm:w-auto text-center rounded-full border border-surface-border bg-surface px-6 py-3.5 text-xs font-bold text-secondaryText hover:text-white"
              >
                Cancel
              </Link>

              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSaveAuction()}
                className="w-full sm:w-auto rounded-full border border-surface-border bg-surface-hover px-6 py-3.5 text-xs font-bold text-white hover:border-lime/40 transition-all disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>

              {isDraft && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSaveAuction('live')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-lime px-8 py-3.5 text-xs font-black text-black hover:bg-lime-hover shadow-glow transition-all disabled:opacity-50 active:scale-95"
                >
                  <span>{submitting ? 'Publishing...' : 'Publish Auction Now'}</span>
                  <Sparkles className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
