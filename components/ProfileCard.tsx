import React from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';

export interface LinkedInShowcaseProfile {
  id: string;
  name: string;
  headline: string;
  styleTag: string;
  imageUrl: string;
  isActive: boolean;
  isVerified: boolean;
  isAiDemo: boolean;
}

interface ProfileCardProps {
  profile: LinkedInShowcaseProfile;
  className?: string;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ profile, className = '' }) => {
  return (
    <div
      className={`relative w-full h-full rounded-2xl overflow-hidden bg-white border border-[#E0DFDC] shadow-[0_20px_45px_-15px_rgba(10,102,194,0.22)] ${className}`}
    >
      <img
        src={profile.imageUrl}
        alt={`${profile.name} — ${profile.styleTag}`}
        className="absolute inset-0 w-full h-full object-cover object-top pointer-events-none"
      />

      {/* AI Demo Example transparency badge */}
      {profile.isAiDemo && (
        <div className="absolute top-3 left-3 z-10 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/92 backdrop-blur text-[10px] font-bold uppercase tracking-wider text-[#0A66C2] border border-[#0A66C2]/20 shadow-sm">
          <Sparkles className="w-2.5 h-2.5" />
          AI Demo Example
        </div>
      )}

      {/* Style preset tag */}
      <div className="absolute top-3 right-3 z-10 hidden sm:inline-flex px-2.5 py-1 rounded-full bg-[#1D2226]/75 backdrop-blur text-[10px] font-semibold text-white">
        {profile.styleTag}
      </div>

      {/* Bottom readability gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent via-55% to-[#0B192C]/92" />

      {/* Content */}
      <div className="absolute bottom-3.5 left-3.5 right-3.5 md:bottom-5 md:left-5 md:right-5 flex flex-col gap-1 z-10">
        <div className="flex items-center gap-1.5">
          <h3 className="text-base md:text-xl font-extrabold text-white tracking-tight drop-shadow-sm truncate">
            {profile.name}
          </h3>
          {profile.isVerified && (
            <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-white fill-[#0A66C2] shrink-0" />
          )}
        </div>
        <p className="text-[11px] md:text-xs text-white/85 font-medium line-clamp-1">
          {profile.headline}
        </p>

        <div className="flex items-center gap-1.5 mt-0.5">
          <span
            className={`w-2 h-2 rounded-full ${
              profile.isActive ? 'bg-[#4ADE80]' : 'bg-[#F59E0B]'
            }`}
          />
          <span className="text-[10px] md:text-xs font-semibold text-white/90">
            {profile.isActive ? 'isActive · Studio Ready' : 'Inactive Profile'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProfileCard;
