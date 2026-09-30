import BrandMark from '@/components/BrandMark';
import Nav from '@/components/Nav';
import Hero from '@/components/Hero';
import ProofStrip from '@/components/ProofStrip';
import Problem from '@/components/Problem';
import HowItWorks from '@/components/HowItWorks';

import Capture from '@/components/Capture';
import Piece from '@/components/Piece';
import ForAI from '@/components/ForAI';
import Inside from '@/components/Inside';
import Roadmap from '@/components/Roadmap';
import Faq from '@/components/Faq';

import Waitlist from '@/components/Waitlist';
import Footer from '@/components/Footer';
import Reveal from '@/components/Reveal';

export default function Page() {
  return (
    <>
      <BrandMark />
      <Nav />
      <main>
        <Hero />
        <ProofStrip />
        <Problem />
        <HowItWorks />
        <Piece />
        <ForAI />
        <Inside />
        <Roadmap />
        <Faq />
        <Waitlist />
        <Footer />
      </main>
      {/* Scroll-reveal + step stagger observers, applied to the whole document */}
      <Reveal />
    </>
  );
}
