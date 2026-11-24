import { Flame, ShieldCheck, Zap, Instagram, Twitter, Disc as Discord } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-surface-border bg-background text-secondaryText">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <a href="#" className="flex items-center gap-2 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface border border-surface-border group-hover:border-lime/60 transition-colors">
                <span className="font-black text-lg text-lime">B</span>
              </div>
              <span className="text-2xl font-black text-white tracking-tight">biddr</span>
              <span className="h-2 w-2 rounded-full bg-lime"></span>
            </a>
            <p className="mt-4 text-sm text-secondaryText leading-relaxed max-w-sm">
              The premium social auction marketplace for timed live drops. Discover rare finds, follow vetted
              sellers, and compete with fair 10-second anti-sniping protection.
            </p>

            <div className="mt-6 flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface border border-surface-border px-3 py-1 text-xs text-secondaryText">
                <span className="h-1.5 w-1.5 rounded-full bg-lime" />
                Supabase Connected
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface border border-surface-border px-3 py-1 text-xs text-secondaryText">
                <span className="h-1.5 w-1.5 rounded-full bg-coral" />
                Next.js 15
              </span>
            </div>
          </div>

          {/* Marketplace Column */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
              Marketplace
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="#trending" className="hover:text-white transition-colors">
                  Live Drops
                </a>
              </li>
              <li>
                <a href="#categories" className="hover:text-white transition-colors">
                  Electronics & Gadgets
                </a>
              </li>
              <li>
                <a href="#categories" className="hover:text-white transition-colors">
                  Thrift & Vintage
                </a>
              </li>
              <li>
                <a href="#categories" className="hover:text-white transition-colors">
                  Car Parts & Accessories
                </a>
              </li>
              <li>
                <a href="#waitlist" className="hover:text-white transition-colors">
                  Upcoming Schedules
                </a>
              </li>
            </ul>
          </div>

          {/* Platform & Rules Column */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
              Platform & Rules
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="#how-it-works" className="hover:text-white transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-white transition-colors">
                  10s Anti-Sniping Engine
                </a>
              </li>
              <li>
                <a href="#sellers" className="hover:text-white transition-colors">
                  Seller Program
                </a>
              </li>
              <li>
                <a href="#waitlist" className="hover:text-white transition-colors">
                  Escrow Guarantee
                </a>
              </li>
              <li>
                <a href="#waitlist" className="hover:text-white transition-colors">
                  Buyer Protection
                </a>
              </li>
            </ul>
          </div>

          {/* Company & Legal Column */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
              Company & Legal
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="#waitlist" className="hover:text-white transition-colors">
                  About Biddr
                </a>
              </li>
              <li>
                <a href="#waitlist" className="hover:text-white transition-colors">
                  Help Center & FAQ
                </a>
              </li>
              <li>
                <a href="#waitlist" className="hover:text-white transition-colors">
                  Contact Support
                </a>
              </li>
              <li>
                <a href="#waitlist" className="hover:text-white transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#waitlist" className="hover:text-white transition-colors">
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-surface-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-secondaryText">
          <div>
            © {new Date().getFullYear()} Biddr Inc. All rights reserved. Built for collectors & creators.
          </div>
          <div className="flex items-center gap-6">
            <a href="#waitlist" className="hover:text-white transition-colors">
              Terms
            </a>
            <a href="#waitlist" className="hover:text-white transition-colors">
              Privacy
            </a>
            <a href="#waitlist" className="hover:text-white transition-colors">
              Community Guidelines
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
