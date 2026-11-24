import {
  Navbar,
  Footer,
  Hero,
  TrendingAuctions,
  Categories,
  HowItWorks,
  SellerPromotion,
  WaitlistSection,
} from '@/components';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-primaryText flex flex-col">
      <Navbar />
      <Hero />
      <TrendingAuctions />
      <Categories />
      <HowItWorks />
      <SellerPromotion />
      <WaitlistSection />
      <Footer />
    </main>
  );
}
