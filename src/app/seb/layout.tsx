
// src/app/seb/layout.tsx
import React from 'react';
import { Toaster } from "@/components/ui/toaster";

export default function SebLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // SEB pages will use the new global theme (light/dark mode)
  // This layout ensures a consistent wrapper for SEB-specific pages.
  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col">
      {children}
      <Toaster /> {/* Toaster for SEB specific notifications */}
    </div>
  );
}
