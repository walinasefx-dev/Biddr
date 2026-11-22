import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Biddr — Scroll. Watch. Outbid.',
  description:
    'The social auction marketplace where every drop is a chance to win. Discover unique finds, follow favourite sellers, and participate in timed live drops.',
  keywords: [
    'social auction',
    'timed bidding',
    'live marketplace',
    'drop marketplace',
    'vintage',
    'electronics',
    'car parts',
    'outbid',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className="bg-background text-primaryText min-h-screen antialiased selection:bg-lime selection:text-black">
        {children}
      </body>
    </html>
  );
}
