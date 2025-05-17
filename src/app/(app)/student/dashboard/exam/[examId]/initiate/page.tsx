
// This page is now effectively DEPRECATED for the primary SEB flow.
// The "Join Exam" page will directly attempt to launch SEB.
// This page could be repurposed for non-SEB testing or removed.
// For now, it will redirect or show a message.
'use client';

import React, { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function DeprecatedInitiateExamPage() {
  const router = useRouter();
  const params = useParams();
  const examId = params.examId as string;

  useEffect(() => {
    console.warn(`[DeprecatedInitiateExamPage ${examId}] Accessed. This page is deprecated for SEB flow. Redirecting to join exam page...`);
    router.replace('/student/dashboard/join-exam'); 
  }, [examId, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
      <Card className="w-full max-w-lg modern-card text-center shadow-xl">
        <CardHeader className="pt-8 pb-4">
          <AlertTriangle className="h-16 w-16 text-orange-500 mx-auto mb-5" />
          <CardTitle className="text-2xl text-orange-600 dark:text-orange-400">Page Deprecated</CardTitle>
        </CardHeader>
        <CardContent className="pb-6 space-y-4">
          <CardDescription className="text-muted-foreground">
            This exam initiation step is no longer used for the primary SEB exam flow.
            Exams are launched directly into Safe Exam Browser from the "Join Exam" page using a secure entry token.
          </CardDescription>
          <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto my-3" />
          <p className="text-sm text-muted-foreground">
            You are being redirected to the "Join Exam" page.
          </p>
           <Button asChild className="w-full btn-outline-subtle mt-4">
            <Link href="/student/dashboard/join-exam">
              Go to Join Exam Page Now
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

