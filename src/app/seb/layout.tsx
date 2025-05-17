
// src/app/seb/layout.tsx
import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/contexts/AuthContext'; 
import '../globals.css'; // Ensure global styles are applied

// This layout is minimal, intended for pages that run inside SEB
// It should not include global navigation, sidebars, or footers from the main app.
export default function SebLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The body tag is already provided by the root layout (src/app/layout.tsx)
  // SebLayout should only provide the content structure for the /seb/* routes.
  return (
    <AuthProvider> {/* Crucial: Wrap children with AuthProvider */}
      <main className="flex-1 flex flex-col bg-background text-foreground min-h-screen">{children}</main> {/* Ensure children can take full height */}
      <Toaster /> {/* Toasts can provide feedback within SEB */}
    </AuthProvider>
  );
}
