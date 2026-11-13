import React from 'react';
import { CheckCircle2, Coins, Lock, ShieldCheck, Sparkles, Unlock } from 'lucide-react';
import type { Profile } from '../src/types';

interface HeaderNavProps {
  profiles: Profile[];
  activeProfile: Profile | null;
  activeProvider: string;
  onSelectProfile: (profileId: string) => void;
  onToggleActive: (nextActive: boolean) => void;
  isUpdatingStatus: boolean;
  onJumpToCheckout: () => void;
}

export default function HeaderNav({
  profiles,
  activeProfile,
  activeProvider,
  onSelectProfile,
  onToggleActive,
  isUpdatingStatus,
  onJumpToCheckout,
}: HeaderNavProps) {
  const isActive = activeProfile?.isActive ?? false;

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-[#E0DFDC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-[#0A66C2] flex items-center justify-center text-white font-extrabold text-sm tracking-tight shadow-sm shrink-0">
            in
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-display font-extrabold text-base sm:text-lg text-[#1D2226] tracking-tight truncate">
                MatchReady
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#EDF3F8] text-[#0A66C2] border border-[#0A66C2]/15">
                <Sparkles className="w-3 h-3" /> LinkedIn Studio
              </span>
            </div>
            <p className="hidden md:block text-[11px] text-[#5E6B73] truncate">
              AI Executive Headshots · Engine: <span className="font-mono">{activeProvider}</span>
            </p>
          </div>
        </div>

        {/* Profile Selector + isActive Gate + Credits */}
        <div className="flex items-center gap-2 sm:gap-3">
          {profiles.length > 0 && activeProfile && (
            <select
              aria-label="Select LinkedIn profile"
              value={activeProfile.id}
              onChange={(e) => onSelectProfile(e.target.value)}
              className="hidden lg:block text-xs font-semibold text-[#1D2226] bg-[#F3F2EF] border border-[#E0DFDC] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#0A66C2]"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} ({p.isActive ? 'Active' : 'Inactive'})
                </option>
              ))}
            </select>
          )}

          {activeProfile && (
            <button
              type="button"
              onClick={() => onToggleActive(!isActive)}
              disabled={isUpdatingStatus}
              data-testid="toggle-profile-active"
              title="Toggle isActive profile status gate"
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                isActive
                  ? 'bg-[#E6F4EA] text-[#057642] border-[#057642]/25 hover:bg-[#d8efe0]'
                  : 'bg-[#FFF4F2] text-[#B24020] border-[#B24020]/30 hover:bg-[#ffe8e3]'
              }`}
            >
              {isActive ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">Profile Active</span>
                  <span className="sm:hidden">Active</span>
                  <Unlock className="w-3 h-3 opacity-70 hidden md:inline" />
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">Profile Inactive (Locked)</span>
                  <span className="sm:hidden">Inactive</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onJumpToCheckout}
            data-testid="header-credits-pill"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#0A66C2] hover:bg-[#004182] text-white transition-colors shadow-sm cursor-pointer shrink-0"
          >
            <Coins className="w-3.5 h-3.5" />
            <span>{activeProfile?.credits ?? 0} Credits</span>
          </button>
        </div>
      </div>
    </header>
  );
}
