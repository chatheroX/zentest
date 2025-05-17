
// src/app/seb/live-test/page.tsx
'use client'; 
// This page now receives examId and studentId as URL query parameters
// from the /seb/entry/[token] page after successful token validation.

import React, { Suspense } from 'react';
import { SebLiveTestClient } from '@/components/seb/seb-live-test-client'; 
import { Loader2, ShieldAlert } from 'lucide-react';

function SebLiveTestFallback() {
  return (
     <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 p-4 text-center">
        <Loader2 className="h-16 w-16 text-primary animate-spin mb-6" />
        <h2 className="text-xl font-medium text-slate-200 mb-1">
          Loading Secure Exam Environment...
        </h2>
         <div className="flex items-center text-yellow-400 mt-4">
             <ShieldAlert className="h-5 w-5 mr-2" />
             <p className="text-sm">Secure Exam Environment Active. Please wait.</p>
         </div>
      </div>
  );
}

export default function SebLiveTestPage() {
  return (
    <Suspense fallback={<SebLiveTestFallback />}>
      <SebLiveTestClient />
    </Suspense>
  );
}

