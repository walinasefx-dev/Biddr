'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Mail, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const supabase = createClient();

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/auth/callback?next=/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      setEmailSent(true);
      setLoading(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-primaryText flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-lime/10 blur-[140px] rounded-full pointer-events-none -z-10" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-xs font-bold text-secondaryText hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sign In
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
          Reset your password
        </h1>
        <p className="mt-2 text-sm text-secondaryText">
          Enter your registered email and we&apos;ll send you a secure password reset link.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="rounded-3xl border border-surface-border bg-surface p-8 shadow-2xl">
          {emailSent ? (
            <div className="text-center py-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lime text-black mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-white">Reset link dispatched</h2>
              <p className="mt-2 text-sm text-secondaryText leading-relaxed">
                If an account exists for <strong className="text-white">{email}</strong>, you will receive an email shortly with instructions to reset your password.
              </p>
              <div className="mt-6 pt-6 border-t border-surface-border">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-lime px-6 py-3 text-xs font-bold text-black hover:bg-lime-hover shadow-glow transition-all"
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

              <form onSubmit={handleResetRequest} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-secondaryText mb-1.5">
                    Account Email
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-lime py-4 px-6 text-sm font-extrabold text-black hover:bg-lime-hover hover:shadow-glow transition-all duration-300 disabled:opacity-50"
                >
                  {loading ? (
                    <span>Sending link...</span>
                  ) : (
                    <>
                      <span>Send Reset Link</span>
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
