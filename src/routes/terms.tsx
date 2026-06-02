import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout, LegalSection } from "@/components/aura/LegalLayout";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Terms of Service — ESO Energy Tech Limited" },
      {
        name: "description",
        content:
          "Terms of Service governing use of ESO Energy's utility vending and solar inverter monitoring platform.",
      },
    ],
  }),
});

function TermsPage() {
  return (
    <LegalLayout
      eyebrow="Legal · Terms"
      title="Terms of Service"
      updated="June 2, 2026"
    >
      <LegalSection heading="1. Acceptance of Terms">
        <p>
          By accessing or using any service operated by ESO ENERGY TECH LIMITED
          ("ESO Energy", "we", "us"), including the utility bill payment portal
          and solar inverter monitoring dashboard, you agree to be bound by
          these Terms of Service. If you do not agree, do not use the service.
        </p>
      </LegalSection>

      <LegalSection heading="2. Account Eligibility">
        <p>
          You must be at least 18 years old and legally capable of entering
          into binding contracts under the laws of the Federal Republic of
          Nigeria. Corporate accounts must be opened by an authorized
          representative of a registered entity. You are responsible for
          providing accurate Know-Your-Customer (KYC) information, including
          BVN/NIN where required for fintech compliance.
        </p>
      </LegalSection>

      <LegalSection heading="3. Service Availability">
        <p>
          ESO Energy provides (a) utility vending — including prepaid
          electricity token purchase across participating DISCOs — and (b)
          remote telemetry, monitoring and analytics for connected solar
          inverters and battery systems. Services are provided on a
          "best-effort" basis and may be subject to downtime due to utility
          provider outages, payment switch maintenance, or force majeure
          events.
        </p>
        <p>
          We do not guarantee uninterrupted token delivery; however, every
          successful payment is reconciled and either fulfilled or refunded
          per our Refund Policy.
        </p>
      </LegalSection>

      <LegalSection heading="4. Prohibited Activities">
        <ul className="list-disc pl-6 space-y-2">
          <li>Using the platform for money laundering, terrorism financing, or any activity prohibited under CBN AML/CFT regulations.</li>
          <li>Reselling prepaid electricity tokens outside of permitted channels.</li>
          <li>Attempting to interfere with inverter telemetry signals belonging to other users.</li>
          <li>Reverse-engineering, scraping, or circumventing platform security controls.</li>
          <li>Submitting fraudulent KYC documentation or impersonating another person or entity.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="5. Payments & Wallet">
        <p>
          Wallet funds are held with licensed financial partners. ESO Energy
          does not earn interest on customer balances. All transactions are
          logged with a unique reference and are auditable from your
          dashboard.
        </p>
      </LegalSection>

      <LegalSection heading="6. Limitation of Liability">
        <p>
          To the maximum extent permitted by law, ESO Energy's aggregate
          liability for any claim arising from the service shall not exceed
          the total fees paid by you in the three (3) months preceding the
          event. We are not liable for indirect, consequential, or punitive
          damages, including loss of power, loss of business, or loss of
          data, except where caused by our gross negligence.
        </p>
      </LegalSection>

      <LegalSection heading="7. Governing Law">
        <p>
          These Terms are governed by the laws of the Federal Republic of
          Nigeria. Disputes shall be resolved by the courts of Anambra State
          unless otherwise agreed in writing.
        </p>
      </LegalSection>

      <LegalSection heading="8. Contact">
        <p>
          Questions about these Terms? Email{" "}
          <a className="underline" href="mailto:info@eso-energy.com">
            info@eso-energy.com
          </a>{" "}
          or call +234 806 867 0809.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
