// src/app/seb/entry/page.tsx
import React, { Suspense } from 'react';
import { SebEntryClientNew } from '@/components/seb/seb-entry-client-new';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Toaster } from '@/components/ui/toaster';

export default function SebEntryPage() {
  return (
    // Removed p-4, items-center, justify-center to allow SebEntryClientNew to control its full-screen layout
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center text-center flex-grow">
          <Loader2 className="h-16 w-16 text-primary animate-spin mb-6" />
          <h2 className="text-xl font-medium text-foreground mb-2">
            Initializing Secure Exam Session...
          </h2>
          <div className="flex items-center text-primary/80">
            <ShieldAlert className="h-5 w-5 mr-2" />
            <p className="text-sm">Please wait, preparing secure entry...</p>
          </div>
        </div>
      }>
        <SebEntryClientNew />
      </Suspense>
      <Toaster />
    </div>
  );
}
