
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ExternalLink, ShieldAlert, LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Exam, SebEntryTokenInsert, CustomUser } from '@/types/supabase';
import { getEffectiveExamStatus } from '@/app/(app)/teacher/dashboard/exams/[examId]/details/page';
import { useAuth } from '@/contexts/AuthContext';

// TOKEN_EXPIRY_MINUTES defines how long the server-side token is valid for claiming.
const TOKEN_EXPIRY_MINUTES = 5; 

export default function JoinExamPage() {
  const [examCode, setExamCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { user: studentUser, isLoading: authLoading, supabase: authSupabase } = useAuth();
  const router = useRouter();

  const generateRandomToken = (length = 64) => {
    const array = new Uint8Array(length / 2);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const operationId = `[JoinExamPage handleSubmit ${Date.now().toString().slice(-5)}]`;
    console.log(`${operationId} Initiated.`);
    setLocalError(null);

    if (!examCode.trim()) {
      toast({ title: "Error", description: "Please enter an exam code.", variant: "destructive" });
      return;
    }
    if (authLoading || !studentUser?.user_id) {
      toast({ title: "Authentication Error", description: "Please wait for session to load or log in.", variant: "destructive" });
      setIsLoading(false);
      return;
    }
    if (!authSupabase) {
      toast({ title: "Connection Error", description: "Cannot connect to services. Please try again later.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      console.log(`${operationId} Fetching exam with code: ${examCode.trim().toUpperCase()}`);
      const { data: exam, error: examFetchError } = await authSupabase
        .from('ExamX')
        .select('exam_id, title, description, duration, questions, allow_backtracking, status, teacher_id, start_time, end_time, exam_code')
        .eq('exam_code', examCode.trim().toUpperCase())
        .single();

      if (examFetchError || !exam) {
        const errMsg = examFetchError?.message || "Exam code not found or error fetching exam.";
        toast({ title: "Invalid Code", description: errMsg, variant: "destructive" });
        setLocalError(errMsg);
        setIsLoading(false);
        console.error(`${operationId} Error fetching exam or exam not found:`, examFetchError);
        return;
      }
      console.log(`${operationId} Exam details fetched:`, exam);

      const effectiveStatus = getEffectiveExamStatus(exam as Exam);
      if (effectiveStatus !== 'Ongoing') {
         const statusMsg = "This exam is currently " + effectiveStatus.toLowerCase() + ".";
         toast({ title: "Exam Not Active", description: statusMsg, variant: "default", duration: 7000 });
         setLocalError(statusMsg);
         setIsLoading(false);
         return;
      }
      if (!exam.questions || exam.questions.length === 0) {
        const noQuestionsMsg = "This exam has no questions. Contact your teacher.";
        toast({ title: "Exam Not Ready", description: noQuestionsMsg, variant: "destructive" });
        setLocalError(noQuestionsMsg);
        setIsLoading(false);
        return;
      }
      
      const sebEntryTokenValue = generateRandomToken();
      const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000).toISOString();

      const tokenRecord: SebEntryTokenInsert = {
        token: sebEntryTokenValue,
        student_user_id: studentUser.user_id,
        exam_id: exam.exam_id,
        status: 'pending',
        created_at: new Date().toISOString(),
        expires_at: expiresAt,
      };
      console.log(`${operationId} Generated SEB entry token record:`, tokenRecord);

      const { error: tokenInsertError } = await authSupabase.from('SebEntryTokens').insert(tokenRecord);

      if (tokenInsertError) {
        console.error(`${operationId} Error inserting SEB entry token:`, tokenInsertError);
        const tokenErrorMsg = "Could not create secure entry token: " + tokenInsertError.message;
        toast({ title: "Launch Error", description: tokenErrorMsg, variant: "destructive" });
        setLocalError(tokenErrorMsg);
        setIsLoading(false);
        return;
      }
      console.log(`${operationId} SEB entry token inserted successfully.`);

      // Construct the direct SEB launch URL
      // The Start URL configured INSIDE SEB should be YOUR_APP_DOMAIN/seb/entry/[token]
      // However, SEB typically doesn't support dynamic path segments in its Start URL via config file easily.
      // So, we launch SEB directly to the /seb/entry/[token_value] page.
      const appDomain = window.location.origin;
      const directSebPageUrl = `${appDomain}/seb/entry/${sebEntryTokenValue}`;
      
      // Remove http(s):// prefix and prepend sebs://
      const domainAndPathForSeb = directSebPageUrl.replace(/^https?:\/\//, '');
      const sebLaunchUrl = `sebs://${domainAndPathForSeb}`;
      
      console.log(`${operationId} FINAL SEB LAUNCH URL (Direct to entry page with token in path):`, sebLaunchUrl);
      
      toast({
        title: "Launching Exam in SEB",
        description: "Safe Exam Browser should start. Ensure SEB is installed and configured to allow navigation to this application. Your browser will ask for permission to open SEB.",
        duration: 15000,
      });
      
      window.location.href = sebLaunchUrl;

      setTimeout(() => {
        if (window.location.pathname.includes('join-exam')) { 
          setIsLoading(false); 
          setLocalError("SEB launch may have been blocked or failed. If SEB did not start, check your browser's pop-up settings or SEB installation.");
          toast({ title: "SEB Launch Issue?", description: "If SEB did not open, please check pop-up blockers and ensure SEB is installed correctly.", variant: "destructive", duration: 10000});
        }
      }, 8000);

    } catch (e: any) {
      console.error(`${operationId} Exception during handleSubmit:`, e);
      const exceptionMsg = e.message || "An unexpected error occurred.";
      toast({ title: "Error", description: exceptionMsg, variant: "destructive" });
      setLocalError(exceptionMsg);
      setIsLoading(false);
    }
  }, [examCode, authSupabase, toast, studentUser, authLoading, router]);


  useEffect(() => {
    if (!authLoading && !studentUser) {
      console.log("[JoinExamPage] User not authenticated, redirecting to login.");
      router.replace('/auth');
    }
  }, [authLoading, studentUser, router]);


  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading session...</p>
      </div>
    );
  }

  if (!studentUser) {
     return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-4">
          <Card className="w-full max-w-md modern-card text-center">
            <CardHeader>
                <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" />
                <CardTitle>Authentication Required</CardTitle>
            </CardHeader>
            <CardContent>
                <CardDescription>You need to be logged in to join an exam.</CardDescription>
                 <Button onClick={() => router.push('/auth')} className="mt-6 w-full btn-primary-solid">
                    <LogIn className="mr-2 h-4 w-4"/> Go to Login
                </Button>
            </CardContent>
          </Card>
        </div>
    );
  }


  return (
    <div className="space-y-8 py-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Join Exam</h1>
        <p className="mt-2 text-lg text-muted-foreground">Enter your unique exam code to begin.</p>
      </div>
      <Card className="w-full max-w-lg mx-auto modern-card shadow-2xl border-border/40">
        <form onSubmit={handleSubmit}>
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-semibold text-foreground">Enter Exam Code</CardTitle>
            <CardDescription className="text-muted-foreground/90 pt-1">
              This will attempt to launch the exam directly in Safe Exam Browser.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="examCode" className="text-sm font-medium text-foreground">Exam Code</Label>
              <Input
                id="examCode"
                value={examCode}
                onChange={(e) => {
                  setExamCode(e.target.value.toUpperCase());
                  if(localError) setLocalError(null); 
                }}
                placeholder="e.g., EXMCD123"
                required
                className="text-xl tracking-wider h-12 text-center modern-input bg-background/70 dark:bg-slate-800/50 backdrop-blur-sm focus:ring-primary/70"
                autoComplete="off"
                disabled={isLoading}
              />
            </div>
            {localError && (
                <Alert variant="destructive" className="bg-destructive/10 border-destructive/30 text-destructive dark:text-destructive-foreground/90">
                    <ShieldAlert className="h-5 w-5"/>
                    <AlertTitle className="font-semibold">Error</AlertTitle>
                    <AlertDescription className="text-sm">{localError}</AlertDescription>
                </Alert>
            )}
            <Alert variant="default" className="mt-6 bg-primary/10 border-primary/30 text-primary dark:text-primary/80 dark:bg-primary/15 dark:border-primary/40">
              <ShieldAlert className="h-5 w-5 text-primary" />
              <AlertTitle className="font-semibold text-primary">SEB Required</AlertTitle>
              <AlertDescription className="text-primary/90 dark:text-primary/80 text-sm">
                This exam will open in Safe Exam Browser (SEB). Ensure SEB is installed and configured.
                Your browser will ask for permission to open SEB.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="px-6 pb-6 pt-2">
            <Button type="submit" className="w-full btn-gradient py-3 text-base rounded-md" disabled={isLoading || authLoading || !examCode.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Preparing SEB Launch...
                </>
              ) : (
                'Proceed to SEB Launch'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
       <div className="text-center max-w-lg mx-auto">
        <p className="text-xs text-muted-foreground">
          Having trouble? Ensure you have the latest version of Safe Exam Browser installed. You can download it from 
          <a href="https://safeexambrowser.org/download_en.html" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">
            safeexambrowser.org <ExternalLink className="inline h-3 w-3"/>
          </a>.
        </p>
      </div>
    </div>
  );
}
    