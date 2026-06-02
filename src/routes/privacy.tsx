import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout, LegalSection } from "@/components/aura/LegalLayout";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Privacy Policy — ESO Energy Tech Limited" },
      {
        name: "description",
        content:
          "How ESO Energy collects, encrypts, shares and protects telemetry and payment data under NDPR and CBN guidelines.",
      },
    ],
  }),
});

function PrivacyPage() {
  return (
    <LegalLayout
      eyebrow="Legal · Privacy"
      title="Privacy Policy"
      updated="June 2, 2026"
    >
      <LegalSection heading="1. Data We Collect">
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Identity data:</strong> name, email, phone, address, BVN/NIN where KYC is required.</li>
          <li><strong>Payment data:</strong> wallet balance, transaction history, electricity meter numbers, DISCO references.</li>
          <li><strong>Telemetry data:</strong> inverter output, battery state-of-charge, thermal readings, grid status — captured at 1–60 second intervals from your connected devices.</li>
          <li><strong>Device data:</strong> IP address, browser, OS, session identifiers for security.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="2. Data Encryption">
        <p>
          All data is transmitted over TLS 1.2+ and encrypted at rest using
          AES-256. Payment credentials are tokenised — we never store raw
          card PANs or CVVs. Telemetry streams are signed to prevent
          tampering in transit.
        </p>
      </LegalSection>

      <LegalSection heading="3. Third-Party Sharing">
        <p>We share only the minimum data required, and only with:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Licensed payment processors</strong> to fulfil wallet top-ups and electricity vending.</li>
          <li><strong>KYC / identity-verification partners</strong> regulated by the CBN to confirm BVN/NIN.</li>
          <li><strong>Distribution Companies (DISCOs)</strong> for meter validation and token issuance.</li>
          <li><strong>Cloud infrastructure providers</strong> bound by data-processing agreements.</li>
        </ul>
        <p>
          We never sell your personal data, telemetry data, or transaction
          history to advertisers or data brokers.
        </p>
      </LegalSection>

      <LegalSection heading="4. Your Rights (NDPR)">
        <p>Under the Nigeria Data Protection Regulation you may:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Request a copy of personal data we hold about you.</li>
          <li>Request correction of inaccurate information.</li>
          <li>Request deletion of your account and associated telemetry history (subject to AML retention).</li>
          <li>Withdraw consent for non-essential processing.</li>
          <li>Lodge a complaint with the Nigeria Data Protection Commission (NDPC).</li>
        </ul>
      </LegalSection>

      <LegalSection heading="5. Data Retention">
        <p>
          Transaction records are retained for a minimum of seven (7) years
          to comply with CBN AML/CFT obligations. Telemetry data is retained
          for 24 months in raw form and indefinitely in aggregated, anonymised
          form for analytics.
        </p>
      </LegalSection>

      <LegalSection heading="6. Contact our DPO">
        <p>
          Data Protection Officer · ESO ENERGY TECH LIMITED ·{" "}
          <a className="underline" href="mailto:info@eso-energy.com">
            info@eso-energy.com
          </a>{" "}
          · +234 806 867 0809.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
