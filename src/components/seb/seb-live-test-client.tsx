
// src/components/seb/seb-live-test-client.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Exam, Question, ExamSubmissionInsert, FlaggedEvent, CustomUser } from '@/types/supabase';
import { ExamTakingInterface } from '@/components/shared/exam-taking-interface';
import { Loader2, AlertTriangle, ShieldAlert, ServerCrash, XCircle, CheckCircle, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { isSebEnvironment, attemptBlockShortcuts, disableContextMenu, disableCopyPaste, isOnline, areDevToolsLikelyOpen, isWebDriverActive, addInputRestrictionListeners } from '@/lib/seb-utils';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; 
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { logErrorToBackend } from '@/lib/error-logging'; // Import shared logger


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
      const sbError = `CRITICAL: Supabase client not available. ${contextAuthError || "Reason unknown."}`;
      console.error(`${effectId} ${sbError}`);
      setPageError(sbError + " SEB will quit.");
      toast({ title: "Internal Error", description: "Service connection failed. Quitting SEB.", variant: "destructive", duration: 7000 });
      logErrorToBackend(new Error(sbError), 'SebLiveTestClient-Init-SupabaseNull');
      setPageIsLoading(false);
      setTimeout(handleSebQuit, 6000);
      return;
    }
    console.log(`${effectId} Supabase client available.`);

    if (!isSebEnvironment()) {
      setPageError("CRITICAL: Not in SEB environment. This page is restricted.");
      toast({ title: "SEB Required", description: "Redirecting...", variant: "destructive", duration: 4000 });
      logErrorToBackend(new Error("Not in SEB environment"), 'SebLiveTestClient-Init-NotSEB');
      setPageIsLoading(false);
      setTimeout(() => router.replace('/unsupported-browser'), 3000);
      return;
    }

    if (!isOnline() || areDevToolsLikelyOpen() || isWebDriverActive()) {
      const integrityError = !isOnline() ? "No internet connection." :
                             areDevToolsLikelyOpen() ? "Developer tools detected." :
                             isWebDriverActive() ? "WebDriver (automation) detected." : "Unknown integrity issue.";
      setPageError(`Critical system integrity check failed: ${integrityError}. Cannot proceed. SEB will quit.`);
      toast({ title: "Security Alert", description: `Integrity check failed: ${integrityError}. Quitting SEB.`, variant: "destructive", duration: 7000 });
      logErrorToBackend(new Error(integrityError), 'SebLiveTestClient-Init-IntegrityFail');
      setPageIsLoading(false);
      setTimeout(handleSebQuit, 6000);
      return;
    }

    if (!examIdFromUrl || !studentIdFromUrl) {
      setPageError("Exam ID or Student ID missing. Invalid exam entry. SEB will quit.");
      toast({ title: "Invalid Session", description: "Exam parameters missing. Quitting SEB.", variant: "destructive", duration: 7000 });
      logErrorToBackend(new Error("Exam ID or Student ID missing in URL"), 'SebLiveTestClient-Init-MissingParams', { examIdFromUrl, studentIdFromUrl });
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
          const errorMsg = (examRes.error && typeof examRes.error.message === 'string') ? examRes.error.message : "Exam not found.";
          throw new Error(errorMsg);
        }
        if (studentRes.error || !studentRes.data) {
          const errorMsg = (studentRes.error && typeof studentRes.error.message === 'string') ? studentRes.error.message : "Student profile not found.";
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
          console.warn(`${effectId} Error upserting 'In Progress' submission (might be okay if already set):`, submissionUpsertError.message);
        }
        setPageError(null);
      } catch (e: any) {
        console.error(`${effectId} Error fetching data:`, e.message);
        const errorMessage = (e && typeof e.message === 'string') ? e.message : String(e);
        setPageError(errorMessage || "Failed to load exam data.");
        toast({ title: "Exam Load Error", description: (errorMessage || "Unknown error") + " SEB will quit.", variant: "destructive", duration: 7000 });
        await logErrorToBackend(e, 'SebLiveTestClient-FetchData-Exception', { examIdFromUrl, studentIdFromUrl });
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
        setPageIsLoading(false); 
    }

  }, [authContextIsLoading, supabase, examIdFromUrl, studentIdFromUrl, router, toast, handleSebQuit, contextAuthError, examDetails, studentProfile]); 


  useEffect(() => {
    if (!isSebEnvironment() || pageError || !examDetails || !enabled) return; // Added enabled check from props

    const effectId = `[SebLiveTestClient SecurityListeners ${Date.now().toString().slice(-4)}]`;
    console.log(`${effectId} Adding SEB security event listeners.`);
    
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

    return () => {
      console.log(`${effectId} Removing SEB security event listeners.`);
      document.removeEventListener('contextmenu', disableContextMenu);
      window.removeEventListener('keydown', attemptBlockShortcuts);
      document.removeEventListener('copy', disableCopyPaste);
      document.removeEventListener('paste', disableCopyPaste);
      window.removeEventListener('beforeunload', beforeUnloadHandler);
    };
  }, [pageError, examDetails, toast, enabled]); // Added enabled to dependency array


  const handleActualSubmit = useCallback(async (answers: Record<string, string>, flaggedEvents: FlaggedEvent[], submissionType: 'submit' | 'timeup') => {
    const operationId = `[SebLiveTestClient handleActualSubmit ${Date.now().toString().slice(-4)}]`;
    if (!studentIdFromUrl || !examDetails) {
        toast({title: "Submission Error", description: "Student or Exam details missing for submission.", variant: "destructive"});
        await logErrorToBackend(new Error("Student or Exam details missing for submission"), 'SebLiveTestClient-ActualSubmit-MissingDetails', { studentIdFromUrl, examId: examDetails?.exam_id });
        return;
    }
    
    const submissionPayload = { // Omit<ExamSubmissionInsert, 'submission_id' | 'started_at' | 'score'>
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

      if (!response.ok) {
        let errorMsg = `Failed to submit with status: ${response.status}`;
        let errorResponseData = null;
        try {
            errorResponseData = await response.json();
            errorMsg = (errorResponseData && typeof errorResponseData.error === 'string') ? errorResponseData.error : errorMsg;
        } catch (e) {
            errorMsg = response.statusText || errorMsg;
            console.warn(`${operationId} Could not parse error response as JSON. Status: ${response.status}, StatusText: ${response.statusText}`);
        }
        setPageError("Failed to submit exam: " + errorMsg + ". Please contact support. SEB will quit.");
        toast({ title: "Submission Error", description: errorMsg + ". Quitting SEB.", variant: "destructive", duration: 10000 });
        await logErrorToBackend(new Error(errorMsg), 'SebLiveTestClient-ActualSubmit-APIError', { status: response.status, response: errorResponseData, studentIdFromUrl, examId: examDetails.exam_id });
        setTimeout(handleSebQuit, 9000);
        return;
      }
      
      const result = await response.json(); 
      console.log(`${operationId} Submission API success, result:`, result);
      
      setIsSubmitted(true);
      if (typeof window !== 'undefined') sessionStorage.setItem(`exam-${examDetails.exam_id}-finished`, 'true');
      toast({ title: submissionType === 'submit' ? "Exam Submitted!" : "Exam Auto-Submitted!", description: "Your responses have been recorded. SEB will now quit.", duration: 10000 });
      setTimeout(handleSebQuit, 9000); 

    } catch(e: any) {
      console.error(`${operationId} Submission API error:`, e.message, e);
      const errorMessage = (e && typeof e.message === 'string') ? e.message : String(e);
      setPageError("Failed to submit exam: " + errorMessage + ". Please contact support. SEB will quit.");
      toast({ title: "Submission Error", description: errorMessage + ". Quitting SEB.", variant: "destructive", duration: 10000 });
      await logErrorToBackend(e, 'SebLiveTestClient-ActualSubmit-Exception', { studentIdFromUrl, examId: examDetails.exam_id });
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
  
  if (!examDetails || !studentProfile) { 
     return (
       <div className="flex items-center justify-center min-h-screen bg-background text-foreground p-4">
        <Alert variant="destructive" className="w-full max-w-md text-center p-8 rounded-xl shadow-2xl border">
           <ServerCrash className="h-16 w-16 text-destructive mx-auto mb-5" />
            <AlertTitle className="text-2xl font-semibold mb-3">Exam Data Unavailable</AlertTitle>
            <AlertDescription className="text-sm mb-6">Could not load exam or student content. This might be due to an issue with the provided Exam ID or Student ID. SEB will attempt to quit.</AlertDescription>
             <Button onClick={handleSebQuit} className="w-full btn-gradient-destructive">Exit SEB</Button>
        </Alert>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-background/90 backdrop-blur-md p-6 text-center">
        <Alert className="w-full max-w-lg shadow-2xl p-8 bg-card border-green-500">
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
      examStarted={true} 
    />
  );
}
