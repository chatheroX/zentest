
// This page is now effectively DEPRECATED as the "Join Exam" page handles SEB launch directly.
// It will redirect to join exam page or dashboard if accessed directly.
'use client';

import React, { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function DeprecatedSebRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const examId = params.examId as string; 

  useEffect(() => {
    console.warn(`[DeprecatedSebRedirectPage ${examId}] Accessed. This page is deprecated. Redirecting to join exam page...`);
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
            This SEB redirect page is no longer in use. The exam launch process has been updated.
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

