'use client';

import { useState } from 'react';
import { ArrowRight, CheckCircle2, Sparkles, Mail, User, ShieldAlert } from 'lucide-react';
import type { WaitlistRole } from '@/types';

export default function WaitlistSection() {
  const [role, setRole] = useState<WaitlistRole>('both');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    // Interactive frontend state — clearly framed as Stage 1 alpha
    setSubmitted(true);
  };

  return (
    <section id="waitlist" className="py-20 md:py-32 bg-background relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-lime/10 blur-[150px] rounded-full pointer-events-none -z-10" />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl border border-surface-border bg-surface p-8 sm:p-12 md:p-16 shadow-2xl">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-lime/30 bg-lime/10 px-4 py-1.5 text-xs font-bold text-lime mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Early Access Registration
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white">
              Get VIP Access to the First Live Drop.
            </h2>
            <p className="mt-4 text-base text-secondaryText leading-relaxed">
              Join collectors and top independent sellers preparing for the public launch. Early members
              unlock priority bidding queues and exclusive 0% seller fee perks.
            </p>
          </div>

          {/* Form / Success State */}
          <div className="mt-10 max-w-xl mx-auto">
            {submitted ? (
              <div className="rounded-2xl border border-lime/30 bg-lime/10 p-8 text-center animate-in fade-in zoom-in-95 duration-300">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lime text-black mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-white">
                  You are on the Early Access Roster!
                </h3>
                <p className="mt-2 text-sm text-secondaryText leading-relaxed">
                  Thank you, <strong className="text-white">{name || 'Collector'}</strong> ({email}). We’ve
                  recorded your interest as a <strong className="text-lime uppercase">{role}</strong>.
                </p>

                {/* Clear Stage 1 notice */}
                <div className="mt-6 rounded-xl bg-black/60 border border-white/10 p-3 text-xs text-secondaryText flex items-center justify-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-lime flex-shrink-0" />
                  <span>
                    Frontend verification preview. Database persistence will be linked in Stage 2.
                  </span>
                </div>

                <button
                  onClick={() => {
                    setSubmitted(false);
                    setEmail('');
                    setName('');
                  }}
                  className="mt-6 text-xs font-bold text-white underline hover:text-lime"
                >
                  Register another email
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Role Selector Tabs */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-secondaryText mb-2 text-center">
                    What will you do on Biddr?
                  </label>
                  <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-background border border-surface-border">
                    {(
                      [
                        { id: 'buyer', label: 'Bid & Buy' },
                        { id: 'seller', label: 'Host Drops' },
                        { id: 'both', label: 'Both' },
                      ] as const
                    ).map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setRole(option.id)}
                        className={`rounded-xl py-2.5 text-xs sm:text-sm font-bold transition-all duration-200 ${
                          role === option.id
                            ? 'bg-lime text-black shadow-glow-sm'
                            : 'text-secondaryText hover:text-white'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name Input */}
                <div>
                  <label className="block text-xs font-semibold text-secondaryText mb-1.5">
                    Your Name or Handle <span className="text-secondaryText/60">(Optional)</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondaryText" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex Rivera (@alex_finds)"
                      className="w-full rounded-2xl border border-surface-border bg-background pl-11 pr-4 py-3.5 text-sm text-white placeholder-secondaryText/50 focus:border-lime focus:outline-none focus:ring-1 focus:ring-lime transition-all"
                    />
                  </div>
                </div>

                {/* Email Input */}
                <div>
                  <label className="block text-xs font-semibold text-secondaryText mb-1.5">
                    Email Address <span className="text-coral">*</span>
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

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-lime py-4 px-6 text-base font-extrabold text-black hover:bg-lime-hover hover:shadow-glow transition-all duration-300 active:scale-98"
                >
                  Join Early Access Waitlist
                  <ArrowRight className="w-5 h-5" />
                </button>

                {/* Clear Stage 1 Notice */}
                <div className="pt-2 text-center">
                  <div className="inline-flex items-center gap-1.5 text-xs text-secondaryText/80">
                    <ShieldAlert className="w-3.5 h-3.5 text-lime" />
                    <span>
                      Frontend interface. Database registration connects in Stage 2 backend rollout.
                    </span>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
