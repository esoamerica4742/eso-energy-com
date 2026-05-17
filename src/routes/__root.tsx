import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";

import { Toaster } from "sonner";
import { LogoutOverlay } from "@/components/aura/LogoutOverlay";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ESO ENERGY" },
      { name: "description", content: "Africa's premier B2B SaaS platform for 24/7 real-time inverter intelligence, solar hybrid orchestration, and anti-theft diesel telemetry." },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "ESO ENERGY" },
      { property: "og:description", content: "Africa's premier B2B SaaS platform for 24/7 real-time inverter intelligence, solar hybrid orchestration, and anti-theft diesel telemetry." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "ESO ENERGY" },
      { name: "twitter:description", content: "Africa's premier B2B SaaS platform for 24/7 real-time inverter intelligence, solar hybrid orchestration, and anti-theft diesel telemetry." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/72d3d153-9747-409b-b81b-444d932e77dc/id-preview-e76938e2--85388f35-42f8-49a5-a289-5f721eb9dff4.lovable.app-1778976782334.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/72d3d153-9747-409b-b81b-444d932e77dc/id-preview-e76938e2--85388f35-42f8-49a5-a289-5f721eb9dff4.lovable.app-1778976782334.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Bebas+Neue&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  // Cursor-tracked spotlight on every .glass-card
  useEffect(() => {
    if (typeof window === "undefined") return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const target = (e.target as Element | null)?.closest?.(".glass-card") as HTMLElement | null;
        if (!target) return;
        const r = target.getBoundingClientRect();
        target.style.setProperty("--mx", `${e.clientX - r.left}px`);
        target.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <LogoutOverlay />
      <Toaster
        position="top-right"
        theme="dark"
        toastOptions={{
          style: {
            background: "linear-gradient(160deg, oklch(0.18 0.02 265 / 0.95), oklch(0.13 0.015 265 / 0.95))",
            border: "1px solid oklch(1 0 0 / 0.08)",
            color: "oklch(0.96 0.005 250)",
            backdropFilter: "blur(24px) saturate(180%)",
            boxShadow: "0 12px 40px oklch(0 0 0 / 0.6), inset 0 1px 0 oklch(1 0 0 / 0.06)",
            fontFamily: "Inter, sans-serif",
            letterSpacing: "0.01em",
          },
        }}
      />
    </QueryClientProvider>
  );
}
