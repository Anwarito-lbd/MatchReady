import React, { useState, useRef } from 'react';
import InteractiveGallery from './components/InteractiveGallery';
import { Sparkles, CheckCircle2, Upload, Star, Check, Zap, Mail, Clock, X, AlertCircle, TrendingUp, ArrowRight } from 'lucide-react';

export default function App() {
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'pro'>('pro');
  const [isDragging, setIsDragging] = useState(false);
  const [email, setEmail] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const processFiles = (newFiles: File[]) => {
    setError(''); // Clear error on interaction
    const validFiles = newFiles.filter(file => file.type.startsWith('image/'));
    if (validFiles.length === 0) return;

    setFiles(prev => [...prev, ...validFiles]);
    
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) setError(''); // Clear error on interaction
  };

  const handleCheckout = () => {
    setError('');

    if (files.length < 3) {
      setError('Please upload at least 3 photos to proceed.');
      return;
    }

    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    // Proceed to checkout
    console.log('Checkout initiated:', { selectedPlan, email, fileCount: files.length });
  };

  return (
    <main className="bg-black min-h-screen text-white selection:bg-red-600 selection:text-white font-sans">
      <InteractiveGallery />
      
      {/* Real Results / Examples Section */}
      <section className="flex flex-col items-center justify-center bg-black px-6 py-16 border-t border-zinc-900 overflow-hidden relative">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-6xl w-full relative z-10">
             {/* Header */}
             <div className="text-center mb-12">
               <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-white uppercase leading-tight">
                 From Boring <br/>
                 <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-500">
                   To Match Ready
                 </span>
               </h2>
             </div>

             {/* Comparison Grid - Changed to md:grid-cols-2 to be horizontal on laptops */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 items-start relative">
                
                {/* Arrow (Desktop) - Centered absolutely relative to the grid container */}
                <div className="hidden md:flex flex-col items-center justify-center absolute left-1/2 top-[160px] -translate-x-1/2 z-40 pointer-events-none">
                    <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center shadow-2xl">
                        <ArrowRight className="w-5 h-5 text-zinc-500" />
                    </div>
                </div>

                {/* Inputs Side (Left) */}
                <div className="flex flex-col items-center">
                   <div className="mb-8 text-center">
                     <span className="text-white font-bold uppercase tracking-wider text-sm">Your Uploads</span>
                   </div>
                   
                   <div className="relative w-80 h-80 group cursor-default mb-8">
                      {/* Left Card */}
                      <div className="absolute top-6 left-0 w-48 h-64 bg-zinc-800 rounded-xl shadow-2xl transform -rotate-12 transition-transform duration-500 group-hover:-rotate-[20deg] group-hover:-translate-x-12 z-10 origin-bottom-right">
                        <img src="https://images.unsplash.com/photo-1595152452543-e5cca283f588?q=80&w=500&auto=format&fit=crop" className="w-full h-full object-cover rounded-xl opacity-60 grayscale-[50%] group-hover:grayscale-0 transition-all duration-500" alt="Selfie 1" />
                        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] font-medium uppercase tracking-wider text-white/80">Original</div>
                      </div>
                      
                      {/* Right Card */}
                      <div className="absolute top-6 right-0 w-48 h-64 bg-zinc-800 rounded-xl shadow-2xl transform rotate-12 transition-transform duration-500 group-hover:rotate-[20deg] group-hover:translate-x-12 z-10 origin-bottom-left">
                         <img src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=500&auto=format&fit=crop" className="w-full h-full object-cover rounded-xl opacity-80 grayscale-[30%] group-hover:grayscale-0 transition-all duration-500" alt="Selfie 2" />
                      </div>

                      {/* Center Card */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-64 bg-zinc-800 rounded-xl shadow-2xl transform transition-transform duration-500 group-hover:-translate-y-4 z-20">
                         <img src="https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=500&auto=format&fit=crop" className="w-full h-full object-cover rounded-xl" alt="Selfie 3" />
                      </div>
                   </div>

                   {/* Before Metric */}
                   <div className="mt-4 bg-zinc-900/50 rounded-2xl p-4 border border-zinc-800 w-64 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                          <TrendingUp className="w-6 h-6 text-zinc-600" />
                      </div>
                      <div>
                          <div className="text-3xl font-black text-zinc-500 leading-none">2</div>
                          <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mt-1">Matches / Week</div>
                      </div>
                   </div>
                </div>

                {/* Output Side (Right) - Results Stack */}
                <div className="flex flex-col items-center">
                   <div className="mb-8 text-center">
                     <span className="text-white font-bold uppercase tracking-wider text-sm">Results</span>
                   </div>

                   <div className="relative w-80 h-80 group cursor-default mb-8">
                      {/* Left Card */}
                      <div className="absolute top-6 left-0 w-48 h-64 bg-zinc-800 rounded-xl shadow-2xl transform -rotate-12 transition-transform duration-500 group-hover:-rotate-[20deg] group-hover:-translate-x-12 z-10 origin-bottom-right">
                        <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=500&auto=format&fit=crop" className="w-full h-full object-cover rounded-xl opacity-80 group-hover:opacity-100 transition-all duration-500" alt="Result 1" />
                      </div>
                      
                      {/* Right Card */}
                      <div className="absolute top-6 right-0 w-48 h-64 bg-zinc-800 rounded-xl shadow-2xl transform rotate-12 transition-transform duration-500 group-hover:rotate-[20deg] group-hover:translate-x-12 z-10 origin-bottom-left">
                         <img src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=500&auto=format&fit=crop" className="w-full h-full object-cover rounded-xl opacity-90 group-hover:opacity-100 transition-all duration-500" alt="Result 2" />
                      </div>

                      {/* Center Card */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-64 bg-zinc-900 rounded-xl shadow-[0_0_30px_rgba(220,38,38,0.4)] transform transition-transform duration-500 group-hover:-translate-y-4 z-20">
                         <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=500&auto=format&fit=crop" className="w-full h-full object-cover rounded-xl" alt="Result 3" />
                         
                         {/* Badge */}
                         <div className="absolute -bottom-3 -right-3 bg-red-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1 shadow-lg border border-red-400">
                             <CheckCircle2 className="w-3 h-3 fill-white text-red-600" />
                             MATCHREADY
                         </div>
                      </div>
                   </div>

                   {/* After Metric */}
                   <div className="mt-4 bg-gradient-to-br from-red-900/40 to-black rounded-2xl p-4 border border-red-500/50 w-64 flex items-center gap-4 shadow-[0_0_40px_-10px_rgba(220,38,38,0.4)] relative overflow-hidden group">
                      <div className="absolute inset-0 bg-red-600/5 group-hover:bg-red-600/10 transition-colors"></div>
                      <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center relative z-10 shadow-lg shadow-red-600/50">
                          <TrendingUp className="w-6 h-6 text-white" />
                      </div>
                      <div className="relative z-10">
                          <div className="text-4xl font-black text-white leading-none drop-shadow-[0_2px_10px_rgba(220,38,38,0.5)]">47+</div>
                          <div className="text-[10px] font-bold text-red-200 uppercase tracking-wider mt-1">Matches / Week</div>
                      </div>
                   </div>
                </div>

             </div>
        </div>
      </section>

      {/* Pricing & Upload Section - 3 Column Layout on Desktop */}
      <section className="py-16 px-4 md:px-6 bg-zinc-950 relative border-t border-zinc-900">
        <div className="max-w-7xl mx-auto">
            
            {/* Header */}
            <div className="text-center mb-12 space-y-4">
              <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter">Get Started</h2>
              <p className="text-zinc-400 text-lg max-w-xl mx-auto leading-relaxed">
                Upload 3+ images of yourself. <br/> We'll do the magic.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-8">
                
                {/* 1. Upload Area */}
                <div className="flex flex-col h-full">
                   <div className="mb-6 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center font-bold text-white text-sm">1</div>
                      <h3 className="text-xl font-bold text-white uppercase tracking-wide">Upload Photos</h3>
                   </div>
                   
                   <input 
                       type="file" 
                       ref={fileInputRef}
                       onChange={handleFileSelect}
                       className="hidden" 
                       multiple 
                       accept="image/*"
                   />

                   <div 
                     className={`flex-1 border-2 border-dashed rounded-3xl transition-all duration-300 flex flex-col items-center justify-center p-6 text-center group cursor-pointer bg-zinc-900/30 relative overflow-hidden min-h-[300px] ${isDragging ? 'border-red-500 bg-red-600/10' : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50'}`}
                     onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                     onDragLeave={() => setIsDragging(false)}
                     onDrop={handleDrop}
                     onClick={() => fileInputRef.current?.click()}
                   >
                       {files.length === 0 ? (
                           <>
                               <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center mb-6 shadow-xl border border-zinc-800 group-hover:border-red-500/50 group-hover:scale-110 transition-all duration-300">
                                  <Upload className="w-8 h-8 text-zinc-400 group-hover:text-red-500 transition-colors" />
                               </div>
                               
                               <h4 className="text-xl font-bold text-white mb-2">Drag & Drop photos</h4>
                               <p className="text-zinc-500 text-sm mb-8">or click to browse from device</p>

                               <div className="flex flex-wrap justify-center gap-2">
                                   <span className="px-3 py-1 bg-zinc-900 rounded-full text-[10px] font-bold text-zinc-400 border border-zinc-800">Clear Face</span>
                                   <span className="px-3 py-1 bg-zinc-900 rounded-full text-[10px] font-bold text-zinc-400 border border-zinc-800">Good Light</span>
                                   <span className="px-3 py-1 bg-zinc-900 rounded-full text-[10px] font-bold text-zinc-400 border border-zinc-800">No Sunglasses</span>
                               </div>
                           </>
                       ) : (
                           <div className="w-full h-full flex flex-col">
                               <div className="grid grid-cols-3 gap-2 w-full mb-4 auto-rows-fr">
                                   {previews.map((src, idx) => (
                                       <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group/item">
                                           <img src={src} alt="preview" className="w-full h-full object-cover" />
                                           <button 
                                             onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                                             className="absolute top-1 right-1 bg-black/50 hover:bg-red-500 p-1 rounded-full transition-colors backdrop-blur-sm"
                                           >
                                               <X className="w-3 h-3 text-white" />
                                           </button>
                                       </div>
                                   ))}
                                   <div className="aspect-square rounded-xl border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center text-zinc-500 hover:text-white hover:border-zinc-500 transition-colors">
                                        <Upload className="w-5 h-5 mb-1" />
                                        <span className="text-[10px] font-bold uppercase">Add</span>
                                   </div>
                               </div>
                               <p className="mt-auto text-xs text-zinc-500 font-medium">
                                   {files.length} images selected. Click to add more.
                               </p>
                           </div>
                       )}
                   </div>
                </div>

                {/* 2. Select Plan */}
                <div className="flex flex-col">
                    <div className="mb-6 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center font-bold text-white text-sm">2</div>
                      <h3 className="text-xl font-bold text-white uppercase tracking-wide">Select Plan</h3>
                   </div>

                   <div className="flex flex-col gap-4 flex-1">
                       
                       {/* Starter Plan */}
                       <div 
                         onClick={() => setSelectedPlan('starter')}
                         className={`relative rounded-2xl p-6 border-2 transition-all duration-300 cursor-pointer ${selectedPlan === 'starter' ? 'bg-zinc-900 border-white/50' : 'bg-zinc-900/30 border-zinc-800 hover:bg-zinc-900/50'}`}
                       >
                           <div className="flex justify-between items-start mb-4">
                               <div>
                                   <div className="text-zinc-400 font-bold text-sm uppercase tracking-wider mb-1">Starter</div>
                                   <div className="text-3xl font-black text-white">$19</div>
                               </div>
                               <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedPlan === 'starter' ? 'border-red-500 bg-red-600' : 'border-zinc-700'}`}>
                                   {selectedPlan === 'starter' && <Check className="w-4 h-4 text-white" />}
                               </div>
                           </div>
                           <div className="flex items-center gap-3 text-zinc-300 text-sm">
                               <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center"><Sparkles className="w-4 h-4" /></div>
                               <span><strong className="text-white">4</strong> MatchReady Photos</span>
                           </div>
                       </div>

                       {/* Pro Plan */}
                       <div 
                         onClick={() => setSelectedPlan('pro')}
                         className={`relative rounded-2xl p-6 border-2 transition-all duration-300 cursor-pointer ${selectedPlan === 'pro' ? 'bg-zinc-900 border-red-500 shadow-[0_0_40px_-10px_rgba(220,38,38,0.2)]' : 'bg-zinc-900/30 border-zinc-800 hover:bg-zinc-900/50'}`}
                       >
                           {/* Badge */}
                           <div className="absolute -top-3 left-6 bg-gradient-to-r from-red-600 to-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                               Most Popular
                           </div>

                           <div className="flex justify-between items-start mb-4 mt-2">
                               <div>
                                   <div className="text-red-400 font-bold text-sm uppercase tracking-wider mb-1 flex items-center gap-2">
                                       Pro Pack <Zap className="w-3 h-3 fill-red-400" />
                                   </div>
                                   <div className="text-3xl font-black text-white">$29</div>
                               </div>
                               <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedPlan === 'pro' ? 'border-red-500 bg-red-600' : 'border-zinc-700'}`}>
                                   {selectedPlan === 'pro' && <Check className="w-4 h-4 text-white" />}
                               </div>
                           </div>
                           <div className="flex items-center gap-3 text-zinc-300 text-sm">
                               <div className="w-8 h-8 rounded-lg bg-red-600/20 flex items-center justify-center text-red-400"><Star className="w-4 h-4 fill-red-400" /></div>
                               <span><strong className="text-white">8</strong> MatchReady Photos</span>
                           </div>
                       </div>

                   </div>
                </div>

                {/* 3. Checkout (Moved next to Plan on Desktop) */}
                <div className="flex flex-col md:col-span-2 lg:col-span-1 mt-8 md:mt-0">
                    <div className="mb-6 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center font-bold text-white text-sm">3</div>
                      <h3 className="text-xl font-bold text-white uppercase tracking-wide">Get Results</h3>
                   </div>

                   <div className="bg-zinc-900/50 rounded-3xl p-6 border border-zinc-800/50 backdrop-blur-sm h-full flex flex-col justify-center">
                      
                      {/* Info Text */}
                      <div className="flex items-start gap-3 mb-6 p-4 rounded-xl bg-red-600/10 border border-red-500/20">
                         <Clock className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                         <p className="text-sm text-red-200">
                            Receive your MatchReady photos via email in <strong className="text-white">less than 3 days</strong>.
                         </p>
                      </div>

                      {/* Email Input */}
                      <div className="relative mb-4 group">
                         <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5 group-focus-within:text-red-500 transition-colors" />
                         <input 
                           type="email" 
                           value={email}
                           onChange={handleEmailChange}
                           placeholder="Enter your email address"
                           className="w-full bg-black border-2 border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-500 transition-all font-medium"
                         />
                      </div>

                      {/* Error Message */}
                      {error && (
                        <div className="flex items-center gap-2 text-red-500 bg-red-600/10 p-3 rounded-xl mb-4 text-sm font-medium border border-red-500/20 animate-in slide-in-from-top-2 fade-in duration-300">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          {error}
                        </div>
                      )}

                      {/* Button */}
                      <button 
                        onClick={handleCheckout}
                        className="w-full bg-white hover:bg-zinc-200 text-black font-black text-xl py-5 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] shadow-[0_10px_40px_-10px_rgba(255,255,255,0.2)] flex items-center justify-center gap-3"
                      >
                          <Sparkles className="w-5 h-5" />
                          CHECKOUT
                      </button>

                      {/* Trust Indicators */}
                      <div className="mt-6 flex items-center justify-center gap-3 text-[10px] md:text-xs text-zinc-600 font-medium text-center">
                          <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Secure Payment</span>
                          <span>•</span>
                          <span>Fast Delivery</span>
                      </div>
                   </div>
                </div>
            </div>

        </div>
      </section>

    </main>
  );
}