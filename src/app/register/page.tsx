'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Mail, Lock, User, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successConfirmation, setSuccessConfirmation] = useState(false);

  const supabase = createClient();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (cleanUsername.length < 3) {
      setErrorMessage('Username must be at least 3 characters and contain only letters, numbers, or underscores.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      // 1. Check if username is already taken
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', cleanUsername)
        .maybeSingle();

      if (existingUser) {
        setErrorMessage(`@${cleanUsername} is already taken. Please choose another username.`);
        setLoading(false);
        return;
      }

      // 2. Perform Supabase Sign Up
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            username: cleanUsername,
            full_name: fullName.trim(),
          },
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      // If Supabase has email confirmation enabled
      if (data?.user && !data.session) {
        setSuccessConfirmation(true);
        setLoading(false);
        return;
      }

      // If session exists immediately, redirect to profile
      if (data?.session) {
        router.push('/profile');
        router.refresh();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during sign up.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-primaryText flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-lime/10 blur-[140px] rounded-full pointer-events-none -z-10" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-secondaryText hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Biddr
        </Link>

        {/* Logo */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface border border-surface-border">
            <span className="font-black text-xl text-lime">B</span>
          </div>
          <span className="text-2xl font-black text-white tracking-tight">biddr</span>
          <span className="h-2 w-2 rounded-full bg-lime"></span>
        </div>

        <h1 className="text-3xl font-black text-white tracking-tight mt-4">
          Create your account
        </h1>
        <p className="mt-2 text-sm text-secondaryText">
          Join the social marketplace where every drop is a chance to win.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="rounded-3xl border border-surface-border bg-surface p-8 shadow-2xl">
          {successConfirmation ? (
            <div className="text-center py-6 animate-in fade-in duration-300">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lime text-black mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-white">Check your email</h2>
              <p className="mt-3 text-sm text-secondaryText leading-relaxed">
                We sent a confirmation link to <strong className="text-white">{email}</strong>.
                Please click the link to activate your Biddr account.
              </p>
              <div className="mt-6 pt-6 border-t border-surface-border">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-surface-hover border border-surface-border px-6 py-3 text-xs font-bold text-white hover:bg-lime hover:text-black transition-all"
                >
                  Return to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <>
              {errorMessage && (
                <div className="mb-6 rounded-2xl border border-coral/30 bg-coral/10 p-4 flex items-start gap-3 text-xs text-coral">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-secondaryText mb-1.5">
                    Username
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-lime">
                      @
                    </span>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      placeholder="collector99"
                      className="w-full rounded-2xl border border-surface-border bg-background pl-9 pr-4 py-3.5 text-sm text-white placeholder-secondaryText/50 focus:border-lime focus:outline-none focus:ring-1 focus:ring-lime transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-secondaryText mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondaryText" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Alex Rivera"
                      className="w-full rounded-2xl border border-surface-border bg-background pl-11 pr-4 py-3.5 text-sm text-white placeholder-secondaryText/50 focus:border-lime focus:outline-none focus:ring-1 focus:ring-lime transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-secondaryText mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondaryText" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@domain.com"
                      className="w-full rounded-2xl border border-surface-border bg-background pl-11 pr-4 py-3.5 text-sm text-white placeholder-secondaryText/50 focus:border-lime focus:outline-none focus:ring-1 focus:ring-lime transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-secondaryText mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondaryText" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full rounded-2xl border border-surface-border bg-background pl-11 pr-11 py-3.5 text-sm text-white placeholder-secondaryText/50 focus:border-lime focus:outline-none focus:ring-1 focus:ring-lime transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-secondaryText hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-3 inline-flex items-center justify-center gap-2 rounded-full bg-lime py-4 px-6 text-sm font-extrabold text-black hover:bg-lime-hover hover:shadow-glow transition-all duration-300 disabled:opacity-50"
                >
                  {loading ? (
                    <span>Creating account...</span>
                  ) : (
                    <>
                      <span>Complete Registration</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-surface-border text-center text-xs text-secondaryText">
                Already have an account?{' '}
                <Link href="/login" className="font-bold text-lime hover:underline">
                  Sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
