import { createRootRoute, Outlet, HeadContent, Scripts } from '@tanstack/react-router';
import appCss from '@/styles.css?url';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'ESO ENERGY · Command Deck' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
});

function RootDocument() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-[#07080a] text-white antialiased">
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}
