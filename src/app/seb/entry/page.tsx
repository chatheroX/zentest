
// src/app/seb/entry/page.tsx
// This page is a simple wrapper for SebEntryClientNew,
// which now expects the token to be passed as a query parameter.
import React, { Suspense } from 'react';
import { SebEntryClientNew } from '@/components/seb/seb-entry-client-new';
import { Loader2, ShieldAlert } from 'lucide-react';

export default function SebEntryPage() {
  return (
    <div className="min-h-screen bg-seb-entry text-foreground flex flex-col">
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center text-center flex-grow p-4">
          <Loader2 className="h-16 w-16 text-primary animate-spin mb-6" />
          <h2 className="text-xl font-medium text-foreground mb-2">
            Initializing Secure Session...
          </h2>
          <div className="flex items-center text-primary/80">
            <ShieldAlert className="h-5 w-5 mr-2" />
            <p className="text-sm">Please wait, preparing secure entry...</p>
          </div>
        </div>
      }>
        <SebEntryClientNew /> {/* SebEntryClientNew will read token from searchParams */}
      </Suspense>
    </div>
  );
}
