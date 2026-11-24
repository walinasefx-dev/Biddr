'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Menu, X, Flame, Sparkles, User, ArrowRight, LogOut, Bell, ShoppingBag, Radio } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export default function Navbar() {
  const router = useRouter();
  const supabase = createClient();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);

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

        // Fetch unread notifications count
        try {
          const { count } = await supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('read', false);
          setUnreadCount(count || 0);
        } catch {
          // Handled
        }
      }
    }

    loadUser();

    // 2. Listen for auth changes
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
          setUnreadCount(0);
        }
      }
    );

    // 3. Realtime notifications subscription
    const notifChannel = supabase
      .channel('navbar-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        () => {
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(notifChannel);
    };
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setUsername(null);
    setAvatarUrl(null);
    setUnreadCount(0);
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
        <nav className="hidden md:flex items-center gap-6 lg:gap-8">
          <Link
            href="/auctions"
            className="text-sm font-semibold text-white hover:text-lime transition-colors flex items-center gap-1.5"
          >
            <Flame className="w-4 h-4 text-coral" />
            Marketplace
          </Link>
          <Link
            href="/feed"
            className="text-sm font-medium text-secondaryText hover:text-white transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-lime" />
            Feed
          </Link>
          <Link
            href="/live"
            className="text-sm font-medium text-secondaryText hover:text-white transition-colors flex items-center gap-1.5"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-coral opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-coral"></span>
            </span>
            <Radio className="w-4 h-4 text-coral" />
            Live
          </Link>
          <a
            href="/#categories"
            className="text-sm font-medium text-secondaryText hover:text-white transition-colors"
          >
            Categories
          </a>
          <Link
            href="/seller"
            className="text-sm font-medium text-secondaryText hover:text-white transition-colors flex items-center gap-1.5"
          >
            Seller Studio
          </Link>
        </nav>

        {/* Right CTA Actions: Dynamic based on auth state */}
        <div className="hidden md:flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-3">
              {/* My Orders */}
              <Link
                href="/orders"
                className="inline-flex items-center gap-1.5 rounded-full border border-surface-border bg-surface px-3.5 py-2 text-xs font-bold text-secondaryText hover:text-white hover:border-lime/40 transition-all"
                title="My Orders & Purchases"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-lime" />
                <span>Orders</span>
              </Link>

              {/* Notifications Bell */}
              <Link
                href="/notifications"
                className="relative inline-flex items-center justify-center rounded-full p-2 text-secondaryText hover:text-white hover:bg-surface-hover border border-surface-border transition-colors"
                title="Notifications & Activity"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral px-1 text-[10px] font-black text-white shadow-coral-glow">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>

              {/* User Profile Pill */}
              <Link
                href="/profile"
                className="inline-flex items-center gap-2.5 rounded-full border border-surface-border bg-surface px-3.5 py-2 text-xs font-bold text-white hover:border-lime/50 transition-all"
              >
                <div className="relative h-5 w-5 rounded-full overflow-hidden border border-lime flex-shrink-0">
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

              {/* Sign Out Button */}
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
            <Link
              href="/auctions"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-bold text-white hover:bg-surface-hover"
            >
              <Flame className="w-5 h-5 text-coral" />
              Marketplace Drops
            </Link>
            <Link
              href="/feed"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-semibold text-white hover:bg-surface-hover"
            >
              <Sparkles className="w-5 h-5 text-lime" />
              Social Feed
            </Link>
            <Link
              href="/live"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-semibold text-white hover:bg-surface-hover"
            >
              <Radio className="w-5 h-5 text-coral" />
              <span>Live Shows</span>
              <span className="ml-auto rounded-full bg-coral px-2 py-0.5 text-[10px] font-black text-white">
                LIVE
              </span>
            </Link>
            <a
              href="/#categories"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-semibold text-secondaryText hover:text-white hover:bg-surface-hover"
            >
              Categories
            </a>
            <a
              href="/#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-semibold text-secondaryText hover:text-white hover:bg-surface-hover"
            >
              How It Works
            </a>
            <Link
              href="/seller"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-semibold text-white hover:bg-surface-hover"
            >
              <Sparkles className="w-5 h-5 text-lime" />
              Seller Studio
            </Link>
            {currentUser && (
              <>
                <Link
                  href="/orders"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-semibold text-white hover:bg-surface-hover"
                >
                  <ShoppingBag className="w-5 h-5 text-lime" />
                  My Purchases & Orders
                </Link>
                <Link
                  href="/notifications"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 text-base font-semibold text-white hover:bg-surface-hover"
                >
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-coral" />
                    <span>Notifications</span>
                  </div>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-coral px-2 py-0.5 text-xs font-black text-white">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              </>
            )}
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
