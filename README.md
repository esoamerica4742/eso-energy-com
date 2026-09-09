# ESO Energy Web

Core web platform for ESO Energy and ESO Pay, handling enterprise utility billing, automated token vending, and real-time metering telemetry.
🚀 **Live Production Platform:** [Click here to launch ESO Energy Web](https://eso-energy.com)

## Tech Stack

- Next.js / TypeScript
- Tailwind CSS
- Supabase (PostgreSQL, RLS)
- Monnify & Anchor APIs

## Core Features

- Automated utility bill vending with built-in idempotency to prevent duplicate charges.
- Power Shield automated monitoring system for low token balances and meter health alerts.
- Virtual account creation and live payout transaction management via Monnify/Anchor integration.
- Role-based access control secured entirely by Supabase RLS policies.

## Running Locally

1. Clone the repo:
   ```bash
   git clone https://github.com/esoamerica4742/eso-energy-com.git
