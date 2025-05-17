
'use client';

// This page is now effectively DEPRECATED and replaced by /seb/live-test/page.tsx
// It's kept to prevent 404s if old links are accessed, but should redirect.

import React, { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function DeprecatedTakeExamPage() {
  const router = useRouter();
  const params = useParams();
  const examId = params.examId as string;

  useEffect(() => {
    // Redirect to the student dashboard or a generic error page
    // as this path is no longer the primary exam taking route.
    // Redirecting to join exam might be more appropriate if they somehow landed here.
    console.warn(`[DeprecatedTakeExamPage] Accessed. Redirecting for examId: ${examId}. This page is deprecated.`);
    if (examId) {
      // No longer relevant to redirect to /exam-session, now go to /join-exam or /student/dashboard
      router.replace(`/student/dashboard/join-exam`); 
    } else {
      router.replace('/student/dashboard/join-exam');
    }
  }, [examId, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
      <p className="text-lg text-muted-foreground">This exam page is no longer in use.</p>
      <p className="text-sm text-muted-foreground mt-2">Redirecting...</p>
    </div>
  );
}
