import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export interface Profile {
  id: string;
  name: string;
  age: number;
  imageUrl: string;
  isActive: boolean;
  isVerified: boolean;
  distance?: string;
}

interface ProfileCardProps {
  profile: Profile;
  className?: string;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ profile, className = '' }) => {
  return (
    <div 
      className={`relative w-full h-full rounded-xl overflow-hidden shadow-2xl bg-zinc-800 ${className}`}
      style={{
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)'
      }}
    >
      {/* Image */}
      <img 
        src={profile.imageUrl} 
        alt={profile.name}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      />

      {/* Gradient Overlay - Darker at bottom for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent via-60% to-black/90" />

      {/* Content */}
      <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6 flex flex-col gap-0.5 md:gap-1 z-10">
        
        {/* Name Row */}
        <div className="flex items-center gap-1.5 md:gap-2">
          <h2 className="text-xl md:text-3xl font-extrabold text-white tracking-tight drop-shadow-md flex items-center gap-1.5 md:gap-2">
            {profile.name} 
            <span className="font-normal">{profile.age}</span>
          </h2>
          {profile.isVerified && (
            <CheckCircle2 className="w-5 h-5 md:w-7 md:h-7 text-white fill-blue-500" />
          )}
        </div>

        {/* Status Row */}
        <div className="flex items-center gap-1.5 md:gap-2 mt-0.5">
          <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-[#4ADE80] border border-black/20" />
          <span className="text-xs md:text-lg font-medium text-white/95 tracking-wide">Recently Active</span>
        </div>
        
      </div>
      
      {/* Top Gradient for subtle depth */}
      <div className="absolute top-0 inset-x-0 h-20 md:h-32 bg-gradient-to-b from-black/20 to-transparent pointer-events-none" />
    </div>
  );
};

export default ProfileCard;