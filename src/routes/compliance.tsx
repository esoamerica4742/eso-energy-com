import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout, LegalSection } from "@/components/aura/LegalLayout";
import { ShieldCheck, Building2, Lock, FileCheck2 } from "lucide-react";

export const Route = createFileRoute("/compliance")({
  component: CompliancePage,
  head: () => ({
    meta: [
      { title: "Compliance & Regulation — ESO Energy Tech Limited" },
      {
        name: "description",
        content:
          "ESO Energy's transparent alignment with CBN guidelines, CAC registration, NDPR, and PCI-DSS audited payment processing.",
      },
    ],
  }),
});

const PILLARS = [
  {
    icon: Building2,
    label: "CAC Registered",
    body: "ESO ENERGY TECH LIMITED is incorporated under the Companies and Allied Matters Act and registered with the Corporate Affairs Commission of Nigeria.",
  },
  {
    icon: ShieldCheck,
    label: "CBN Aligned",
    body: "All payment flows are processed through CBN-licensed payment service providers and switching companies. We adhere to AML/CFT, BVN-verification, and transaction-limit guidelines.",
  },
  {
    icon: Lock,
    label: "PCI-DSS Audited",
    body: "Card data is tokenised at our processor's PCI-DSS Level-1 environment. ESO never stores raw PAN, expiry, or CVV.",
  },
  {
    icon: FileCheck2,
    label: "NDPR Compliant",
    body: "We are registered with the Nigeria Data Protection Commission (NDPC) and file annual data-audit reports. A designated Data Protection Officer is available to all users.",
  },
];

function CompliancePage() {
  return (
    <LegalLayout
      eyebrow="Trust · Compliance"
      title="Regulatory & Compliance Transparency"
      updated="June 2, 2026"
    >
      <p className="text-white/75">
        ESO Energy operates at the intersection of fintech and energy
        infrastructure. We hold ourselves to bank-grade controls because the
        capital, the meters, and the data we touch demand nothing less. This
        page is a public, plain-language summary of our regulatory posture.
      </p>

      <div className="grid sm:grid-cols-2 gap-4 pt-2">
        {PILLARS.map((p) => (
          <div
            key={p.label}
            className="rounded-xl border p-5 space-y-2.5"
            style={{
              borderColor: "rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <div className="flex items-center gap-2.5">
              <span
                className="grid place-items-center h-9 w-9 rounded-lg"
                style={{
                  background: "rgba(255,215,0,0.12)",
                  border: "1px solid rgba(255,215,0,0.3)",
                }}
              >
                <p.icon className="h-4 w-4" style={{ color: "#FFD700" }} />
              </span>
              <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-white/60">
                {p.label}
              </p>
            </div>
            <p className="text-sm text-white/75 leading-relaxed">{p.body}</p>
          </div>
        ))}
      </div>

      <LegalSection heading="Audited Payment Processing">
        <p>
          Every transaction passes through three independent reconciliation
          checkpoints: (1) the payment switch, (2) the DISCO vending API, and
          (3) our internal settlement ledger. Daily exception reports are
          reviewed by our finance team, and weekly reports are escalated to
          executive oversight.
        </p>
      </LegalSection>

      <LegalSection heading="Anti-Money-Laundering (AML)">
        <p>
          We screen all wallet activity against CBN AML/CFT thresholds and
          PEP/sanctions lists in real time. Suspicious-transaction reports
          (STRs) are filed with the Nigerian Financial Intelligence Unit
          (NFIU) where required.
        </p>
      </LegalSection>

      <LegalSection heading="Customer Funds">
        <p>
          Customer wallet balances are held in segregated client accounts
          with our partner financial institutions. ESO does not co-mingle
          customer funds with operating capital.
        </p>
      </LegalSection>

      <LegalSection heading="Open Disclosures">
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Registered Office:</strong> 6 Uche Step by Step Street, off St. Christopher Road, Oyolu 33, Onitsha, Anambra, Nigeria.</li>
          <li><strong>Support Line:</strong> +234 806 867 0809</li>
          <li><strong>Email:</strong> info@eso-energy.com</li>
          <li><strong>Complaints &amp; Whistle-blowing:</strong> info@eso-energy.com (marked "Compliance — Confidential")</li>
        </ul>
      </LegalSection>
    </LegalLayout>
  );
}
