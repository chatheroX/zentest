
// src/app/seb/live-test/page.tsx
'use client'; 
// This page is now effectively a container for SebLiveTestClient,
// which itself will be rendered by SebEntryClientNew.
// The direct fetching logic previously here is now mostly in SebEntryClientNew.
// This page will just show a loader if SebEntryClientNew hasn't mounted/rendered its content yet.

import React, { Suspense } from 'react';
// SebLiveTestClient will be rendered by the new SEB entry flow.
// This page itself won't directly call SebLiveTestClient anymore if the parent handles it.
// For now, keeping a simple fallback if accessed directly (though it shouldn't be).
import { Loader2, ShieldAlert } from 'lucide-react';

function SebLiveTestFallback() {
  return (
     <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 p-4 text-center">
        <Loader2 className="h-16 w-16 text-primary animate-spin mb-6" />
        <h2 className="text-xl font-medium text-slate-200 mb-1">
          Loading Secure Exam Session...
        </h2>
         <div className="flex items-center text-yellow-400 mt-4">
             <ShieldAlert className="h-5 w-5 mr-2" />
             <p className="text-sm">This page should be accessed via the secure exam entry flow.</p>
         </div>
      </div>
  );
}

export default function SebLiveTestPage() {
  // The actual <SebLiveTestClient /> will be rendered by SebEntryClientNew.tsx
  // when the stage is 'examInProgress'. This page serves as a route endpoint.
  // If a user somehow lands here directly without the parent component's state,
  // they'll see the fallback.
  // This component is mainly a route placeholder, actual exam interface is embedded.
  return (
    <Suspense fallback={<SebLiveTestFallback />}>
      {/* 
        The actual exam interface is now embedded within SebEntryClientNew.
        This page can remain as a fallback or a simple loading indicator if accessed directly.
        The primary rendering path for the exam UI is now within SebEntryClientNew.
      */}
       <SebLiveTestFallback />
    </Suspense>
  );
}
