import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import ProfileCard, { Profile } from './ProfileCard';

const PROFILES: Profile[] = [
  {
    id: '1',
    name: 'Maya',
    age: 21,
    imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=987&auto=format&fit=crop',
    isActive: true,
    isVerified: true
  },
  {
    id: '2',
    name: 'Niki',
    age: 21,
    imageUrl: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?q=80&w=987&auto=format&fit=crop',
    isActive: true,
    isVerified: true
  },
  {
    id: '3',
    name: 'Sophie',
    age: 21,
    imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=987&auto=format&fit=crop',
    isActive: true,
    isVerified: true
  }
];

export default function InteractiveGallery() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Use global scroll to drive the animation immediately as page moves
  const { scrollY } = useScroll();

  // Animation Range: Complete expansion over the first 100px of scrolling
  // Reduced to make the reveal faster/snappier
  const scrollRange = [0, 100];

  // Center Card: Scales up slightly
  const centerScale = useTransform(scrollY, scrollRange, [1, 1.05]);
  const centerY = useTransform(scrollY, scrollRange, [0, -20]);
  
  // Left Card: Moves left and rotates
  // Adjusted: Uses percentage for responsive half-reveal (-55% of width)
  const leftX = useTransform(scrollY, scrollRange, ["0%", "-55%"]);
  const leftRotate = useTransform(scrollY, scrollRange, [0, -6]);
  const leftScale = useTransform(scrollY, scrollRange, [0.95, 1]);
  const leftOpacity = useTransform(scrollY, [0, 50], [0, 1]); // Fades in faster

  // Right Card: Moves right and rotates
  // Adjusted: Uses percentage for responsive half-reveal (55% of width)
  const rightX = useTransform(scrollY, scrollRange, ["0%", "55%"]);
  const rightRotate = useTransform(scrollY, scrollRange, [0, 6]);
  const rightScale = useTransform(scrollY, scrollRange, [0.95, 1]);
  const rightOpacity = useTransform(scrollY, [0, 50], [0, 1]); // Fades in faster

  // Text Fade: "3 Profiles Nearby" fades out immediately
  const textOpacity = useTransform(scrollY, [0, 50], [1, 0]);

  return (
    <div ref={containerRef} className="relative bg-black w-full overflow-hidden flex flex-col items-center pt-4 pb-12">
      
      {/* Cards Container - responsive height */}
      <div className="relative w-full max-w-[1200px] h-[300px] md:h-[530px] flex items-center justify-center perspective-[1000px]">
        
        {/* Left Card (Maya) */}
        <motion.div
          style={{ 
            x: leftX, 
            rotate: leftRotate,
            scale: leftScale,
            zIndex: 10,
            opacity: leftOpacity
          }}
          className="absolute w-[180px] md:w-[340px] aspect-[2/3] origin-bottom-right"
        >
          <ProfileCard profile={PROFILES[0]} />
        </motion.div>

        {/* Right Card (Sophie) */}
        <motion.div
          style={{ 
            x: rightX, 
            rotate: rightRotate,
            scale: rightScale,
            zIndex: 10,
            opacity: rightOpacity
          }}
          className="absolute w-[180px] md:w-[340px] aspect-[2/3] origin-bottom-left"
        >
          <ProfileCard profile={PROFILES[2]} />
        </motion.div>

        {/* Center Card (Niki) */}
        <motion.div
          style={{ 
            scale: centerScale,
            y: centerY,
            zIndex: 20
          }}
          className="relative w-[180px] md:w-[340px] aspect-[2/3]"
        >
          <ProfileCard profile={PROFILES[1]} className="" />
          
          
        </motion.div>

      </div>

      {/* Slogan */}
      <div className="mt-10 z-10 text-center px-4">
        <h2 className="text-4xl md:text-6xl font-extrabold text-white tracking-tighter">
          Look <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-500">Good</span> Get <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-500">Matches</span>
        </h2>
      </div>

    </div>
  );
}