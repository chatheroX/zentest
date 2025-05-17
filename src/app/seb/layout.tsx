
// src/app/seb/layout.tsx
import React from 'react';
import { Toaster } from "@/components/ui/toaster"; // Moved Toaster to individual pages

export default function SebLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Ensures SEB pages use the standard light background and dark text
    // The main structural elements (like <main>) are now in the page components
    <div className="bg-background text-foreground min-h-screen flex flex-col">
      {children}
    </div>
  );
}
