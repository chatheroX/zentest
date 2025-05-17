
// src/app/seb/live-test/page.tsx
'use client'; // Top-level default export remains a client component for simplicity in this case,
              // OR we make SebLiveTestClient a separate component and this page a server component.
              // Given the existing structure, keeping 'use client' here and directly using useSearchParams is common.
              // However, to strictly follow the "wrap in Suspense" for useSearchParams,
              // the page itself could be a server component. Let's refactor as suggested.

import React, { Suspense } from 'react';
import { SebLiveTestClient } from '@/components/seb/seb-live-test-client'; // Assume this component will be created or logic moved here
import { Loader2 } from 'lucide-react';

// This is the Server Component part of the page
export default function SebLiveTestPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 p-4 text-center">
        <Loader2 className="h-16 w-16 text-primary animate-spin mb-6" />
        <h2 className="text-xl font-medium text-slate-200 mb-1">
          Loading Secure Exam Session...
        </h2>
      </div>
    }>
      <SebLiveTestClient />
    </Suspense>
  );
}
