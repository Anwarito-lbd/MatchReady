import React, { useEffect, useRef, useState } from 'react';
import HeaderNav from './components/HeaderNav';
import InteractiveGallery from './components/InteractiveGallery';
import BeforeAfterShowcase from './components/BeforeAfterShowcase';
import StudioWorkspace from './components/StudioWorkspace';
import { api } from './src/lib/api';
import type { Generation, Pack, Profile, StylePreset } from './src/types';

export default function App() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('demo-anwar');
  const [packs, setPacks] = useState<Pack[]>([]);
  const [styles, setStyles] = useState<StylePreset[]>([]);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [activeProvider, setActiveProvider] = useState<string>('local-studio-deterministic');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const studioRef = useRef<HTMLDivElement>(null);
  const checkoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    async function bootstrap() {
      try {
        const [healthRes, profList, packList, styleList] = await Promise.all([
          api.health(),
          api.listProfiles(),
          api.listPacks(),
          api.listStyles(),
        ]);
        if (!active) return;
        setActiveProvider(healthRes.activeProvider);
        setProfiles(profList);
        setPacks(packList);
        setStyles(styleList);
        if (profList.length > 0 && !profList.some((p) => p.id === 'demo-anwar')) {
          setSelectedProfileId(profList[0].id);
        }
      } catch {
        // Fallback metadata for standalone preview if backend is starting
      }
    }
    void bootstrap();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedProfileId) return;
    let active = true;
    api
      .listGenerations(selectedProfileId)
      .then((items) => {
        if (active) setGenerations(items);
      })
      .catch(() => {
        if (active) setGenerations([]);
      });
    return () => {
      active = false;
    };
  }, [selectedProfileId]);

  const activeProfile =
    profiles.find((p) => p.id === selectedProfileId) ?? profiles[0] ?? null;

  const handleProfileUpdated = (updated: Profile) => {
    setProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleToggleActive = async (nextActive: boolean) => {
    if (!activeProfile) return;
    setIsUpdatingStatus(true);
    try {
      const updated = await api.updateProfileStatus(activeProfile.id, nextActive);
      handleProfileUpdated(updated);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const scrollToStudio = () => {
    studioRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToCheckout = () => {
    checkoutRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#F3F2EF] text-[#1D2226]">
      <HeaderNav
        profiles={profiles}
        activeProfile={activeProfile}
        activeProvider={activeProvider}
        onSelectProfile={setSelectedProfileId}
        onToggleActive={(next) => void handleToggleActive(next)}
        isUpdatingStatus={isUpdatingStatus}
        onJumpToCheckout={scrollToCheckout}
      />

      <main>
        <InteractiveGallery onStartStudio={scrollToStudio} />
        <BeforeAfterShowcase />
        <div ref={studioRef}>
          <StudioWorkspace
            activeProfile={activeProfile}
            packs={packs}
            styles={styles}
            generations={generations}
            onProfileUpdated={handleProfileUpdated}
            onToggleActive={handleToggleActive}
            onGenerationsAdded={(items) => setGenerations((prev) => [...items, ...prev])}
            onGenerationPublished={(updated) =>
              setGenerations((prev) =>
                prev.map((g) => ({
                  ...g,
                  isPublished: g.id === updated.id,
                }))
              )
            }
            checkoutSectionRef={checkoutRef}
          />
        </div>
      </main>

      <footer className="bg-white border-t border-[#E0DFDC] py-6 px-4 text-center text-xs text-[#5E6B73]">
        MatchReady LinkedIn Portrait Studio · Strictly validated uploads (MIME + Magic Bytes),
        idempotent credit checkout, and <code className="font-mono">isActive</code> profile gating.
      </footer>
    </div>
  );
}
