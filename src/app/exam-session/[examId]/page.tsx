
// src/app/exam-session/[examId]/page.tsx
// This page is now DEPRECATED for the primary SEB flow.
// The /seb/entry/[token] page will handle token validation and lead to /seb/live-test.
'use client';

import React, { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';

export default function DeprecatedExamSessionPage() {
  const router = useRouter();
  const params = useParams();
  const examId = params.examId as string;

  useEffect(() => {
    console.warn(`[DeprecatedExamSessionPage ${examId}] Accessed. This page is deprecated. Redirecting to student join exam page...`);
    router.replace('/student/dashboard/join-exam'); 
  }, [examId, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
      <Card className="w-full max-w-lg modern-card text-center shadow-xl">
        <CardHeader className="pt-8 pb-4">
          <AlertTriangle className="h-16 w-16 text-orange-500 mx-auto mb-5" />
          <CardTitle className="text-2xl text-orange-500">Page Deprecated</CardTitle>
        </CardHeader>
        <CardContent className="pb-6 space-y-4">
          <CardDescription className="text-muted-foreground">
            This exam access method is no longer in use.
            Exams are launched directly into Safe Exam Browser via a new secure entry flow.
          </CardDescription>
          <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto my-3" />
          <p className="text-sm text-muted-foreground">
            You will be redirected to the student dashboard.
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

