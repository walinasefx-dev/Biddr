'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Lock, ArrowRight, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);

      setTimeout(() => {
        router.push('/login');
      }, 2500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update password.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-primaryText flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-lime/10 blur-[140px] rounded-full pointer-events-none -z-10" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface border border-surface-border">
            <span className="font-black text-xl text-lime">B</span>
          </div>
          <span className="text-2xl font-black text-white tracking-tight">biddr</span>
          <span className="h-2 w-2 rounded-full bg-lime"></span>
        </div>

        <h1 className="text-3xl font-black text-white tracking-tight mt-4">
          Choose a new password
        </h1>
        <p className="mt-2 text-sm text-secondaryText">
          Enter your new secure password below to complete the recovery.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="rounded-3xl border border-surface-border bg-surface p-8 shadow-2xl">
          {success ? (
            <div className="text-center py-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lime text-black mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-white">Password Updated!</h2>
              <p className="mt-2 text-sm text-secondaryText">
                Your password has been securely updated. Redirecting to login...
              </p>
              <div className="mt-6 pt-6 border-t border-surface-border">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-lime px-6 py-3 text-xs font-bold text-black"
                >
                  Sign In Now
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

              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-secondaryText mb-1.5">
                    New Password
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

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-secondaryText mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondaryText" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      className="w-full rounded-2xl border border-surface-border bg-background pl-11 pr-4 py-3.5 text-sm text-white placeholder-secondaryText/50 focus:border-lime focus:outline-none focus:ring-1 focus:ring-lime transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-3 inline-flex items-center justify-center gap-2 rounded-full bg-lime py-4 px-6 text-sm font-extrabold text-black hover:bg-lime-hover hover:shadow-glow transition-all duration-300 disabled:opacity-50"
                >
                  {loading ? (
                    <span>Updating password...</span>
                  ) : (
                    <>
                      <span>Set New Password</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
