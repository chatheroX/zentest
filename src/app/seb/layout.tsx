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
    <html lang="en" className="light"> {/* Ensure base HTML structure */}
      <body className="font-sans antialiased bg-slate-100 dark:bg-slate-900 min-h-screen flex flex-col">
        <AuthProvider> {/* Crucial: Wrap children with AuthProvider */}
          {children}
          <Toaster /> {/* Toasts can provide feedback within SEB */}
        </AuthProvider>
      </body>
    </html>
  );
}
