
// src/app/seb/entry/[token]/page.tsx
import React, { Suspense } from 'react';
import { SebEntryClientNew } from '@/components/seb/seb-entry-client-new'; // Use the new client component
import { Loader2, ShieldAlert } from 'lucide-react';

// This is the Server Component part of the page.
// It receives the token from the URL path and passes it to the client component.
export default function SebEntryTokenPage({ params }: { params: { token: string } }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center text-center">
          <Loader2 className="h-16 w-16 text-primary animate-spin mb-6" />
          <h2 className="text-xl font-medium text-slate-200 mb-2">
            Initializing Secure Exam Session...
          </h2>
          <div className="flex items-center text-yellow-400">
            <ShieldAlert className="h-5 w-5 mr-2" />
            <p className="text-sm">Please wait, preparing secure entry...</p>
          </div>
        </div>
      }>
        <SebEntryClientNew entryTokenFromPath={params.token} />
      </Suspense>
    </div>
  );
}
