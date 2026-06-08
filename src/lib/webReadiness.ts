/** Web app production readiness — updated from route, auth, and ops audit. */

export type ReadinessCategory = {
  id: string;
  label: string;
  percent: number;
  note: string;
};

export const WEB_APP_READINESS = {
  overallPercent: 70,
  status: "Controlled beta",
  summary:
    "Enode telemetry, APIs, and CI gates are strong. Dashboard KPIs, alerts, and auth hardening still need wiring before full production.",
  categories: [
    { id: "api", label: "API & backend", percent: 85, note: "Enode BFF, health, webhooks, jobs" },
    { id: "monitor", label: "Monitor", percent: 78, note: "Live device grid + Enode link" },
    { id: "deploy", label: "Deploy & env", percent: 70, note: "Wrangler + env docs; no auto-deploy" },
    { id: "auth", label: "Auth", percent: 65, note: "Login works; guards & 2FA UI pending" },
    { id: "routes", label: "Routes & pages", percent: 62, note: "9 routes; some nav stubs" },
    { id: "dashboard", label: "Dashboard", percent: 50, note: "Mixed live data and mock widgets" },
    { id: "alerts", label: "Alerts", percent: 20, note: "Static demo; backend not wired" },
  ] satisfies ReadinessCategory[],
  remainingForLaunch: [
    "Route auth guards on dashboard, monitor, and alerts",
    "Live alerts feed from enode_alerts / Power Shield",
    "Replace mock dashboard KPIs with tenant data",
    "Wire 2FA UI and unify registration",
    "Cloudflare deploy pipeline + web e2e tests",
  ],
} as const;
