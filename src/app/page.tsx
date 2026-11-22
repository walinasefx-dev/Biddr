import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import TrendingAuctions from '@/components/TrendingAuctions';
import Categories from '@/components/Categories';
import HowItWorks from '@/components/HowItWorks';
import SellerPromotion from '@/components/SellerPromotion';
import WaitlistSection from '@/components/WaitlistSection';
import Footer from '@/components/Footer';

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
