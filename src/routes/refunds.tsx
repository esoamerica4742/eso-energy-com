import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout, LegalSection } from "@/components/aura/LegalLayout";

export const Route = createFileRoute("/refunds")({
  component: RefundsPage,
  head: () => ({
    meta: [
      { title: "Refund & Cancellation Policy — ESO Energy Tech Limited" },
      {
        name: "description",
        content:
          "Conditions for failed token delivery, refund timelines, and the reversal process for ESO Energy transactions.",
      },
    ],
  }),
});

function RefundsPage() {
  return (
    <LegalLayout
      eyebrow="Legal · Refunds"
      title="Refund & Cancellation Policy"
      updated="June 2, 2026"
    >
      <LegalSection heading="1. Scope">
        <p>
          This policy covers wallet top-ups, electricity token purchases, and
          subscription fees processed through ESO Energy's platform. It is
          binding from the moment you initiate a transaction.
        </p>
      </LegalSection>

      <LegalSection heading="2. Failed Token Delivery">
        <p>
          A transaction is considered <strong>"failed"</strong> when payment
          has been debited from your wallet or bank, but no valid electricity
          token (or service unit) has been issued by the DISCO within fifteen
          (15) minutes.
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>The system automatically detects failed vends and queues them for reversal.</li>
          <li>Reversed funds are returned to your ESO wallet within <strong>0–24 hours</strong>.</li>
          <li>If the DISCO confirms partial fulfilment, only the unfulfilled portion is refunded.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="3. Reversal Process">
        <ol className="list-decimal pl-6 space-y-2">
          <li>Open the failed transaction in your dashboard and tap <em>"Request Reversal"</em>, or email <a className="underline" href="mailto:info@eso-energy.com">info@eso-energy.com</a> with the reference ID.</li>
          <li>Our settlement engine cross-checks the DISCO ledger and the payment-switch confirmation.</li>
          <li>If failure is confirmed, the funds are credited back to your wallet automatically.</li>
          <li>For bank-funded transactions, you may request payout to your originating bank account; payout completes within 1–3 business days.</li>
        </ol>
      </LegalSection>

      <LegalSection heading="4. Non-Refundable Items">
        <ul className="list-disc pl-6 space-y-2">
          <li>Successfully delivered electricity tokens — once a token is generated and visible in your dashboard, it cannot be refunded.</li>
          <li>Transaction fees on completed transactions.</li>
          <li>Subscription fees for periods already consumed.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="5. Disputes">
        <p>
          If a reversal is not processed within 24 hours, raise a formal
          dispute by emailing <a className="underline" href="mailto:info@eso-energy.com">info@eso-energy.com</a> with the
          transaction reference and proof of debit. We will respond within one
          (1) business day and resolve within five (5) business days.
        </p>
      </LegalSection>

      <LegalSection heading="6. Cancellation">
        <p>
          You may close your ESO account at any time from <em>Settings →
          Account → Close Account</em>. Any remaining wallet balance will be
          paid out to your verified bank account, less any pending settlement
          obligations.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
