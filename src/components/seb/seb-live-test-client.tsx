
// src/components/seb/seb-live-test-client.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Exam, Question, FlaggedEvent, CustomUser } from '@/types/supabase';
import { ExamTakingInterface } from '@/components/shared/exam-taking-interface';
import { Loader2, AlertTriangle, ShieldAlert, ServerCrash, XCircle, CheckCircle, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { isSebEnvironment, attemptBlockShortcuts, disableContextMenu, disableCopyPaste, isOnline, areDevToolsLikelyOpen, isWebDriverActive, addInputRestrictionListeners } from '@/lib/seb-utils';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; 
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

// Helper to get a safe error message
function getSafeErrorMessage(e: any, defaultMessage = "An unknown error occurred."): string {
  if (e && typeof e === 'object') {
    if (e.name === 'AbortError') {
      return "The request timed out. Please check your connection and try again.";
    }
    if (typeof e.message === 'string' && e.message.trim() !== '') {
      return e.message;
    }
    try {
      const strError = JSON.stringify(e);
      if (strError !== '{}' && strError.length > 2) return `Error object: ${strError}`;
    } catch (stringifyError) { /* Fall through */ }
  }
  if (e !== null && e !== undefined) {
    const stringifiedError = String(e);
    if (stringifiedError.trim() !== '' && stringifiedError !== '[object Object]') {
      return stringifiedError;
    }
  }
  return defaultMessage;
}


export function SebLiveTestClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { supabase, isLoading: authContextIsLoading, authError: contextAuthError } = useAuth();
  const { toast } = useToast();

  const [examDetails, setExamDetails] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [studentProfile, setStudentProfile] = useState<Pick<CustomUser, 'user_id' | 'name' | 'avatar_url' | 'email'> | null>(null);
  
  const [pageIsLoading, setPageIsLoading] = useState(true); 
  const [pageError, setPageError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [examActuallyStarted, setExamActuallyStarted] = useState(false);

  const examIdFromUrl = searchParams?.get('examId');
  const studentIdFromUrl = searchParams?.get('studentId'); 

  const handleSebQuit = useCallback(() => {
     toast({ title: "Exiting SEB", description: "Safe Exam Browser will close.", duration: 3000 });
     if (typeof window !== 'undefined') window.location.href = "seb://quit";
  },[toast]);

  useEffect(() => {
    const effectId = `[SebLiveTestClient MainEffect ${Date.now().toString().slice(-4)}]`;
    console.log(`${effectId} Running. AuthLoading: ${authContextIsLoading}, Supabase: ${!!supabase}, examId: ${examIdFromUrl}, studentId: ${studentIdFromUrl}`);

    setPageIsLoading(true); 
    setPageError(null);

    if (authContextIsLoading) {
      console.log(`${effectId} Waiting: AuthContext is loading.`);
      return; 
    }

    if (!supabase) {
      const sbError = getSafeErrorMessage(contextAuthError, "Supabase client not available.");
      const errorMsg = `CRITICAL: Supabase client not available. ${sbError}`;
      console.error(`${effectId} ${errorMsg}`);
      setPageError(errorMsg + " SEB will quit.");
      toast({ title: "Internal Error", description: "Service connection failed. Quitting SEB.", variant: "destructive", duration: 7000 });
      // No logErrorToBackend
      setPageIsLoading(false);
      setTimeout(handleSebQuit, 6000);
      return;
    }
    console.log(`${effectId} Supabase client available.`);

    if (!isSebEnvironment()) {
      const errorMsg = "CRITICAL: Not in SEB environment. This page is restricted.";
      setPageError(errorMsg);
      toast({ title: "SEB Required", description: "Redirecting...", variant: "destructive", duration: 4000 });
      // No logErrorToBackend
      setPageIsLoading(false);
      setTimeout(() => router.replace('/unsupported-browser'), 3000);
      return;
    }

    let integrityError = '';
    if (!isOnline()) integrityError = "No internet connection.";
    else if (areDevToolsLikelyOpen()) integrityError = "Developer tools detected.";
    else if (isWebDriverActive()) integrityError = "WebDriver (automation) detected.";

    if (integrityError) {
      const errorMsg = `Critical system integrity check failed: ${integrityError}. Cannot proceed. SEB will quit.`;
      setPageError(errorMsg);
      toast({ title: "Security Alert", description: `Integrity check failed: ${integrityError}. Quitting SEB.`, variant: "destructive", duration: 7000 });
      // No logErrorToBackend
      setPageIsLoading(false);
      setTimeout(handleSebQuit, 6000);
      return;
    }

    if (!examIdFromUrl || !studentIdFromUrl) {
      const errorMsg = "Exam ID or Student ID missing. Invalid exam entry.";
      setPageError(errorMsg + " SEB will quit.");
      toast({ title: "Invalid Session", description: "Exam parameters missing. Quitting SEB.", variant: "destructive", duration: 7000 });
      // No logErrorToBackend
      setPageIsLoading(false);
      setTimeout(handleSebQuit, 6000);
      return;
    }
    console.log(`${effectId} Initial checks passed.`);

    const fetchData = async () => {
      console.log(`${effectId} Fetching exam and student data... examId: ${examIdFromUrl}, studentId: ${studentIdFromUrl}`);
      try {
        const [examRes, studentRes] = await Promise.all([
          supabase.from('ExamX').select('*').eq('exam_id', examIdFromUrl).single(),
          supabase.from('proctorX').select('user_id, name, avatar_url, email').eq('user_id', studentIdFromUrl).single()
        ]);

        if (examRes.error || !examRes.data) {
           const errorMsg = getSafeErrorMessage(examRes.error, `Exam not found (ID: ${examIdFromUrl}).`);
          throw new Error(errorMsg);
        }
        if (studentRes.error || !studentRes.data) {
          const errorMsg = getSafeErrorMessage(studentRes.error, `Student profile not found (ID: ${studentIdFromUrl}).`);
          throw new Error(errorMsg);
        }

        const currentExam = examRes.data as Exam;
        if (!currentExam.questions || currentExam.questions.length === 0) {
          throw new Error("This exam has no questions. Contact your instructor.");
        }

        setExamDetails(currentExam);
        setQuestions(currentExam.questions);
        setStudentProfile(studentRes.data as Pick<CustomUser, 'user_id' | 'name' | 'avatar_url' | 'email'>);
        console.log(`${effectId} Exam (${currentExam.title}) and student (${studentRes.data.name}) data fetched.`);
        
        const { error: submissionUpsertError } = await supabase
          .from('ExamSubmissionsX')
          .upsert({
              exam_id: currentExam.exam_id,
              student_user_id: studentIdFromUrl,
              status: 'In Progress', 
              started_at: new Date().toISOString()
          }, { onConflict: 'exam_id, student_user_id' }) 
          .select();
        
        if (submissionUpsertError) {
          const upsertErrorMsg = getSafeErrorMessage(submissionUpsertError, "Could not accurately record exam start time, but proceeding.");
          console.warn(`${effectId} Error upserting 'In Progress' submission:`, upsertErrorMsg);
          // No logErrorToBackend
        }
        setPageError(null);
        setExamActuallyStarted(true); 
      } catch (e: any) {
        const errorMsg = getSafeErrorMessage(e, "Failed to load exam data or student profile.");
        console.error(`${effectId} Error fetching data:`, errorMsg, e);
        setPageError(errorMsg + " SEB will quit.");
        toast({ title: "Exam Load Error", description: errorMsg + " SEB will quit.", variant: "destructive", duration: 7000 });
        // No logErrorToBackend
        setTimeout(handleSebQuit, 6000);
      } finally {
        setPageIsLoading(false); 
        console.log(`${effectId} Data fetching phase complete. isLoading: false`);
      }
    };

    if (!examDetails && !studentProfile) { 
        fetchData();
    } else {
        console.log(`${effectId} Exam/student data already present. Skipping fetch. Setting isLoading to false.`);
        setExamActuallyStarted(true);
        setPageIsLoading(false); 
    }

  }, [authContextIsLoading, supabase, examIdFromUrl, studentIdFromUrl, router, toast, handleSebQuit, contextAuthError, examDetails, studentProfile]); 


  useEffect(() => {
    if (!isSebEnvironment() || pageError || !examDetails || !examActuallyStarted) return;

    const effectId = `[SebLiveTestClient SecurityListeners ${Date.now().toString().slice(-4)}]`;
    console.log(`${effectId} Adding SEB security event listeners because exam has actually started.`);
    
    document.addEventListener('contextmenu', disableContextMenu);
    window.addEventListener('keydown', attemptBlockShortcuts);
    document.addEventListener('copy', disableCopyPaste);
    document.addEventListener('paste', disableCopyPaste);
    
    const beforeUnloadHandler = (event: BeforeUnloadEvent) => {
        console.warn(`${effectId} Attempt to unload/refresh page blocked.`);
        toast({ title: "Navigation Blocked", description: "Page refresh/close is disabled.", variant:"destructive", duration: 3000 });
        event.preventDefault();
        event.returnValue = ''; 
        return event.returnValue;
    };
    window.addEventListener('beforeunload', beforeUnloadHandler);

    const cleanupInputRestriction = addInputRestrictionListeners((eventData) => {
      console.warn('Disallowed key pressed during exam:', eventData);
      // No logErrorToBackend
    });

    return () => {
      console.log(`${effectId} Removing SEB security event listeners.`);
      document.removeEventListener('contextmenu', disableContextMenu);
      window.removeEventListener('keydown', attemptBlockShortcuts);
      document.removeEventListener('copy', disableCopyPaste);
      document.removeEventListener('paste', disableCopyPaste);
      window.removeEventListener('beforeunload', beforeUnloadHandler);
      cleanupInputRestriction();
    };
  }, [pageError, examDetails, toast, examActuallyStarted, studentIdFromUrl]); 


  const handleActualSubmit = useCallback(async (answers: Record<string, string>, flaggedEvents: FlaggedEvent[], submissionType: 'submit' | 'timeup') => {
    const operationId = `[SebLiveTestClient handleActualSubmit ${Date.now().toString().slice(-4)}]`;
    if (!studentIdFromUrl || !examDetails) {
        const errorMsg = "Student or Exam details missing for submission.";
        toast({title: "Submission Error", description: errorMsg, variant: "destructive"});
        // No logErrorToBackend
        return;
    }
    
    const submissionPayload = { 
        exam_id: examDetails.exam_id,
        student_user_id: studentIdFromUrl,
        answers: answers,
        flagged_events: flaggedEvents.length > 0 ? flaggedEvents : null,
        status: 'Completed' as 'Completed',
        submitted_at: new Date().toISOString(),
    };

    console.log(`${operationId} ${submissionType} submission. Data for student_id: ${studentIdFromUrl}, exam_id: ${examDetails.exam_id}`);
    try {
      const response = await fetch('/api/seb/submit-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionPayload),
      });

      const responseBody = await response.json().catch(() => ({ error: "Failed to parse submission API response as JSON." }));

      if (!response.ok) {
        const errorMsg = getSafeErrorMessage(responseBody, `Failed to submit with status: ${response.status}`);
        setPageError("Failed to submit exam: " + errorMsg + ". Please contact support. SEB will quit.");
        toast({ title: "Submission Error", description: errorMsg + ". Quitting SEB.", variant: "destructive", duration: 10000 });
        // No logErrorToBackend
        setTimeout(handleSebQuit, 9000);
        return;
      }
      
      console.log(`${operationId} Submission API success, result:`, responseBody);
      
      setIsSubmitted(true);
      if (typeof window !== 'undefined') sessionStorage.setItem(`exam-${examDetails.exam_id}-finished`, 'true');
      toast({ title: submissionType === 'submit' ? "Exam Submitted!" : "Exam Auto-Submitted!", description: "Your responses have been recorded. SEB will now quit.", duration: 10000 });
      setTimeout(handleSebQuit, 9000); 

    } catch(e: any) {
      const errorMsg = getSafeErrorMessage(e, "Failed to submit exam.");
      console.error(`${operationId} Submission API error:`, errorMsg, e);
      setPageError("Failed to submit exam: " + errorMsg + ". Please contact support. SEB will quit.");
      toast({ title: "Submission Error", description: errorMsg + ". Quitting SEB.", variant: "destructive", duration: 10000 });
      // No logErrorToBackend
      setTimeout(handleSebQuit, 9000);
    }
  }, [studentIdFromUrl, examDetails, toast, handleSebQuit]);

  const handleSubmitExamSeb = useCallback((answers: Record<string, string>, flaggedEvents: FlaggedEvent[]) => {
    return handleActualSubmit(answers, flaggedEvents, 'submit');
  }, [handleActualSubmit]);

  const handleTimeUpSeb = useCallback((answers: Record<string, string>, flaggedEvents: FlaggedEvent[]) => {
    return handleActualSubmit(answers, flaggedEvents, 'timeup');
  }, [handleActualSubmit]);


  if (pageIsLoading) { 
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4 text-center">
        <Loader2 className="h-16 w-16 text-primary animate-spin mb-6" />
        <h2 className="text-xl font-medium text-foreground mb-1">
          {authContextIsLoading ? "Initializing secure context..." : 
           (!examIdFromUrl || !studentIdFromUrl) ? "Verifying exam parameters..." :
           "Loading Live Exam Environment..."}
        </h2>
         <div className="flex items-center text-muted-foreground/80 mt-4">
             <ShieldAlert className="h-5 w-5 mr-2 text-primary" />
             <p className="text-sm">Secure Exam Environment Active. Please wait.</p>
         </div>
      </div>
    );
  }
  
  if (pageError) { 
     return (
       <div className="flex items-center justify-center min-h-screen bg-background text-foreground p-4">
        <Alert variant="destructive" className="w-full max-w-md text-center p-8 rounded-xl shadow-2xl border">
          <XCircle className="h-16 w-16 text-destructive mx-auto mb-5" />
          <AlertTitle className="text-2xl font-semibold mb-3">Exam Session Error</AlertTitle>
          <AlertDescription className="text-sm mb-6">{pageError}</AlertDescription>
          <Button onClick={handleSebQuit} className="w-full btn-gradient-destructive">Exit SEB</Button>
        </Alert>
      </div>
    );
  }
  
  if (!examDetails || !studentProfile || !examActuallyStarted) { 
     return ( 
       <div className="flex items-center justify-center min-h-screen bg-background text-foreground p-4">
        <Alert variant="destructive" className="w-full max-w-md text-center p-8 rounded-xl shadow-2xl border">
           <ServerCrash className="h-16 w-16 text-destructive mx-auto mb-5" />
            <AlertTitle className="text-2xl font-semibold mb-3">Exam Data Unavailable</AlertTitle>
            <AlertDescription className="text-sm mb-6">Could not load exam or student content. Please contact support if this issue persists after retrying. SEB will attempt to quit.</AlertDescription>
             <Button onClick={handleSebQuit} className="w-full btn-gradient-destructive">Exit SEB</Button>
        </Alert>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-background/90 backdrop-blur-md p-6 text-center">
        <Alert className="w-full max-w-lg shadow-2xl p-8 bg-card border-green-500 dark:border-green-400">
          <CheckCircle className="h-20 w-20 text-green-500 dark:text-green-400 mx-auto mb-5" />
          <AlertTitle className="text-2xl font-semibold text-foreground">Exam Submitted Successfully!</AlertTitle>
          <AlertDescription className="text-muted-foreground mt-2 text-sm">
            Your responses for "{examDetails.title}" have been recorded.
            SEB should close automatically. If not, click below.
          </AlertDescription>
          <div className="mt-6">
            <Button onClick={handleSebQuit} className="btn-gradient-positive w-full py-3 text-base rounded-lg shadow-lg">
                <LogOut className="mr-2 h-4 w-4"/> Exit SEB
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <ExamTakingInterface
      examDetails={examDetails}
      questions={questions}
      parentIsLoading={false} 
      examLoadingError={null} 
      persistentError={null} 
      cantStartReason={null} 
      onAnswerChange={ (qid, oid) => console.log('[SebLiveTestClient] Answer for Q:' + qid + ' is O:' + oid) }
      onSubmitExam={handleSubmitExamSeb}
      onTimeUp={handleTimeUpSeb}
      isDemoMode={false}
      userIdForActivityMonitor={studentProfile.user_id}
      studentName={studentProfile.name}
      studentRollNumber={studentProfile.user_id} 
      studentAvatarUrl={studentProfile.avatar_url}
      examStarted={examActuallyStarted} 
    />
  );
}
