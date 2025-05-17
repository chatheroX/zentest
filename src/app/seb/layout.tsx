// src/app/seb/layout.tsx
import React from 'react';

// Removed AuthProvider - it's in RootLayout
// Removed Toaster - moved to individual pages to ensure context

export default function SebLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // This layout is minimal. Apply gradient here.
    // The <html> and <body> tags are managed by the root layout (src/app/layout.tsx)
    // This div will be inside the body.
    <div className="bg-seb-gradient text-slate-100 min-h-screen flex flex-col">
      {/*
        The previous <main> tag has been moved into the page components (entry/page.tsx, live-test/page.tsx)
        to allow them to control their specific structure within this gradient background.
        This layout now only provides the gradient background and basic text color.
      */}
      {children}
    </div>
  );
}
