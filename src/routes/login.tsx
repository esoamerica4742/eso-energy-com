import React, { useState } from "react";

interface LoginState {
  corporateEmail: string;
}

export default function Login() {
  const [formData, setFormData] = useState<LoginState>({
    corporateEmail: "",
  });
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulated secure enterprise access token dispatch delay
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
    }, 1200);
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-6 bg-[#07080a] text-zinc-100 font-sans selection:bg-amber-500/30">
      {/* Import premium serif typography style explicitly for the brand mark */}
      <style>{`
        @import url('https://googleapis.com');
        .brand-logo-text { font-family: 'Cinzel', serif; }
      `}</style>

      {/* Core Luxury Form Card Container */}
      <div className="w-full max-w-lg p-10 rounded-3xl bg-gradient-to-b from-zinc-950 to-zinc-950/90 border border-zinc-900/60 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] relative overflow-hidden">
        
        {/* Ambient Floating Visual Backlighting Effect */}
        <div className="absolute -top-[100px] left-1/2 -translate-x-1/2 w-[300px] h-[150px] bg-gradient-to-b from-amber-500/10 to-transparent blur-3xl pointer-events-none" />

        {!isSubmitted ? (
          <>
            {/* Header Identity Layout Block */}
            <div className="text-center mb-10 relative z-10">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 shadow-inner mb-5">
                {/* Minimalist Grid Solar Array Vector Lockup */}
                <svg className="w-6 h-6 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="4" strokeWidth="2" />
                  <path strokeLinecap="round" strokeWidth="2" d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 18.36l1.42-1.42M18.36 4.22l1.42-1.42" />
                </svg>
              </div>
              <h1 className="brand-logo-text text-xl font-medium tracking-[0.3em] uppercase text-amber-500/90 mb-3">ESO ENERGY</h1>
              <h2 className="text-2xl font-light tracking-wide text-zinc-100 mb-2">Access Terminal</h2>
              <p className="text-zinc-500 text-xs tracking-wide max-w-sm mx-auto leading-relaxed">Enter your registered corporate credentials to unlock your live inverter tracking dashboard.</p>
            </div>

            {/* Interactive Functional Form */}
            <form className="space-y-6 relative z-10" onSubmit={handleLoginSubmit}>
              
              {/* Corporate Email Identity Target */}
              <div>
                <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-2">Authorized Corporate Email</label>
                <div className="relative group">
                  <input 
                    type="email" 
                    name="corporateEmail"
                    required
                    value={formData.corporateEmail}
                    onChange={handleInputChange}
                    placeholder="name@company.com" 
                    className="w-full px-5 py-3.5 rounded-xl bg-zinc-900/30 border border-zinc-800 text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 text-sm tracking-wide transition-all duration-300"
                  />
                  {/* Premium Input Accent Frame */}
                  <div className="absolute inset-0 rounded-xl pointer-events-none border border-transparent group-focus-within:border-amber-500/10 transition-colors duration-300" />
                </div>
              </div>

              {/* Passwordless Security Infrastructure Notice Flag */}
              <div className="p-4 rounded-xl bg-zinc-900/20 border border-zinc-900/60 flex items-start gap-3">
                <svg className="w-4 h-4 text-amber-500/70 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <p className="text-[11px] text-zinc-500 leading-normal tracking-wide">
                  <strong className="text-zinc-400 font-medium">Passwordless Gateway:</strong> A dynamic authentication token will be dispatched to this email terminal instantly. Click the link within to bypass permanent master passwords securely.
                </p>
              </div>

              {/* Action Call Button Assembly with Dynamic Loading States */}
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full mt-4 py-4 px-6 font-semibold text-xs text-zinc-950 tracking-[0.15em] uppercase bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 rounded-xl transition-all duration-300 shadow-[0_4px_30px_rgba(245,158,11,0.15)] hover:shadow-[0_4px_40px_rgba(245,158,11,0.3)] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? (
                  <svg className="animate-spin h-4 w-4 text-zinc-950" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  "AUTHENTICATE & LOG IN"
                )}
              </button>
            </form>

            {/* Bottom Alternative Options Placement Area */}
            <div className="mt-8 text-center text-xs text-zinc-600 relative z-10 tracking-wide">
              New deployment? <a href="#register" className="text-amber-500/80 hover:text-amber-400 font-medium transition-colors ml-1">Deploy New Workspace</a>
            </div>
          </>
        ) : (
          /* Dynamic Success Acknowledgment View Architecture */
          <div className="text-center py-10 animate-fade-in relative z-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 mb-6">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" stroke-width="1.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h2 className="text-2xl font-light tracking-wide text-zinc-100 mb-3">Gateway Token Dispatched</h2>
            <p className="text-zinc-400 text-sm max-w-xs mx-auto leading-relaxed mb-1">
              Your one-click login token has been securely routed to <span className="text-amber-500/90 font-medium">{formData.corporateEmail}</span>.
            </p>
            <p className="text-zinc-600 text-xs mt-4">Check your corporate inbox to unlock the monitoring node.</p>
          </div>
        )}
      </div>
    </div>
  );
}
