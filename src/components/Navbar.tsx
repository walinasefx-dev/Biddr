'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Menu, X, Flame, Sparkles, User, ArrowRight, LogOut } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export default function Navbar() {
  const router = useRouter();
  const supabase = createClient();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    // 1. Fetch initial user session
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', user.id)
          .maybeSingle();

        if (profile) {
          setUsername(profile.username);
          setAvatarUrl(profile.avatar_url);
        } else {
          setUsername(user.email?.split('@')[0] || 'collector');
        }
      }
    }

    loadUser();

    // 2. Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const user = session?.user ?? null;
        setCurrentUser(user);

        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', user.id)
            .maybeSingle();

          if (profile) {
            setUsername(profile.username);
            setAvatarUrl(profile.avatar_url);
          } else {
            setUsername(user.email?.split('@')[0] || 'collector');
          }
        } else {
          setUsername(null);
          setAvatarUrl(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setUsername(null);
    setAvatarUrl(null);
    router.push('/');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-surface-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface border border-surface-border group-hover:border-lime/60 transition-all duration-300">
            <span className="font-black text-xl text-lime tracking-tighter">B</span>
          </div>
          <div className="flex items-baseline">
            <span className="text-2xl font-black tracking-tight text-white">biddr</span>
            <span className="h-2 w-2 rounded-full bg-lime ml-0.5 animate-pulse"></span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8">
          <a
            href="/#trending"
            className="text-sm font-medium text-secondaryText hover:text-white transition-colors flex items-center gap-1.5"
          >
            <Flame className="w-4 h-4 text-coral" />
            Explore Drops
          </a>
          <a
            href="/#categories"
            className="text-sm font-medium text-secondaryText hover:text-white transition-colors"
          >
            Categories
          </a>
          <a
            href="/#how-it-works"
            className="text-sm font-medium text-secondaryText hover:text-white transition-colors"
          >
            How It Works
          </a>
          <a
            href="/#sellers"
            className="text-sm font-medium text-secondaryText hover:text-white transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-lime" />
            Become a Seller
          </a>
        </nav>

        {/* Right CTA Actions: Dynamic based on auth state */}
        <div className="hidden md:flex items-center gap-4">
          {currentUser ? (
            <div className="flex items-center gap-3">
              <Link
                href="/profile"
                className="inline-flex items-center gap-2.5 rounded-full border border-surface-border bg-surface px-4 py-2 text-xs font-bold text-white hover:border-lime/50 transition-all"
              >
                <div className="relative h-6 w-6 rounded-full overflow-hidden border border-lime flex-shrink-0">
                  <Image
                    src={
                      avatarUrl ||
                      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
                    }
                    alt={username || 'Profile'}
                    fill
                    className="object-cover"
                  />
                </div>
                <span>@{username || 'profile'}</span>
              </Link>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center justify-center rounded-full p-2 text-secondaryText hover:text-coral hover:bg-surface-hover border border-surface-border transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-secondaryText hover:text-white px-3 py-2 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-lime px-5 py-2.5 text-sm font-bold text-black hover:bg-lime-hover hover:shadow-glow transition-all duration-300 active:scale-95"
              >
                Create Account
                <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden inline-flex items-center justify-center rounded-xl p-2.5 text-secondaryText hover:text-white hover:bg-surface border border-surface-border"
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-surface-border bg-surface/98 backdrop-blur-xl px-5 pt-4 pb-6 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col space-y-3">
            <a
              href="/#trending"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-semibold text-white hover:bg-surface-hover"
            >
              <Flame className="w-5 h-5 text-coral" />
              Explore Drops
            </a>
            <a
              href="/#categories"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-semibold text-white hover:bg-surface-hover"
            >
              Categories
            </a>
            <a
              href="/#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-semibold text-white hover:bg-surface-hover"
            >
              How It Works
            </a>
            <a
              href="/#sellers"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-semibold text-white hover:bg-surface-hover"
            >
              <Sparkles className="w-5 h-5 text-lime" />
              Become a Seller
            </a>
          </nav>

          <div className="pt-4 border-t border-surface-border flex flex-col gap-3">
            {currentUser ? (
              <>
                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-full border border-lime bg-surface px-4 py-3 text-sm font-semibold text-white hover:bg-surface-hover"
                >
                  <User className="w-4 h-4 text-lime" />
                  View Profile (@{username})
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleSignOut();
                  }}
                  className="flex items-center justify-center gap-2 rounded-full border border-surface-border bg-surface px-4 py-3 text-sm font-semibold text-coral hover:bg-coral/20"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-full border border-surface-border bg-surface px-4 py-3 text-sm font-semibold text-white hover:bg-surface-hover"
                >
                  <User className="w-4 h-4 text-secondaryText" />
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-full bg-lime px-4 py-3 text-sm font-bold text-black hover:bg-lime-hover shadow-glow"
                >
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
