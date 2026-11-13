import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowDown, ShieldCheck, Sparkles } from 'lucide-react';
import ProfileCard, { LinkedInShowcaseProfile } from './ProfileCard';

const DEMO_PROFILES: LinkedInShowcaseProfile[] = [
  {
    id: 'demo-navy',
    name: 'Anwar Haddad',
    headline: 'Executive Navy · Glass Office Bokeh',
    styleTag: 'Executive Navy',
    imageUrl: '/examples/linkedin-executive-navy.png',
    isActive: true,
    isVerified: true,
    isAiDemo: true,
  },
  {
    id: 'demo-charcoal',
    name: 'Anwar Haddad',
    headline: 'AI Systems Architect · Founder Editorial',
    styleTag: 'Charcoal Founder',
    imageUrl: '/examples/linkedin-charcoal-founder.png',
    isActive: true,
    isVerified: true,
    isAiDemo: true,
  },
  {
    id: 'demo-daylight',
    name: 'Anwar Haddad',
    headline: 'Daylight Consultant · Slate Oxford',
    styleTag: 'Daylight Studio',
    imageUrl: '/examples/linkedin-daylight-consultant.png',
    isActive: true,
    isVerified: true,
    isAiDemo: true,
  },
];

interface InteractiveGalleryProps {
  onStartStudio: () => void;
}

export default function InteractiveGallery({ onStartStudio }: InteractiveGalleryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const scrollRange = [0, 140];

  const centerScale = useTransform(scrollY, scrollRange, [1, 1.04]);
  const centerY = useTransform(scrollY, scrollRange, [0, -12]);

  const leftX = useTransform(scrollY, scrollRange, ['-32%', '-58%']);
  const leftRotate = useTransform(scrollY, scrollRange, [-4, -8]);
  const leftScale = useTransform(scrollY, scrollRange, [0.92, 0.96]);

  const rightX = useTransform(scrollY, scrollRange, ['32%', '58%']);
  const rightRotate = useTransform(scrollY, scrollRange, [4, 8]);
  const rightScale = useTransform(scrollY, scrollRange, [0.92, 0.96]);

  return (
    <section
      ref={containerRef}
      className="relative bg-gradient-to-b from-[#FFFFFF] via-[#F8FAFC] to-[#F3F2EF] w-full overflow-hidden flex flex-col items-center pt-8 pb-14 border-b border-[#E0DFDC]"
    >
      {/* Subtle LinkedIn blue ambient glow */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[620px] h-[280px] bg-[#0A66C2]/8 rounded-full blur-3xl pointer-events-none" />

      {/* Pill Header */}
      <div className="relative z-10 text-center px-4 max-w-3xl mx-auto mb-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EDF3F8] border border-[#0A66C2]/20 text-[#0A66C2] text-xs font-bold mb-4">
          <ShieldCheck className="w-4 h-4" />
          <span>LinkedIn-Calibrated Portrait Studio · Deterministic & AI Ready</span>
        </div>
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-[#1D2226] tracking-tight leading-[1.08]">
          Studio-Grade{' '}
          <span className="text-[#0A66C2]">LinkedIn Headshots</span>
          <br className="hidden sm:inline" /> Built for Real Profiles
        </h1>
        <p className="mt-3 text-sm sm:text-base text-[#5E6B73] max-w-2xl mx-auto leading-relaxed">
          Upload one verified selfie, unlock your <code className="font-mono text-xs bg-white px-1.5 py-0.5 rounded border border-[#E0DFDC]">isActive</code> profile, and generate crisp 800×800 circular-safe executive portraits in seconds.
        </p>
      </div>

      {/* Interactive 3-Card Showcase */}
      <div className="relative w-full max-w-[1100px] h-[270px] sm:h-[340px] md:h-[430px] flex items-center justify-center perspective-[1000px] px-4">
        <motion.div
          style={{ x: leftX, rotate: leftRotate, scale: leftScale, zIndex: 10 }}
          className="absolute w-[165px] sm:w-[220px] md:w-[290px] aspect-[3/4] origin-bottom-right"
        >
          <ProfileCard profile={DEMO_PROFILES[0]} />
        </motion.div>

        <motion.div
          style={{ x: rightX, rotate: rightRotate, scale: rightScale, zIndex: 10 }}
          className="absolute w-[165px] sm:w-[220px] md:w-[290px] aspect-[3/4] origin-bottom-left"
        >
          <ProfileCard profile={DEMO_PROFILES[2]} />
        </motion.div>

        <motion.div
          style={{ scale: centerScale, y: centerY, zIndex: 20 }}
          className="relative w-[175px] sm:w-[235px] md:w-[305px] aspect-[3/4]"
        >
          <ProfileCard profile={DEMO_PROFILES[1]} />
        </motion.div>
      </div>

      {/* Primary CTA */}
      <div className="mt-8 z-10 flex flex-wrap items-center justify-center gap-3 px-4">
        <button
          type="button"
          onClick={onStartStudio}
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#0A66C2] hover:bg-[#004182] text-white font-bold text-sm sm:text-base shadow-[0_8px_24px_-6px_rgba(10,102,194,0.45)] transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          Open Portrait Studio
          <ArrowDown className="w-4 h-4" />
        </button>
        <span className="text-xs font-medium text-[#5E6B73]">
          Cards above show AI-generated demo examples from a single reference selfie
        </span>
      </div>
    </section>
  );
}
