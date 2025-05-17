
// src/components/seb/seb-live-test-client.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Exam, Question, ExamSubmissionInsert, FlaggedEvent, CustomUser } from '@/types/supabase';
import { ExamTakingInterface } from '@/components/shared/exam-taking-interface';
import { Loader2, AlertTriangle, ShieldAlert, ServerCrash, XCircle, CheckCircle, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { isSebEnvironment, attemptBlockShortcuts, disableContextMenu, disableCopyPaste, isOnline, areDevToolsLikelyOpen, isWebDriverActive } from '@/lib/seb-utils';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export function SebLiveTestClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { supabase, isLoading: authContextIsLoading, authError: contextAuthError } = useAuth();
  const { toast } = useToast();

  const [examDetails, setExamDetails] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [studentProfile, setStudentProfile] = useState<Pick<CustomUser, 'user_id' | 'name' | 'avatar_url'> | null>(null);
  
  const [pageIsLoading, setPageIsLoading] = useState(true); // Start with true
  const [pageError, setPageError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const examIdFromUrl = searchParams?.get('examId');
  const studentIdFromUrl = searchParams?.get('studentId'); 

  const handleSebQuit = useCallback(() => {
     toast({ title: "Exiting SEB", description: "Safe Exam Browser will close.", duration: 3000 });
     if (typeof window !== 'undefined') window.location.href = "seb://quit";
  },[toast]);

  // Combined Initialization and Data Fetching Effect
  useEffect(() => {
    const effectId = `[SebLiveTestClient MainEffect ${Date.now().toString().slice(-4)}]`;
    console.log(`${effectId} Running. AuthLoading: ${authContextIsLoading}, Supabase: ${!!supabase}, examId: ${examIdFromUrl}, studentId: ${studentIdFromUrl}`);

    setPageIsLoading(true); // Ensure loading is true at the start of this effect
    setPageError(null);

    // Phase 1: Prerequisite Checks (Auth, Supabase, Params, SEB Env)
    if (authContextIsLoading) {
      console.log(`${effectId} Waiting: AuthContext is loading.`);
      // Keep pageIsLoading true; UI will show "Initializing secure context..."
      return; 
    }

    if (!supabase) {
      const sbError = `CRITICAL: Supabase client not available. ${contextAuthError || "Reason unknown."}`;
      console.error(`${effectId} ${sbError}`);
      setPageError(sbError + " SEB will quit.");
      toast({ title: "Internal Error", description: "Service connection failed. Quitting SEB.", variant: "destructive", duration: 7000 });
      setPageIsLoading(false);
      setTimeout(handleSebQuit, 6000);
      return;
    }
    console.log(`${effectId} Supabase client available.`);

    if (!isSebEnvironment()) {
      setPageError("CRITICAL: Not in SEB environment. This page is restricted.");
      toast({ title: "SEB Required", description: "Redirecting...", variant: "destructive", duration: 4000 });
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
      setPageIsLoading(false);
      setTimeout(handleSebQuit, 6000);
      return;
    }

    if (!examIdFromUrl || !studentIdFromUrl) {
      setPageError("Exam ID or Student ID missing. Invalid exam entry. SEB will quit.");
      toast({ title: "Invalid Session", description: "Exam parameters missing. Quitting SEB.", variant: "destructive", duration: 7000 });
      setPageIsLoading(false);
      setTimeout(handleSebQuit, 6000);
      return;
    }
    console.log(`${effectId} Initial checks passed.`);

    // Phase 2: Data Fetching
    const fetchData = async () => {
      console.log(`${effectId} Fetching exam and student data... examId: ${examIdFromUrl}, studentId: ${studentIdFromUrl}`);
      try {
        const [examRes, studentRes] = await Promise.all([
          supabase.from('ExamX').select('*').eq('exam_id', examIdFromUrl).single(),
          supabase.from('proctorX').select('user_id, name, avatar_url').eq('user_id', studentIdFromUrl).single()
        ]);

        if (examRes.error || !examRes.data) {
          throw new Error(examRes.error?.message || "Exam not found.");
        }
        if (studentRes.error || !studentRes.data) {
          throw new Error(studentRes.error?.message || "Student profile not found.");
        }

        const currentExam = examRes.data as Exam;
        if (!currentExam.questions || currentExam.questions.length === 0) {
          throw new Error("This exam has no questions. Contact your instructor.");
        }

        setExamDetails(currentExam);
        setQuestions(currentExam.questions);
        setStudentProfile(studentRes.data as Pick<CustomUser, 'user_id' | 'name' | 'avatar_url'>);
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
          console.warn(`${effectId} Error upserting 'In Progress' submission:`, submissionUpsertError.message);
          toast({title: "Warning", description: "Could not record exam start. Proceeding.", variant: "default"});
        }
        setPageError(null); // Clear any previous non-critical errors
      } catch (e: any) {
        console.error(`${effectId} Error fetching data:`, e.message);
        setPageError(e.message || "Failed to load exam data.");
        toast({ title: "Exam Load Error", description: e.message + " SEB will quit.", variant: "destructive", duration: 7000 });
        setTimeout(handleSebQuit, 6000);
      } finally {
        setPageIsLoading(false); // Data fetch complete or failed
        console.log(`${effectId} Data fetching phase complete. isLoading: false`);
      }
    };

    if (!examDetails && !studentProfile) { // Only fetch if data isn't already loaded
        fetchData();
    } else {
        console.log(`${effectId} Exam/student data already present. Skipping fetch. Setting isLoading to false.`);
        setPageIsLoading(false); // Data already loaded
    }

  }, [authContextIsLoading, supabase, examIdFromUrl, studentIdFromUrl, router, toast, handleSebQuit, contextAuthError, examDetails, studentProfile]); // Added examDetails & studentProfile to prevent re-fetch if already loaded


  // SEB-specific event listeners for security
  useEffect(() => {
    if (!isSebEnvironment() || pageError || !examDetails) return;

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
  }, [pageError, examDetails, toast]); // Dependencies ensure listeners are correctly added/removed based on state


  const handleActualSubmit = useCallback(async (answers: Record<string, string>, flaggedEvents: FlaggedEvent[], submissionType: 'submit' | 'timeup') => {
    const operationId = `[SebLiveTestClient handleActualSubmit ${Date.now().toString().slice(-4)}]`;
    if (!studentIdFromUrl || !examDetails) {
        toast({title: "Submission Error", description: "Student or Exam details missing for submission.", variant: "destructive"});
        return;
    }
    
    const submissionPayload: Omit<ExamSubmissionInsert, 'submission_id' | 'started_at' | 'score'> = {
        exam_id: examDetails.exam_id,
        student_user_id: studentIdFromUrl,
        answers: answers,
        flagged_events: flaggedEvents.length > 0 ? flaggedEvents : null,
        status: 'Completed',
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
        try {
            // Attempt to parse error from server if available
            const errorResult = await response.json();
            errorMsg = errorResult.error || errorMsg;
        } catch (e) {
            // If JSON parsing fails (e.g. server sent plain text error), use statusText
            errorMsg = response.statusText || errorMsg;
            console.warn(`${operationId} Could not parse error response as JSON. Status: ${response.status}, StatusText: ${response.statusText}`);
        }
        throw new Error(errorMsg);
      }
      
      const result = await response.json(); // Safe to call .json() as response.ok was true
      console.log(`${operationId} Submission API success, result:`, result);
      
      setIsSubmitted(true);
      if (typeof window !== 'undefined') sessionStorage.setItem(`exam-${examDetails.exam_id}-finished`, 'true');
      toast({ title: submissionType === 'submit' ? "Exam Submitted!" : "Exam Auto-Submitted!", description: "Your responses have been recorded. SEB will now quit.", duration: 10000 });
      // SEB quit is handled by the success UI in the render block after setIsSubmitted(true)

    } catch(e: any) {
      console.error(`${operationId} Submission API error:`, e.message, e);
      setPageError("Failed to submit exam: " + e.message + ". Please contact support. SEB will quit.");
      toast({ title: "Submission Error", description: e.message + ". Quitting SEB.", variant: "destructive", duration: 10000 });
      setTimeout(handleSebQuit, 9000);
    }
  }, [studentIdFromUrl, examDetails, toast, handleSebQuit]);

  const handleSubmitExamSeb = useCallback((answers: Record<string, string>, flaggedEvents: FlaggedEvent[]) => {
    return handleActualSubmit(answers, flaggedEvents, 'submit');
  }, [handleActualSubmit]);

  const handleTimeUpSeb = useCallback((answers: Record<string, string>, flaggedEvents: FlaggedEvent[]) => {
    return handleActualSubmit(answers, flaggedEvents, 'timeup');
  }, [handleActualSubmit]);


  if (pageIsLoading) { // This covers authContextIsLoading implicitly due to the useEffect logic
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
       <div className="flex items-center justify-center min-h-screen bg-destructive/10 text-destructive-foreground p-4">
        <Card className="w-full max-w-md modern-card text-center shadow-xl bg-card/80 backdrop-blur-lg border-destructive">
          <CardHeader className="pt-8 pb-4">
            <XCircle className="h-16 w-16 text-destructive mx-auto mb-5" />
            <CardTitle className="text-2xl text-destructive">Exam Session Error</CardTitle>
          </CardHeader>
          <CardContent className="pb-6">
            <p className="text-sm text-card-foreground mb-6">{pageError}</p>
             <Button onClick={handleSebQuit} className="w-full btn-gradient-destructive">Exit SEB</Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!examDetails || !studentProfile) { 
     // This state should ideally be caught by pageError if fetching failed,
     // but as a fallback:
     return (
       <div className="flex items-center justify-center min-h-screen bg-background text-foreground p-4">
        <Card className="w-full max-w-md modern-card text-center shadow-xl bg-card/80 backdrop-blur-lg">
           <CardHeader className="pt-8 pb-4">
            <ServerCrash className="h-16 w-16 text-orange-500 mx-auto mb-5" />
            <CardTitle className="text-2xl text-orange-500">Exam Data Unavailable</CardTitle>
          </CardHeader>
          <CardContent className="pb-6">
            <p className="text-sm text-muted-foreground mb-6">Could not load exam or student content. This might be due to an issue with the provided Exam ID or Student ID. SEB will attempt to quit.</p>
             <Button onClick={handleSebQuit} className="w-full btn-gradient-destructive">Exit SEB</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-background/90 backdrop-blur-md p-6 text-center">
        <Card className="w-full max-w-lg modern-card shadow-2xl p-8 bg-card">
          <CardHeader className="pb-5">
            <CheckCircle className="h-20 w-20 text-green-500 dark:text-green-400 mx-auto mb-5" />
            <h2 className="text-2xl font-semibold text-foreground">Exam Submitted Successfully!</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Your responses for "{examDetails.title}" have been recorded.
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">You may now exit Safe Exam Browser.</p>
          </CardContent>
          <CardFooter className="mt-6">
            <Button onClick={handleSebQuit} className="btn-gradient-positive w-full py-3 text-base rounded-lg shadow-lg">
                <LogOut className="mr-2 h-4 w-4"/> Exit SEB
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <ExamTakingInterface
      examDetails={examDetails}
      questions={questions}
      parentIsLoading={false} // Already handled by this component's isLoading
      examLoadingError={null} // Already handled by this component's pageError
      persistentError={null} 
      cantStartReason={null} // Should be caught by earlier checks if no questions
      onAnswerChange={ (qid, oid) => console.log('[SebLiveTestClient] Answer for Q:' + qid + ' is O:' + oid) }
      onSubmitExam={handleSubmitExamSeb}
      onTimeUp={handleTimeUpSeb}
      isDemoMode={false}
      userIdForActivityMonitor={studentProfile.user_id}
      studentName={studentProfile.name}
      studentRollNumber={studentProfile.user_id} // Use user_id as roll number
      studentAvatarUrl={studentProfile.avatar_url}
      examStarted={true} // Exam session is definitely started if this component renders without error
    />
  );
}

