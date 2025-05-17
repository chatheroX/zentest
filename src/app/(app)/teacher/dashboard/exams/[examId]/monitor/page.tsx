
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';

export default function MonitorExamPage() {
  const router = useRouter();
  const params = useParams();
  const examId = params.examId as string;

  useEffect(() => {
    // Optional: Add a delay before redirecting if you want the user to see the message
    const timer = setTimeout(() => {
      if (examId) {
        router.replace(`/teacher/dashboard/exams/${examId}/details`);
      } else {
        router.replace('/teacher/dashboard/exams');
      }
    }, 3000); // 3 second delay

    return () => clearTimeout(timer);
  }, [examId, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-4">
      <Card className="w-full max-w-md text-center shadow-lg">
        <CardHeader>
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle className="text-2xl">Monitoring Feature Removed</CardTitle>
        </CardHeader>
        <CardContent>
            <CardDescription>
                The live exam monitoring feature is currently not available. You will be redirected shortly.
            </CardDescription>
            <Loader2 className="h-6 w-6 animate-spin mx-auto mt-4 text-primary" />
        </CardContent>
        <CardFooter>
            <Button onClick={() => {
                 if (examId) {
                    router.replace(`/teacher/dashboard/exams/${examId}/details`);
                  } else {
                    router.replace('/teacher/dashboard/exams');
                  }
            }} className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" /> Go Back Now
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
