import { createRootRouteWithContext, Outlet, HeadContent, Scripts } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { EnterpriseRealtimeProvider } from '@/providers/EnterpriseRealtimeProvider';
import { Toaster } from '@/components/ui/sonner';
import appCss from '@/styles.css?url';

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'ESO ENERGY · Dashboard' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&display=swap',
      },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument() {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-[#080A0F] text-white antialiased font-sans tracking-tight">
        <QueryClientProvider client={queryClient}>
          <EnterpriseRealtimeProvider>
            <Outlet />
            <Toaster richColors position="top-center" />
          </EnterpriseRealtimeProvider>
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}
