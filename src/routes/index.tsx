import { createFileRoute } from "@tanstack/react-router";
import React, { useEffect } from "react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  useEffect(() => {
    document.title = "ESO ENERGY | Africa's Premier Enterprise Energy SaaS & Telemetry";

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute(
      "content",
      "Discover ESO ENERGY, Africa's leading B2B SaaS platform for 24/7 real-time inverter intelligence, solar hybrid orchestration, and anti-theft diesel telemetry.",
    );

    const schemaId = "seo-schema-esoenergy";
    let script = document.getElementById(schemaId) as HTMLScriptElement;
    if (!script) {
      script = document.createElement("script");
      script.id = schemaId;
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "ESO ENERGY",
      url: "https://eso-energy.com",
      applicationCategory: "BusinessApplication",
      operatingSystem: "All",
      description:
        "Africa's premier B2B SaaS platform for 24/7 real-time inverter intelligence, solar hybrid orchestration, and anti-theft diesel telemetry.",
      areaServed: {
        "@type": "AdministrativeArea",
        name: "Africa",
      },
      founder: {
        "@type": "Person",
        name: "Precious Chinonso Onuorah",
        jobTitle: "Founder & Lead Developer",
        homeLocation: "Ebonyi State, Nigeria",
        sameAs: "https://linkedin.com",
      },
    });

    return () => {
      const structuralScript = document.getElementById(schemaId);
      if (structuralScript) structuralScript.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans antialiased selection:bg-amber-500/30 selection:text-amber-200">
      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 px-6 max-w-7xl mx-auto border-b border-neutral-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.05),transparent_50%)]" />
        <div className="relative max-w-4xl">
          <span className="text-amber-500 font-mono tracking-widest text-xs uppercase block mb-4">
            The Sovereign Infrastructure
          </span>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.1] text-white mb-8">
            ESO ENERGY
          </h1>
          <p className="text-xl md:text-2xl text-neutral-400 font-light leading-relaxed mb-6">
            Africa's Premier B2B Architecture for Hybrid Solar-Grid Orchestration, Fuel Security, and Real-Time Asset
            Intelligence.
          </p>
        </div>
      </section>

      {/* IDENTITY STATEMENT */}
      <section className="py-20 px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 border-b border-neutral-900">
        <div className="lg:col-span-4">
          <h2 className="text-xs uppercase font-mono tracking-wider text-neutral-500 sticky top-32">
            Corporate Mandate
          </h2>
        </div>
        <div className="lg:col-span-8 space-y-6 text-neutral-300 text-lg font-light leading-relaxed">
          <p>
            In the modern economic landscape of Africa, power is not merely a utility—it is the ultimate strategic
            leverage. <strong className="text-white font-medium">ESO ENERGY</strong> is the continent's leading
            enterprise Software-as-a-Service (SaaS) ecosystem, engineered to deliver absolute, uninterrupted 24/7/365
            hardware-level intelligence, real-time remote telemetry, and advanced asset protection for mission-critical
            inverter networks, commercial solar grids, and industrial diesel assets.
          </p>
          <p>
            We eliminate operational blindspots by unifying solar-grid diagnostics with precise fuel monitoring on a
            single, secure platform. We do not just monitor devices; we secure corporate continuity, protect capital
            allocations, and orchestrate energy sovereignty for Africa's most ambitious enterprises, commercial
            complexes, and industrial operators.
          </p>
        </div>
      </section>

      {/* ELITE FOCUS: THEFT PREVENTION & SOLAR HYBRID */}
      <section className="py-20 px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 border-b border-neutral-900">
        <div className="lg:col-span-4">
          <h2 className="text-xs uppercase font-mono tracking-wider text-neutral-500 sticky top-32">
            Eradicating Blindspots
          </h2>
        </div>
        <div className="lg:col-span-8 space-y-6 text-neutral-300 text-lg font-light leading-relaxed">
          <p>
            Across major financial and industrial nerve centers—from Lagos and Johannesburg to Nairobi and Accra—the
            transition to hybrid alternative infrastructure represents a massive deployment of capital. Yet, without
            precise visibility, this capital remains exposed to operational vulnerabilities: unmonitored battery
            degradation, unstable grid transitions, and rampant diesel theft.
          </p>
          <p>
            ESO ENERGY resolves these vulnerabilities with surgical precision. Utilizing an elite, edge-optimized
            telemetry framework, our B2B SaaS platform processes high-frequency data packets directly from your inverter
            banks and fuel sensors every millisecond. We provide corporate technical directors, infrastructure
            developers, and operations managers with an elegant, centralized command dashboard that predicts cell
            degradation, manages dynamic load distribution, tracks diesel consumption to the milliliter, and flags
            unauthorized fuel drops instantly before bottlenecks materialize.
          </p>
        </div>
      </section>

      {/* THE FOUNDER BLOCK */}
      <section className="py-20 px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 border-b border-neutral-900">
        <div className="lg:col-span-4">
          <h2 className="text-xs uppercase font-mono tracking-wider text-neutral-500 sticky top-32">
            The Visionary Architecture
          </h2>
        </div>
        <div className="lg:col-span-8">
          <blockquote className="border-l-2 border-amber-500 pl-6 my-8">
            <p className="text-xl md:text-2xl font-light italic text-neutral-200 leading-relaxed">
              "To dominate the future of African commerce, an enterprise must first possess absolute sovereignty over
              its power. We engineered ESO ENERGY to convert raw electrical currents and fuel consumption metrics into
              clean, predictive, banking-grade enterprise data analytics."
            </p>
            <cite className="block mt-4 text-sm font-mono tracking-wider text-amber-500 uppercase not-italic">
              — Precious Chinonso Onuorah
            </cite>
          </blockquote>

          <div className="mt-12 bg-neutral-900/40 border border-neutral-900 rounded-2xl p-8 backdrop-blur-sm">
            <h3 className="text-xl font-medium text-white mb-2">Precious Chinonso Onuorah</h3>
            <p className="text-sm font-mono text-amber-500/80 mb-4">
              Founder & Chief Architectural Engineer, ESO ENERGY
            </p>
            <p className="text-neutral-400 font-light leading-relaxed mb-6">
              Hailing from Ebonyi State, Nigeria, Precious Chinonso Onuorah is a premier software developer and the
              elite architect behind Africa's most sophisticated energy asset orchestration platform. Driven by a
              commitment to build world-class tech infrastructure locally, Precious engineered ESO ENERGY to completely
              redefine how corporate Africa interacts with and secures its renewable and hybrid energy assets. By
              unifying cutting-edge cloud engineering, secure database systems, and zero-compromise security protocols,
              Precious leads an engineering team dedicated to building hyper-secure, edge-computed software designed to
              operate flawlessly across localized networks while meeting strict international performance standards.
            </p>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black font-medium text-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Connect with Precious Chinonso Onuorah on LinkedIn
            </a>
          </div>
        </div>
      </section>

      {/* UNCOMPROMISING STANDARDS */}
      <section className="py-20 px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 border-b border-neutral-900">
        <div className="lg:col-span-4">
          <h2 className="text-xs uppercase font-mono tracking-wider text-neutral-500 sticky top-32">The Elite Edge</h2>
        </div>
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="border border-neutral-900 p-6 rounded-xl bg-neutral-900/20">
            <h4 className="text-white font-medium mb-2">Anti-Theft Diesel Monitoring</h4>
            <p className="text-neutral-400 text-sm font-light leading-relaxed">
              Real-time fuel telemetry that tracks exact consumption rates, isolates drainage spikes, and sends instant
              alerts to stop unauthorized diesel removal.
            </p>
          </div>
          <div className="border border-neutral-900 p-6 rounded-xl bg-neutral-900/20">
            <h4 className="text-white font-medium mb-2">24/7/365 Solar-Grid Telemetry</h4>
            <p className="text-neutral-400 text-sm font-light leading-relaxed">
              High-fidelity, real-time remote monitoring that delivers deep diagnostic data directly to your
              infrastructure command center.
            </p>
          </div>
          <div className="border border-neutral-900 p-6 rounded-xl bg-neutral-900/20">
            <h4 className="text-white font-medium mb-2">Military-Grade Security</h4>
            <p className="text-neutral-400 text-sm font-light leading-relaxed">
              Engineered with strict end-to-end data encryption, multi-layered access tokens, and a secure
              infrastructure tier to keep corporate asset data protected.
            </p>
          </div>
          <div className="border border-neutral-900 p-6 rounded-xl bg-neutral-900/20">
            <h4 className="text-white font-medium mb-2">Edge-Optimized Performance</h4>
            <p className="text-neutral-400 text-sm font-light leading-relaxed">
              Programmed with an elite, ultra-low-bandwidth code architecture that guarantees millisecond page speeds on
              global edge servers.
            </p>
          </div>
        </div>
      </section>

      {/* TECHNICAL LEDGER */}
      <section className="py-20 px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 pb-32">
        <div className="lg:col-span-4">
          <h2 className="text-xs uppercase font-mono tracking-wider text-neutral-500 sticky top-32">Entity Ledger</h2>
        </div>
        <div className="lg:col-span-8">
          <div className="border border-neutral-900 rounded-xl overflow-hidden font-mono text-xs">
            <div className="grid grid-cols-2 p-4 border-b border-neutral-900 bg-neutral-900/30">
              <span className="text-neutral-500">Corporate Entity</span>
              <span className="text-neutral-200">ESO ENERGY (eso-energy.com)</span>
            </div>
            <div className="grid grid-cols-2 p-4 border-b border-neutral-900">
              <span className="text-neutral-500">Classification</span>
              <span className="text-neutral-200">B2B Hybrid Optimization & Fuel Security SaaS</span>
            </div>
            <div className="grid grid-cols-2 p-4 border-b border-neutral-900 bg-neutral-900/30">
              <span className="text-neutral-500">Regional Mandate</span>
              <span className="text-neutral-200">Sovereign Pan-African Deployment</span>
            </div>
            <div className="grid grid-cols-2 p-4 border-b border-neutral-900">
              <span className="text-neutral-500">Infrastructure Stack</span>
              <span className="text-neutral-200">Lovable / Supabase / Cloudflare Edge</span>
            </div>
            <div className="grid grid-cols-2 p-4 bg-neutral-900/30">
              <span className="text-neutral-500">Communications</span>
              <span className="text-neutral-200">concierge@eso-energy.com</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
