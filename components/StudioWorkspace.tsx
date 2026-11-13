import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  CreditCard,
  Download,
  FileWarning,
  Image as ImageIcon,
  Lock,
  Mail,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  Upload,
  Zap,
} from 'lucide-react';
import { ApiClientError, api } from '../src/lib/api';
import { validateImageFileClient } from '../src/lib/validation';
import type {
  CheckoutReceipt,
  CheckoutSession,
  Generation,
  Pack,
  PackId,
  Profile,
  StylePreset,
  UploadRecord,
} from '../src/types';

interface StudioWorkspaceProps {
  activeProfile: Profile | null;
  packs: Pack[];
  styles: StylePreset[];
  generations: Generation[];
  onProfileUpdated: (profile: Profile) => void;
  onToggleActive: (nextActive: boolean) => Promise<void>;
  onGenerationsAdded: (items: Generation[]) => void;
  onGenerationPublished: (updated: Generation) => void;
  checkoutSectionRef: React.RefObject<HTMLDivElement | null>;
}

export default function StudioWorkspace({
  activeProfile,
  packs,
  styles,
  generations,
  onProfileUpdated,
  onToggleActive,
  onGenerationsAdded,
  onGenerationPublished,
  checkoutSectionRef,
}: StudioWorkspaceProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadRecord, setUploadRecord] = useState<UploadRecord | null>(null);
  const [uploadError, setUploadError] = useState<string>('');
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string>('');

  const [selectedStyles, setSelectedStyles] = useState<string[]>([
    'executive_navy',
    'charcoal_founder',
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string>('');
  const [publishBusyId, setPublishBusyId] = useState<string | null>(null);
  const [publishNotice, setPublishNotice] = useState<string>('');

  const [selectedPackId, setSelectedPackId] = useState<PackId>('pro');
  const [email, setEmail] = useState<string>('anwar@matchready.studio');
  const [checkoutError, setCheckoutError] = useState<string>('');
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [pendingSession, setPendingSession] = useState<CheckoutSession | null>(null);
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [receipt, setReceipt] = useState<CheckoutReceipt | null>(null);

  const isActive = activeProfile?.isActive ?? false;

  const processUploadFile = async (file: File) => {
    if (!activeProfile) return;
    setUploadError('');
    setUploadSuccessMsg('');

    const clientCheck = await validateImageFileClient(file);
    if (!clientCheck.valid) {
      setUploadError(`${clientCheck.code}: ${clientCheck.message}`);
      return;
    }

    setIsUploading(true);
    try {
      const uploaded = await api.uploadPortrait(activeProfile.id, file);
      setUploadRecord(uploaded);
      setUploadSuccessMsg(
        `Verified ${uploaded.mimeType.replace('image/', '').toUpperCase()} (${uploaded.width}×${uploaded.height}px) · Magic bytes & SHA-256 confirmed`
      );
    } catch (err) {
      if (err instanceof ApiClientError) {
        setUploadError(`${err.code} (HTTP ${err.status}): ${err.message}`);
      } else {
        setUploadError('Failed to upload image.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void processUploadFile(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void processUploadFile(file);
    }
  };

  const handleLoadDemoPortrait = async () => {
    setUploadError('');
    try {
      const res = await fetch('/examples/demo-input.png');
      const blob = await res.blob();
      const demoFile = new File([blob], 'anwar-demo-input.png', { type: 'image/png' });
      await processUploadFile(demoFile);
    } catch {
      setUploadError('Could not load demo portrait asset.');
    }
  };

  const toggleStyle = (styleId: string) => {
    setGenError('');
    setSelectedStyles((prev) =>
      prev.includes(styleId) ? prev.filter((id) => id !== styleId) : [...prev, styleId]
    );
  };

  const handleGeneratePortraits = async () => {
    if (!activeProfile) return;
    setGenError('');

    if (!uploadRecord) {
      setGenError('Upload a verified JPEG, PNG, or WebP portrait (or load the demo portrait) first.');
      return;
    }
    if (selectedStyles.length === 0) {
      setGenError('Select at least one LinkedIn studio style preset.');
      return;
    }

    setIsGenerating(true);
    try {
      const resp = await api.generatePortraits({
        profileId: activeProfile.id,
        uploadId: uploadRecord.id,
        styles: selectedStyles,
        provider: 'auto',
      });
      onProfileUpdated({ ...activeProfile, credits: resp.creditsRemaining });
      onGenerationsAdded(resp.generations);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setGenError(`${err.code} (HTTP ${err.status}): ${err.message}`);
      } else {
        setGenError('Portrait generation failed.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublishPortrait = async (genId: string) => {
    setGenError('');
    setPublishNotice('');
    setPublishBusyId(genId);
    try {
      const resp = await api.publishPortrait(genId);
      onProfileUpdated(resp.profile);
      onGenerationPublished(resp.publishedGeneration);
      setPublishNotice(`Published ${resp.publishedGeneration.styleLabel} to your LinkedIn profile card.`);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setGenError(`${err.code} (HTTP ${err.status}): ${err.message}`);
      } else {
        setGenError('Could not publish portrait.');
      }
    } finally {
      setPublishBusyId(null);
    }
  };

  const handleCreateCheckoutSession = async () => {
    if (!activeProfile) return;
    setCheckoutError('');
    setReceipt(null);

    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setCheckoutError('Enter a valid billing email address.');
      return;
    }

    setIsCreatingSession(true);
    try {
      const session = await api.createCheckoutSession({
        profileId: activeProfile.id,
        packId: selectedPackId,
        email: trimmed,
      });
      setPendingSession(session);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setCheckoutError(`${err.code}: ${err.message}`);
      } else {
        setCheckoutError('Unable to initiate checkout session.');
      }
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!pendingSession || !activeProfile) return;
    setCheckoutError('');
    setIsConfirmingPayment(true);
    try {
      const res = await api.confirmCheckout({
        sessionId: pendingSession.sessionId,
        paymentToken: 'tok_demo_visa_4242',
      });
      setReceipt(res);
      setPendingSession((prev) =>
        prev ? { ...prev, status: 'confirmed', receiptId: res.receiptId } : null
      );
      onProfileUpdated({ ...activeProfile, credits: res.creditsBalance });
    } catch (err) {
      if (err instanceof ApiClientError) {
        setCheckoutError(`${err.code}: ${err.message}`);
      } else {
        setCheckoutError('Payment confirmation failed.');
      }
    } finally {
      setIsConfirmingPayment(false);
    }
  };

  const publishedGen =
    generations.find((g) => g.isPublished) ||
    generations.find((g) => g.id === activeProfile?.publishedGenerationId) ||
    null;

  return (
    <section id="studio-workspace" className="py-10 pb-20 px-4 sm:px-6 bg-[#F3F2EF]">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Profile Activation Status Gate Banner */}
        {activeProfile && (
          <div
            data-testid="profile-gate-banner"
            className={`rounded-2xl border p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm ${
              isActive
                ? 'bg-white border-[#E0DFDC]'
                : 'bg-[#FFF4F2] border-[#B24020]/35'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  isActive ? 'bg-[#E6F4EA] text-[#057642]' : 'bg-[#FCE8E6] text-[#B24020]'
                }`}
              >
                {isActive ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base sm:text-lg font-extrabold text-[#1D2226]">
                    {activeProfile.fullName}
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      isActive
                        ? 'bg-[#E6F4EA] text-[#057642]'
                        : 'bg-[#FCE8E6] text-[#B24020]'
                    }`}
                  >
                    isActive: {isActive ? 'true' : 'false'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EDF3F8] text-[#0A66C2]">
                    {activeProfile.credits} Credits Available
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#5E6B73] mt-0.5">
                  {isActive
                    ? `${activeProfile.headline} · Portrait generation and LinkedIn publishing are unlocked.`
                    : 'Profile is inactive (isActive = false). Portrait generation and LinkedIn publishing are blocked with HTTP 403 until activated.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void onToggleActive(!isActive)}
              data-testid="banner-toggle-active"
              className={`px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-colors shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-[#F3F2EF] hover:bg-[#E8E6E1] text-[#1D2226] border border-[#D9D7D2]'
                  : 'bg-[#0A66C2] hover:bg-[#004182] text-white shadow-sm'
              }`}
            >
              {isActive ? 'Deactivate Profile (Test 403 Gate)' : 'Activate Profile Now'}
            </button>
          </div>
        )}

        {/* 3-Column Studio Workflow */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* STEP 1: Validated Upload */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-[#E0DFDC] shadow-sm p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-full bg-[#0A66C2] text-white text-xs font-extrabold flex items-center justify-center">
                  1
                </span>
                <h3 className="text-lg font-extrabold text-[#1D2226]">Upload Portrait</h3>
              </div>
              <span className="text-[11px] font-semibold text-[#5E6B73]">JPEG · PNG · WebP</span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              data-testid="portrait-file-input"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              onChange={handleFileInputChange}
              className="hidden"
            />

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`rounded-xl border-2 border-dashed p-5 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-[#0A66C2] bg-[#EDF3F8]'
                  : 'border-[#D0CEC9] bg-[#FAF9F7] hover:border-[#0A66C2]/60 hover:bg-[#EDF3F8]/40'
              }`}
            >
              {uploadRecord ? (
                <div className="space-y-3">
                  <div className="relative w-32 h-32 mx-auto rounded-xl overflow-hidden border border-[#E0DFDC] shadow-sm">
                    <img
                      src={uploadRecord.previewUrl}
                      alt={uploadRecord.filename}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-xs font-bold text-[#1D2226] truncate">
                    {uploadRecord.filename}
                  </div>
                  <p className="text-[11px] text-[#057642] font-semibold">
                    Click to replace photo
                  </p>
                </div>
              ) : (
                <div className="py-4 flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-[#EDF3F8] text-[#0A66C2] flex items-center justify-center mb-3">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-bold text-[#1D2226]">
                    {isUploading ? 'Validating magic bytes…' : 'Drop portrait or click to browse'}
                  </p>
                  <p className="text-xs text-[#5E6B73] mt-1">
                    Strict MIME, magic-byte &amp; 10 MB limit enforced
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => void handleLoadDemoPortrait()}
              data-testid="load-demo-portrait"
              className="mt-3 w-full py-2.5 px-4 rounded-xl border border-[#0A66C2]/30 bg-[#EDF3F8] hover:bg-[#dfe9f3] text-[#0A66C2] text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <ImageIcon className="w-4 h-4" />
              Use Anwar Demo Selfie (/examples/demo-input.png)
            </button>

            {uploadSuccessMsg && (
              <div
                data-testid="upload-success"
                className="mt-3 p-3 rounded-xl bg-[#E6F4EA] border border-[#057642]/20 text-[#057642] text-xs font-medium flex items-start gap-2"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{uploadSuccessMsg}</span>
              </div>
            )}

            {uploadError && (
              <div
                role="alert"
                data-testid="upload-error"
                className="mt-3 p-3 rounded-xl bg-[#FFF4F2] border border-[#B24020]/25 text-[#B24020] text-xs font-medium flex items-start gap-2"
              >
                <FileWarning className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>

          {/* STEP 2: Style Selection & Generate */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-[#E0DFDC] shadow-sm p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-full bg-[#0A66C2] text-white text-xs font-extrabold flex items-center justify-center">
                  2
                </span>
                <h3 className="text-lg font-extrabold text-[#1D2226]">Studio Styles</h3>
              </div>
              <span className="text-xs font-bold text-[#0A66C2]">
                {selectedStyles.length} credit{selectedStyles.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="space-y-2.5">
              {styles.map((style) => {
                const selected = selectedStyles.includes(style.id);
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => toggleStyle(style.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${
                      selected
                        ? 'border-[#0A66C2] bg-[#EDF3F8]/60 shadow-xs'
                        : 'border-[#E0DFDC] bg-white hover:bg-[#FAF9F7]'
                    }`}
                  >
                    <span
                      className="w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5"
                      style={{
                        borderColor: selected ? '#0A66C2' : '#C5C2BC',
                        backgroundColor: selected ? '#0A66C2' : '#FFFFFF',
                      }}
                    >
                      {selected && <Check className="w-3.5 h-3.5 text-white" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-[#1D2226] truncate">
                          {style.label}
                        </span>
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/15 shrink-0"
                          style={{ backgroundColor: style.backdropHex }}
                        />
                      </div>
                      <p className="text-xs text-[#5E6B73] mt-0.5">{style.subtitle}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {genError && (
              <div
                role="alert"
                data-testid="generation-error"
                className="mt-4 p-3 rounded-xl bg-[#FFF4F2] border border-[#B24020]/25 text-[#B24020] text-xs font-medium flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{genError}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => void handleGeneratePortraits()}
              disabled={isGenerating}
              data-testid="generate-portraits-btn"
              className={`mt-5 w-full py-3.5 px-5 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#0A66C2] hover:bg-[#004182] text-white shadow-md'
                  : 'bg-[#E8E6E1] text-[#5E6B73] hover:bg-[#dedbd4]'
              }`}
            >
              {isActive ? <Sparkles className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              {isGenerating
                ? 'Rendering Studio Portraits…'
                : isActive
                  ? `Generate ${selectedStyles.length} Portrait${selectedStyles.length === 1 ? '' : 's'}`
                  : 'Generate Blocked (Profile Inactive)'}
            </button>
          </div>

          {/* STEP 3: Checkout & Credits */}
          <div
            ref={checkoutSectionRef}
            id="checkout-section"
            className="lg:col-span-4 bg-white rounded-2xl border border-[#E0DFDC] shadow-sm p-6 flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-full bg-[#0A66C2] text-white text-xs font-extrabold flex items-center justify-center">
                  3
                </span>
                <h3 className="text-lg font-extrabold text-[#1D2226]">Credits &amp; Checkout</h3>
              </div>
              <span className="text-xs font-semibold text-[#5E6B73]">Idempotent API</span>
            </div>

            <div className="space-y-2.5">
              {packs.map((pack) => {
                const selected = selectedPackId === pack.id;
                return (
                  <button
                    key={pack.id}
                    type="button"
                    onClick={() => setSelectedPackId(pack.id)}
                    data-testid={`pack-card-${pack.id}`}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all relative cursor-pointer ${
                      selected
                        ? 'border-[#0A66C2] bg-[#EDF3F8]/60 ring-1 ring-[#0A66C2]'
                        : 'border-[#E0DFDC] bg-white hover:bg-[#FAF9F7]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-[#1D2226]">{pack.name}</span>
                          {pack.badge && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0A66C2] text-white">
                              {pack.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#5E6B73] mt-0.5">
                          <strong className="text-[#1D2226]">{pack.credits}</strong> HD Portraits ·{' '}
                          {pack.description}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-lg font-extrabold text-[#1D2226]">
                          ${pack.priceUsd}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-[#5E6B73] mb-1.5">
                Receipt Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#5E6B73] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full rounded-xl border border-[#D0CEC9] bg-[#FAF9F7] pl-10 pr-3.5 py-2.5 text-sm text-[#1D2226] focus:outline-none focus:border-[#0A66C2] focus:bg-white"
                />
              </div>
            </div>

            {checkoutError && (
              <div
                role="alert"
                className="mt-3 p-3 rounded-xl bg-[#FFF4F2] border border-[#B24020]/25 text-[#B24020] text-xs font-medium"
              >
                {checkoutError}
              </div>
            )}

            <button
              type="button"
              onClick={() => void handleCreateCheckoutSession()}
              disabled={isCreatingSession}
              data-testid="create-checkout-btn"
              className="mt-4 w-full py-3 px-5 rounded-full bg-[#0A66C2] hover:bg-[#004182] text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              {isCreatingSession ? 'Creating Session…' : 'Create Checkout Session'}
            </button>

            {pendingSession && (
              <div
                data-testid="checkout-session-box"
                className="mt-4 p-4 rounded-xl bg-[#F8FAFC] border border-[#0A66C2]/25 space-y-2.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#1D2226]">{pendingSession.packName}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                      pendingSession.status === 'confirmed'
                        ? 'bg-[#E6F4EA] text-[#057642]'
                        : 'bg-[#EDF3F8] text-[#0A66C2]'
                    }`}
                  >
                    {pendingSession.status}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-[#5E6B73] break-all">
                  Session: {pendingSession.sessionId}
                </p>

                <button
                  type="button"
                  onClick={() => void handleConfirmPayment()}
                  disabled={isConfirmingPayment}
                  data-testid="confirm-payment-btn"
                  className="w-full py-2.5 px-4 rounded-lg bg-[#057642] hover:bg-[#045d34] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {pendingSession.status === 'confirmed' ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      Replay Confirm (Idempotency Check)
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      {isConfirmingPayment
                        ? 'Confirming…'
                        : `Confirm $${(pendingSession.amountCents / 100).toFixed(0)} & Add +${pendingSession.creditsGranted} Credits`}
                    </>
                  )}
                </button>
              </div>
            )}

            {receipt && (
              <div
                data-testid="checkout-receipt"
                className="mt-3 p-3.5 rounded-xl bg-[#E6F4EA] border border-[#057642]/25 text-xs text-[#1D2226] space-y-1"
              >
                <div className="flex items-center justify-between font-bold text-[#057642]">
                  <span>Receipt {receipt.receiptId}</span>
                  <span>{receipt.idempotentReplay ? 'Idempotent Replay (0 added)' : `+${receipt.creditsAdded} Credits Added`}</span>
                </div>
                <p className="text-[11px] text-[#5E6B73]">
                  Updated balance: <strong>{receipt.creditsBalance} credits</strong>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Live LinkedIn Profile Preview & Generated Portraits */}
        <div className="bg-white rounded-2xl border border-[#E0DFDC] shadow-sm p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#E0DFDC]">
            <div>
              <h3 className="text-xl font-extrabold text-[#1D2226]">
                Generated Studio Portraits &amp; LinkedIn Profile Preview
              </h3>
              <p className="text-xs sm:text-sm text-[#5E6B73] mt-0.5">
                Each generation exports a 3:4 portrait and an 800×800 circular-safe LinkedIn avatar.
              </p>
            </div>
            {publishNotice && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E6F4EA] text-[#057642] text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                {publishNotice}
              </span>
            )}
          </div>

          {/* LinkedIn Mock Profile Card */}
          {activeProfile && (
            <div className="mt-6 rounded-2xl border border-[#E0DFDC] overflow-hidden bg-white max-w-2xl">
              <div className="h-20 bg-gradient-to-r from-[#0A66C2] via-[#277BC0] to-[#004182]" />
              <div className="px-5 pb-5">
                <div className="-mt-10 flex items-end justify-between gap-4">
                  <div className="w-20 h-20 rounded-full border-4 border-white bg-[#EDF3F8] overflow-hidden shadow-md">
                    <img
                      src={
                        publishedGen?.squareAvatarUrl ||
                        generations[0]?.squareAvatarUrl ||
                        '/examples/linkedin-executive-navy.png'
                      }
                      alt={activeProfile.fullName}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      isActive
                        ? 'bg-[#E6F4EA] text-[#057642]'
                        : 'bg-[#FFF4F2] text-[#B24020]'
                    }`}
                  >
                    {publishedGen
                      ? `Published: ${publishedGen.styleLabel}`
                      : 'Demo Avatar Preview'}
                  </span>
                </div>
                <div className="mt-3">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-lg font-extrabold text-[#1D2226]">
                      {activeProfile.fullName}
                    </h4>
                    <CheckCircle2 className="w-4 h-4 text-white fill-[#0A66C2]" />
                  </div>
                  <p className="text-xs sm:text-sm text-[#5E6B73]">{activeProfile.headline}</p>
                </div>
              </div>
            </div>
          )}

          {/* Generations Grid */}
          {generations.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-[#D0CEC9] bg-[#FAF9F7] p-8 text-center">
              <Star className="w-8 h-8 text-[#0A66C2] mx-auto mb-2 opacity-80" />
              <p className="text-sm font-bold text-[#1D2226]">
                No custom portraits generated yet for this profile
              </p>
              <p className="text-xs text-[#5E6B73] mt-1">
                Click &ldquo;Use Anwar Demo Selfie&rdquo; in Step 1 and generate portraits in Step 2 to see live output.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {generations.map((gen) => (
                <div
                  key={gen.id}
                  data-testid={`generation-card-${gen.id}`}
                  className="rounded-2xl border border-[#E0DFDC] bg-white overflow-hidden shadow-xs flex flex-col"
                >
                  <div className="relative aspect-[3/4] bg-[#EDF3F8]">
                    <img
                      src={gen.imageUrl}
                      alt={gen.styleLabel}
                      className="w-full h-full object-cover object-top"
                    />
                    <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-white/90 text-[#1D2226] text-[10px] font-bold">
                      {gen.processingMs.toFixed(0)} ms
                    </span>
                    {gen.isPublished && (
                      <span className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-[#057642] text-white text-[10px] font-bold">
                        Live on Profile
                      </span>
                    )}
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-extrabold text-[#1D2226]">{gen.styleLabel}</h4>
                      <p className="text-[11px] font-mono text-[#5E6B73] mt-0.5">
                        {gen.provider} · {gen.width}×{gen.height}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={gen.squareAvatarUrl}
                        download={`matchready-${gen.styleId}-avatar.png`}
                        className="flex-1 py-2 px-3 rounded-lg border border-[#D0CEC9] hover:bg-[#F3F2EF] text-[#1D2226] text-xs font-bold flex items-center justify-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Avatar
                      </a>
                      <button
                        type="button"
                        onClick={() => void handlePublishPortrait(gen.id)}
                        disabled={publishBusyId === gen.id}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          gen.isPublished
                            ? 'bg-[#E6F4EA] text-[#057642]'
                            : 'bg-[#0A66C2] hover:bg-[#004182] text-white'
                        }`}
                      >
                        {gen.isPublished ? 'Published' : 'Publish'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
