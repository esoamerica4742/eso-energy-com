import React from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Mail, MapPin, Phone, Sun } from "lucide-react";

const GOLD = "#FFD700";

export function LegalLayout({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen w-full text-white antialiased selection:bg-[#FFD700]/30"
      style={{
        background:
          "radial-gradient(1200px 600px at 80% -10%, rgba(255,215,0,0.08), transparent 60%), radial-gradient(900px 500px at -10% 30%, rgba(0,255,157,0.06), transparent 55%), #0A0A0A",
        fontFamily:
          '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Top Nav */}
      <header
        className="sticky top-0 z-40 backdrop-blur-xl border-b"
        style={{
          background: "rgba(10,10,10,0.75)",
          borderColor: "rgba(255,255,255,0.06)",
        }}
      >
        <div className="mx-auto max-w-7xl px-4 md:px-8 h-16 flex items-center justify-between">
          <Link to="/welcome" className="flex items-center gap-2.5 group">
            <span
              className="grid place-items-center h-9 w-9 rounded-lg border"
              style={{
                borderColor: "rgba(255,215,0,0.35)",
                background:
                  "linear-gradient(135deg, rgba(255,215,0,0.15), rgba(0,255,157,0.08))",
              }}
            >
              <Sun className="h-4 w-4" style={{ color: GOLD }} />
            </span>
            <div className="leading-tight">
              <p className="text-[12px] font-bold tracking-[0.18em]">
                ESO ENERGY TECH LIMITED
              </p>
              <p className="text-[9px] tracking-[0.32em] text-white/40 font-mono">
                RC · NIGERIA
              </p>
            </div>
          </Link>
          <Link
            to="/welcome"
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-mono uppercase tracking-[0.18em] border transition-colors hover:bg-white/5"
            style={{ borderColor: "rgba(255,215,0,0.35)", color: GOLD }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Title */}
      <section className="mx-auto max-w-4xl px-4 md:px-8 pt-14 pb-8">
        <p
          className="text-[10px] font-mono uppercase tracking-[0.32em] mb-3"
          style={{ color: GOLD }}
        >
          {eyebrow}
        </p>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight">{title}</h1>
        <p className="mt-3 text-sm text-white/50 font-mono">
          Last updated: {updated}
        </p>
      </section>

      {/* Body */}
      <main className="mx-auto max-w-4xl px-4 md:px-8 pb-20">
        <article
          className="rounded-2xl border p-6 md:p-10 space-y-8 text-[15px] leading-relaxed text-white/80"
          style={{
            borderColor: "rgba(255,255,255,0.08)",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
          }}
        >
          {children}
        </article>
      </main>

      {/* Footer */}
      <footer
        className="border-t"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div className="mx-auto max-w-7xl px-4 md:px-8 py-10 grid md:grid-cols-3 gap-6 text-sm text-white/70">
          <p className="flex items-start gap-2">
            <MapPin
              className="h-4 w-4 mt-0.5 shrink-0"
              style={{ color: GOLD }}
            />
            6 Uche Step by Step Street, off St. Christopher Road, Oyolu 33,
            Onitsha, Anambra, Nigeria.
          </p>
          <p className="flex items-center gap-2">
            <Phone className="h-4 w-4 shrink-0" style={{ color: GOLD }} />
            <a href="tel:+2348068670809" className="hover:text-white">
              +234 806 867 0809
            </a>
          </p>
          <p className="flex items-center gap-2">
            <Mail className="h-4 w-4 shrink-0" style={{ color: GOLD }} />
            <a href="mailto:info@eso-energy.com" className="hover:text-white">
              info@eso-energy.com
            </a>
          </p>
        </div>
        <div
          className="border-t py-5 text-center text-[11px] font-mono uppercase tracking-[0.2em] text-white/40"
          style={{ borderColor: "rgba(255,255,255,0.05)" }}
        >
          © {new Date().getFullYear()} ESO ENERGY TECH LIMITED · All rights reserved.
        </div>
      </footer>
    </div>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl md:text-2xl font-semibold text-white">{heading}</h2>
      <div className="space-y-3 text-white/75">{children}</div>
    </section>
  );
}
