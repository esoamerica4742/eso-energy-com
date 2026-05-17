import { createRootRoute, Outlet } from '@tanstack/react-router';
import React from 'react';

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <main className="min-h-screen bg-[#07080a]">
      {/* This Outlet is mandatory. It tells the router where to load your login and register pages */}
      <Outlet />
    </main>
  );
}
