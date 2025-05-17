// src/app/seb/layout.tsx
import React from 'react';
import { Toaster } from "@/components/ui/toaster";
// Removed AuthProvider as it's already in RootLayout
// Removed globals.css import as it's already in RootLayout

// This layout is minimal, intended for pages that run inside SEB
// It should not include global navigation, sidebars, or footers from the main app.
export default function SebLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The <html> and <body> tags are managed by the root layout (src/app/layout.tsx)
  // AuthProvider is also provided by RootLayout.
  // This layout just provides a main wrapper for SEB pages and its own Toaster.
  return (
    <>
      <main className="flex-1 flex flex-col bg-background text-foreground min-h-screen">{children}</main>
      <Toaster /> {/* Toasts can provide feedback within SEB */}
    </>
  );
}
