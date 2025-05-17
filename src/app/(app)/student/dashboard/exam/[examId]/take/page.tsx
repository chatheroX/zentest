
'use client';

// This page is now effectively DEPRECATED and replaced by /seb/live-test/page.tsx via the /seb/entry/[token] flow.
// It's kept to prevent 404s if old links are accessed, but should redirect.

import React, { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';


export default function DeprecatedTakeExamPage() {
  const router = useRouter();
  const params = useParams();
  const examId = params.examId as string;

  useEffect(() => {
    console.warn(`[DeprecatedTakeExamPage ${examId}] Accessed. Redirecting to join exam. This page is deprecated.`);
    router.replace(`/student/dashboard/join-exam`); 
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
            This exam taking page is no longer in use. Exams are now launched via a secure SEB entry flow.
          </CardDescription>
           <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto my-3" />
           <p className="text-sm text-muted-foreground">
            You are being redirected.
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

