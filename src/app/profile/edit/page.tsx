'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import type { UserProfile } from '@/types';
import {
  ArrowLeft,
  User,
  MapPin,
  Lock,
  Camera,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';

export default function EditProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    async function fetchCurrentProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login?redirect=/profile/edit');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (data) {
        const p = data as UserProfile;
        setProfile(p);
        setFullName(p.full_name || '');
        setBio(p.bio || '');
        setLocation(p.location || '');
        setAvatarUrl(p.avatar_url || '');
      }
      setLoading(false);
    }

    fetchCurrentProfile();
  }, [router, supabase]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setSaving(true);

    try {
      // Security: Only send user-editable fields.
      // Database triggers explicitly block clients from updating is_seller or seller_verified.
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          bio: bio.trim(),
          location: location.trim(),
          avatar_url: avatarUrl.trim() || profile.avatar_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (error) {
        setErrorMessage(error.message);
        setSaving(false);
        return;
      }

      setSuccessMessage('Profile updated successfully!');
      setSaving(false);

      setTimeout(() => {
        router.push('/profile');
        router.refresh();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save changes.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-primaryText flex items-center justify-center">
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-full bg-lime animate-ping" />
          <span className="text-sm font-bold text-secondaryText">Loading editor...</span>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background text-primaryText py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Back Link */}
        <Link
          href="/profile"
          className="inline-flex items-center gap-2 text-xs font-bold text-secondaryText hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Profile
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white tracking-tight">Edit Profile</h1>
          <p className="mt-1 text-sm text-secondaryText">
            Update your public profile details visible to sellers and bidders.
          </p>
        </div>

        {/* Feedback Alerts */}
        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-coral/30 bg-coral/10 p-4 flex items-start gap-3 text-xs text-coral">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 rounded-2xl border border-lime/30 bg-lime/10 p-4 flex items-start gap-3 text-xs text-lime">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6 rounded-3xl border border-surface-border bg-surface p-6 sm:p-8 shadow-2xl">
          {/* Avatar Preview & URL */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-secondaryText mb-3">
              Profile Photo
            </label>
            <div className="flex items-center gap-5">
              <div className="relative h-20 w-20 rounded-2xl overflow-hidden border border-lime shadow-glow bg-surface-border flex-shrink-0">
                <Image
                  src={
                    avatarUrl ||
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
                  }
                  alt={profile.username}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1">
                <div className="relative">
                  <Camera className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondaryText" />
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full rounded-2xl border border-surface-border bg-background pl-11 pr-4 py-3 text-xs text-white placeholder-secondaryText/50 focus:border-lime focus:outline-none focus:ring-1 focus:ring-lime transition-all"
                  />
                </div>
                <span className="text-[11px] text-secondaryText mt-1 block">
                  Paste a direct image URL (Unsplash or hosted image)
                </span>
              </div>
            </div>
          </div>

          {/* Username (Read Only) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-secondaryText mb-1.5">
              Username
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-secondaryText">
                @
              </span>
              <input
                type="text"
                disabled
                value={profile.username}
                className="w-full rounded-2xl border border-surface-border/60 bg-background/50 pl-9 pr-10 py-3.5 text-sm text-secondaryText cursor-not-allowed"
              />
              <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondaryText/60" />
            </div>
            <span className="text-[11px] text-secondaryText/70 mt-1 block">
              Usernames are permanently linked to your transaction and auction history.
            </span>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-secondaryText mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondaryText" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alex Rivera"
                className="w-full rounded-2xl border border-surface-border bg-background pl-11 pr-4 py-3.5 text-sm text-white placeholder-secondaryText/50 focus:border-lime focus:outline-none focus:ring-1 focus:ring-lime transition-all"
              />
            </div>
          </div>

          {/* Biography */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-secondaryText mb-1.5">
              Short Biography
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Collector of vintage chronographs, Japanese denim, and analog synths..."
              className="w-full rounded-2xl border border-surface-border bg-background p-4 text-sm text-white placeholder-secondaryText/50 focus:border-lime focus:outline-none focus:ring-1 focus:ring-lime transition-all resize-none"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-secondaryText mb-1.5">
              Location
            </label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondaryText" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Tokyo, Japan or London, UK"
                className="w-full rounded-2xl border border-surface-border bg-background pl-11 pr-4 py-3.5 text-sm text-white placeholder-secondaryText/50 focus:border-lime focus:outline-none focus:ring-1 focus:ring-lime transition-all"
              />
            </div>
          </div>

          {/* Security Notice: Privilege Protections */}
          <div className="rounded-2xl border border-surface-border bg-background p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-white mb-2">
              <ShieldAlert className="w-4 h-4 text-lime" />
              Seller & Verification Privilege Guard
            </div>
            <div className="flex items-center gap-4 text-xs text-secondaryText">
              <div>
                Seller Status:{' '}
                <strong className={profile.is_seller ? 'text-lime' : 'text-white'}>
                  {profile.is_seller ? 'Authorized' : 'Not Granted'}
                </strong>
              </div>
              <div>
                Verification:{' '}
                <strong className={profile.seller_verified ? 'text-biddrBlue' : 'text-white'}>
                  {profile.seller_verified ? 'Verified' : 'Unverified'}
                </strong>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-secondaryText/80 leading-relaxed">
              To preserve marketplace integrity and prevent fraud, seller privileges and verification
              badges can only be granted through Biddr administration. Client attempts to elevate privileges are strictly rejected by database security triggers.
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-border">
            <Link
              href="/profile"
              className="rounded-full bg-surface-hover border border-surface-border px-5 py-3 text-xs font-bold text-secondaryText hover:text-white transition-all"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-lime px-7 py-3 text-xs font-extrabold text-black hover:bg-lime-hover hover:shadow-glow transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
