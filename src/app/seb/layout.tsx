
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
  return (
    // Default to light theme based on globals.css if no class is specified on html
    <html lang="en"> 
      <body className="font-sans antialiased bg-background text-foreground min-h-screen flex flex-col">
        <AuthProvider> {/* Crucial: Wrap children with AuthProvider */}
          <main className="flex-1 flex flex-col">{children}</main> {/* Ensure children can take full height */}
          <Toaster /> {/* Toasts can provide feedback within SEB */}
        </AuthProvider>
      </body>
    </html>
  );
}

