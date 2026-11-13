import React from 'react';
import { ArrowRight, CheckCircle2, Sparkles, UserCheck } from 'lucide-react';

const GENERATED_EXAMPLES = [
  {
    src: '/examples/linkedin-executive-navy.png',
    title: 'Executive Navy Studio',
    attire: 'Tailored Navy Blazer · Glass Office Bokeh',
  },
  {
    src: '/examples/linkedin-charcoal-founder.png',
    title: 'Charcoal Founder Editorial',
    attire: 'Charcoal Suit · Warm Neutral Studio',
  },
  {
    src: '/examples/linkedin-daylight-consultant.png',
    title: 'Daylight Consultant',
    attire: 'Slate Blazer · Bright Architectural Light',
  },
];

export default function BeforeAfterShowcase() {
  return (
    <section className="py-14 px-4 sm:px-6 bg-[#F3F2EF]">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl border border-[#E0DFDC] shadow-sm p-6 sm:p-10">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-6 border-b border-[#E0DFDC]">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#0A66C2] mb-2">
                <Sparkles className="w-3.5 h-3.5" /> Before & After Studio Pipeline
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-[#1D2226] tracking-tight">
                One Everyday Selfie → Three LinkedIn-Ready Portraits
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#5E6B73] max-w-md">
              Identity-preserving framing, studio key lighting, and depth-of-field bokeh calibrated for LinkedIn&apos;s circular avatar crop.
            </p>
          </div>

          {/* Comparison Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Input Card */}
            <div className="lg:col-span-4 flex flex-col items-center">
              <div className="w-full max-w-[260px] rounded-2xl border border-[#E0DFDC] bg-[#F8FAFC] p-3 shadow-sm">
                <div className="relative aspect-square rounded-xl overflow-hidden bg-[#E8E6E1]">
                  <img
                    src="/examples/demo-input.png"
                    alt="Original Reference Input Selfie"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-full bg-[#1D2226]/80 text-white text-[11px] font-semibold">
                    Original Input
                  </span>
                </div>
                <div className="mt-3 px-1">
                  <p className="text-sm font-bold text-[#1D2226]">Reference Upload</p>
                  <p className="text-xs text-[#5E6B73]">Unedited casual crop · Magic-byte verified PNG</p>
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className="lg:col-span-1 flex justify-center">
              <div className="w-11 h-11 rounded-full bg-[#EDF3F8] border border-[#0A66C2]/20 flex items-center justify-center text-[#0A66C2] rotate-90 lg:rotate-0">
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>

            {/* 3 AI-Generated Outputs */}
            <div className="lg:col-span-7">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {GENERATED_EXAMPLES.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-[#E0DFDC] bg-white p-2.5 shadow-sm hover:border-[#0A66C2]/50 transition-colors"
                  >
                    <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-[#EDF3F8]">
                      <img
                        src={item.src}
                        alt={item.title}
                        className="w-full h-full object-cover object-top"
                      />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white/90 text-[#0A66C2] text-[10px] font-bold border border-[#0A66C2]/15">
                        AI Demo Example
                      </span>
                    </div>
                    <div className="mt-2.5 px-1">
                      <p className="text-xs font-bold text-[#1D2226] truncate">{item.title}</p>
                      <p className="text-[11px] text-[#5E6B73] line-clamp-2 mt-0.5">{item.attire}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* LinkedIn Circular Preview Strip */}
              <div className="mt-5 rounded-xl border border-[#E0DFDC] bg-[#F8FAFC] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="relative w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-[#0A66C2] to-[#378FE9] shrink-0">
                    <img
                      src="/examples/linkedin-executive-navy.png"
                      alt="LinkedIn circular crop preview"
                      className="w-full h-full rounded-full object-cover object-top border-2 border-white"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-[#1D2226]">Anwar Haddad</span>
                      <CheckCircle2 className="w-4 h-4 text-white fill-[#0A66C2]" />
                    </div>
                    <p className="text-xs text-[#5E6B73]">
                      Circular 1:1 avatar framing preview · 800×800px studio export
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E6F4EA] text-[#057642] text-xs font-semibold shrink-0 self-start sm:self-center">
                  <UserCheck className="w-3.5 h-3.5" /> LinkedIn Crop Safe
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
