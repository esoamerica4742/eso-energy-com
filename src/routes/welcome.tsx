import React, { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, Activity, Zap, ArrowUpRight, Lock } from "lucide-react";

export const Route = createFileRoute("/welcome")({
  component: Welcome,
});

function Welcome() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleRequestAccess = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#0D0D0C] text-[#E5E5E0] font-sans antialiased selection:bg-[#D4AF37]/30 selection:text-white flex flex-col justify-between overflow-x-hidden relative">
      {/* Background Micro-Gradient Mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.07),transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(0,240,255,0.03),transparent_40%)] pointer-events-none" />

      {/* Top Obsidian Header Bar */}
      <header className="sticky top-0 z-40 bg-[#0D0D0C]/80 backdrop-blur-md border-b border-white/[0.04] px-5 py-4 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs font-mono tracking-[0.3em] text-[#D4AF37] uppercase font-bold">
            Eso Energy
          </span>
          <span className="text-[10px] text-zinc-500 font-mono tracking-wider">
            COMMAND DECK v2.6
          </span>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-white text-black font-semibold text-xs px-4 py-2 rounded-full border border-[#D4AF37]/40 shadow-[0_0_15px_rgba(212,175,55,0.15)] hover:shadow-[0_0_25px_rgba(212,175,55,0.3)] transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Request Access
        </button>
      </header>

      {/* Main Landing Viewport Container */}
      <main className="flex-1 px-5 pt-8 pb-24 flex flex-col justify-start z-10 max-w-md mx-auto w-full">
        {/* Hero Copywriting Typography */}
        <section className="space-y-3 mb-8">
          <p className="text-[10px] font-mono tracking-[0.4em] text-[#D4AF37]/80 uppercase">
            The Sovereign Infrastructure
          </p>
          <h1 className="text-4xl font-serif tracking-tight text-white font-medium leading-none">
            ESO ENERGY
          </h1>
          <p className="text-sm text-zinc-400 font-normal leading-relaxed pt-2">
            Africa's Premier B2B Architecture for Hybrid Solar-Grid Orchestration, Fuel Security,
            and Real-Time Asset Intelligence.
          </p>
        </section>

        {/* Cyber-Luxury Dashboard Graphic Core */}
        <section className="bg-gradient-to-b from-zinc-900/60 to-zinc-950/90 rounded-2xl border border-white/[0.06] p-5 shadow-2xl relative overflow-hidden backdrop-blur-sm space-y-5">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          {/* Real-time Solar Inverter Telemetry Module */}
          <div className="bg-black/40 rounded-xl p-4 border border-white/[0.03] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-[#00F0FF] animate-pulse" />
                <span className="text-xs font-mono text-zinc-300 tracking-wide uppercase">
                  Inverter Array telemetry
                </span>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-mono bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/20">
                LIVE FLOW
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-[10px] uppercase font-mono text-zinc-500 block">
                  Current Array Load
                </span>
                <span className="text-xl font-mono text-white font-bold tracking-tight">
                  420.5 <span className="text-xs text-zinc-400">kW</span>
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono text-zinc-500 block">
                  System Efficiency
                </span>
                <span className="text-xl font-mono text-[#00F0FF] font-bold tracking-tight">
                  98.4%
                </span>
              </div>
            </div>

            <div className="h-8 w-full opacity-60 bg-[linear-gradient(90deg,transparent_0%,rgba(0,240,255,0.05)_50%,transparent_100%)] relative flex items-end">
              <svg
                className="w-full h-6 text-[#00F0FF]"
                viewBox="0 0 100 20"
                preserveAspectRatio="none"
              >
                <path
                  d="M0,10 Q15,2 30,10 T60,10 T90,5 T100,10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
          </div>

          {/* Grid Balance & Token Recharge Module */}
          <div className="bg-black/40 rounded-xl p-4 border border-white/[0.03] space-y-3 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-[#D4AF37]" />
                <span className="text-xs font-mono text-zinc-300 tracking-wide uppercase">
                  Grid Balance Management
                </span>
              </div>
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-[10px] uppercase font-mono text-zinc-500 block">
                  Active Token Balance
                </span>
                <span className="text-2xl font-mono text-white tracking-tight font-semibold">
                  18,450.00 <span className="text-xs text-[#D4AF37]">MWh</span>
                </span>
              </div>
              <div className="text-right">
                <span className="text-[9px] uppercase font-mono text-[#39FF14] bg-[#39FF14]/10 border border-[#39FF14]/20 px-1.5 py-0.5 rounded">
                  CONNECTED
                </span>
              </div>
            </div>

            <div className="w-full bg-zinc-900/80 border border-white/[0.05] rounded-lg p-2.5 flex items-center justify-between text-zinc-500 text-xs font-mono">
              <span>Instant Credit Recharge</span>
              <ArrowUpRight className="w-4 h-4 opacity-40" />
            </div>
          </div>

          {/* Luxury Lock Barrier Overlay */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center transition-all duration-300 hover:backdrop-blur-[1px] hover:bg-black/40 group">
            <div className="bg-[#0D0D0C]/95 p-4 rounded-full border border-[#D4AF37]/40 shadow-[0_0_30px_rgba(0,0,0,0.9)] transform group-hover:scale-105 transition-transform duration-300">
              <Lock className="w-6 h-6 text-[#D4AF37]" />
            </div>
            <p className="text-xs font-mono tracking-widest text-[#D4AF37] uppercase mt-4 font-bold">
              Enterprise Access Only
            </p>
            <p className="text-[11px] text-zinc-400 max-w-[200px] mt-1">
              Please request architecture deployment clearance above.
            </p>
          </div>
        </section>
      </main>

      {/* Corporate Sign-Off Footer */}
      <footer className="w-full py-4 text-center border-t border-white/[0.02] bg-black/20 z-10">
        <p className="text-[9px] font-mono text-zinc-600 tracking-widest uppercase">
          © 2026 ESO ENERGY INFRASTRUCTURES LTD.
        </p>
      </footer>

      {/* Onboarding Input Modal Frame */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-[#121211] border border-[#D4AF37]/30 rounded-2xl max-w-sm w-full p-6 space-y-6 relative shadow-[0_0_50px_rgba(212,175,55,0.1)]">
            <div className="space-y-1">
              <h3 className="text-lg font-serif text-white tracking-wide">
                Request Architecture Deployment
              </h3>
              <p className="text-xs text-zinc-400">
                Submit your corporate telemetry metrics for platform provisioning.
              </p>
            </div>

            {!submitted ? (
              <form onSubmit={handleRequestAccess} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1">
                    Corporate Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full bg-zinc-950 border border-white/[0.08] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#D4AF37] text-white transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1">
                    Company Asset Scale
                  </label>
                  <input
                    type="text"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g., 50MW Solar Plant / Grid Utility"
                    className="w-full bg-zinc-950 border border-white/[0.08] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#D4AF37] text-white transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#D4AF37] text-black font-semibold rounded-xl py-3 text-xs tracking-wider uppercase shadow-lg transition-all duration-200 hover:bg-[#c49f27] disabled:opacity-50"
                >
                  {loading ? "Authenticating Gateway..." : "Submit Credentials"}
                </button>
              </form>
            ) : (
              <div className="py-6 flex flex-col items-center space-y-3 text-center">
                <div className="bg-[#39FF14]/10 p-3 rounded-full border border-[#39FF14]/30">
                  <ShieldCheck className="w-8 h-8 text-[#39FF14]" />
                </div>
                <h4 className="text-sm font-mono text-white uppercase tracking-wider">
                  Credentials Registered
                </h4>
                <p className="text-xs text-zinc-400 max-w-[240px]">
                  Our network engineering node will review your node capacity profile within 12
                  hours.
                </p>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setSubmitted(false);
                    setEmail("");
                    setCompany("");
                  }}
                  className="mt-4 text-xs text-zinc-500 underline underline-offset-4 hover:text-white"
                >
                  Return to Monitor Deck
                </button>
              </div>
            )}

            {!loading && (
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-white text-xs font-mono"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
