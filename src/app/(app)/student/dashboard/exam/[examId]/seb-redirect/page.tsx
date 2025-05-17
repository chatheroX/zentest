
// This page is now effectively DEPRECATED as the "Join Exam" page handles SEB launch directly.
// It will redirect to join exam page or dashboard if accessed directly.
'use client';

import React, { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function DeprecatedSebRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const examId = params.examId as string; // Keep for potential logging, though not directly used for redirect path

  useEffect(() => {
    console.warn(`[DeprecatedSebRedirectPage] Accessed. This page is deprecated. Redirecting to join exam page...`);
    router.replace('/student/dashboard/join-exam');
  }, [examId, router]); // examId kept in deps for completeness, though redirect path is fixed

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
      <p className="text-lg text-muted-foreground">This SEB redirect page is no longer in use.</p>
      <p className="text-sm text-muted-foreground mt-2">
        Redirecting to the "Join Exam" page...
      </p>
    </div>
  );
}
