
// src/components/seb/seb-live-test-client.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Exam, Question, ExamSubmissionInsert, FlaggedEvent, CustomUser } from '@/types/supabase';
import { ExamTakingInterface } from '@/components/shared/exam-taking-interface';
import { Loader2, AlertTriangle, ShieldAlert, ServerCrash, XCircle, CheckCircle, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { isSebEnvironment, attemptBlockShortcuts, disableContextMenu, disableCopyPaste, isOnline, areDevToolsLikelyOpen, isWebDriverActive } from '@/lib/seb-utils';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function SebLiveTestClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createSupabaseBrowserClient();
  const { toast } = useToast();

  const [examDetails, setExamDetails] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [studentProfile, setStudentProfile] = useState<Pick<CustomUser, 'user_id' | 'name' | 'avatar_url'> | null>(null);
  const [pageIsLoading, setPageIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [isValidSession, setIsValidSession] = useState<boolean | undefined>(undefined);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const examIdFromUrl = searchParams?.get('examId');
  const studentIdFromUrl = searchParams?.get('studentId'); // Student ID passed from /seb/entry

  // Step 1: SEB Environment Check & Basic Security
  useEffect(() => {
    setPageIsLoading(true);
    setError(null);
    setIsValidSession(undefined);

    if (!isSebEnvironment()) {
      setPageError("CRITICAL: Not in SEB environment. This page is restricted.");
      toast({ title: "SEB Required", description: "Redirecting...", variant: "destructive", duration: 4000 });
      setTimeout(() => router.replace('/unsupported-browser'), 3000);
      setIsValidSession(false);
      setPageIsLoading(false);
      return;
    }
    if (!isOnline() || areDevToolsLikelyOpen() || isWebDriverActive()) {
      setPageError("Critical system integrity check failed. Cannot proceed. SEB will quit.");
      toast({ title: "Security Alert", description: "System integrity compromised. Quitting SEB.", variant: "destructive", duration: 7000 });
      setIsValidSession(false);
      setPageIsLoading(false);
      setTimeout(() => { if (typeof window !== 'undefined') window.location.href = "seb://quit"; }, 6000);
      return;
    }

    if (!examIdFromUrl || !studentIdFromUrl) {
      setPageError("Exam ID or Student ID missing from URL. Invalid exam entry. SEB will quit.");
      toast({ title: "Invalid Session", description: "Exam parameters missing. Quitting SEB.", variant: "destructive", duration: 7000 });
      setIsValidSession(false);
      setPageIsLoading(false);
      setTimeout(() => { if (typeof window !== 'undefined') window.location.href = "seb://quit"; }, 6000);
      return;
    }
    
    console.log("[SebLiveTestClient] SEB Checks Passed. examId:", examIdFromUrl, "studentId:", studentIdFromUrl);
    setIsValidSession(true);
    // isLoading will be set to false after data fetching
  }, [examIdFromUrl, studentIdFromUrl, router, toast]);


  // Step 2: Fetch Exam Data & Student Profile if session is valid
  const fetchExamAndStudentData = useCallback(async () => {
    if (!examIdFromUrl || !studentIdFromUrl || !supabase) {
      setPageError("Cannot fetch data: Critical information missing.");
      setPageIsLoading(false);
      return;
    }
    
    console.log('[SebLiveTestClient] Fetching exam and student data...');
    setPageIsLoading(true); 
    setPageError(null);
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
        throw new Error("This exam has no questions.");
      }

      setExamDetails(currentExam);
      setQuestions(currentExam.questions);
      setStudentProfile(studentRes.data as Pick<CustomUser, 'user_id' | 'name' | 'avatar_url'>);
      console.log("[SebLiveTestClient] Exam and student data fetched successfully.");

      // Record or update "In Progress" submission
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
        console.warn("[SebLiveTestClient] Error upserting 'In Progress' submission:", submissionUpsertError.message);
        toast({title: "Warning", description: "Could not record exam start. Proceeding.", variant: "default"});
      }

    } catch (e: any) {
      console.error("[SebLiveTestClient] Error fetching data:", e.message);
      setPageError(e.message || "Failed to load exam data.");
      toast({ title: "Exam Load Error", description: e.message, variant: "destructive", duration: 7000 });
      setTimeout(() => { if (typeof window !== 'undefined') window.location.href = "seb://quit"; }, 6000);
    } finally {
      setPageIsLoading(false);
    }
  }, [examIdFromUrl, studentIdFromUrl, supabase, toast]);

  useEffect(() => {
    if (isValidSession === true && !examDetails && !studentProfile) {
        fetchExamAndStudentData();
    }
  }, [isValidSession, examDetails, studentProfile, fetchExamAndStudentData]);


  // Step 3: SEB-specific event listeners for security
  useEffect(() => {
    if (!isSebEnvironment() || isValidSession === false) return;

    console.log("[SebLiveTestClient] Adding SEB security event listeners.");
    document.addEventListener('contextmenu', disableContextMenu);
    window.addEventListener('keydown', attemptBlockShortcuts);
    document.addEventListener('copy', disableCopyPaste);
    document.addEventListener('paste', disableCopyPaste);
    
    const beforeUnloadHandler = (event: BeforeUnloadEvent) => {
        console.warn("[SebLiveTestClient] Attempt to unload/refresh page blocked.");
        toast({ title: "Navigation Blocked", description: "Page refresh/close is disabled.", variant:"destructive", duration: 3000 });
        event.preventDefault();
        event.returnValue = '';
        return event.returnValue;
    };
    window.addEventListener('beforeunload', beforeUnloadHandler);

    return () => {
      console.log("[SebLiveTestClient] Removing SEB security event listeners.");
      document.removeEventListener('contextmenu', disableContextMenu);
      window.removeEventListener('keydown', attemptBlockShortcuts);
      document.removeEventListener('copy', disableCopyPaste);
      document.removeEventListener('paste', disableCopyPaste);
      window.removeEventListener('beforeunload', beforeUnloadHandler);
    };
  }, [isValidSession, toast]);


  const handleActualSubmit = useCallback(async (answers: Record<string, string>, flaggedEvents: FlaggedEvent[], submissionType: 'submit' | 'timeup') => {
    if (!studentIdFromUrl || !examDetails) {
        toast({title: "Submission Error", description: "Student or Exam details missing.", variant: "destructive"});
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

    console.log('[SebLiveTestClient] ' + submissionType + ' submission. Data:', submissionPayload);
    try {
      const response = await fetch('/api/seb/submit-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionPayload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to submit with status: ${response.status}`);
      }
      
      setIsSubmitted(true);
      if (typeof window !== 'undefined') sessionStorage.setItem(`exam-${examDetails.exam_id}-finished`, 'true');
      toast({ title: submissionType === 'submit' ? "Exam Submitted!" : "Exam Auto-Submitted!", description: "Your responses have been recorded. SEB will now quit.", duration: 10000 });
      // SEB quit is handled by the success UI in the render block after setIsSubmitted(true)

    } catch(e: any) {
      console.error("[SebLiveTestClient] Submission API error:", e);
      setPageError("Failed to submit exam: " + e.message + ". Please contact support. SEB will quit.");
      toast({ title: "Submission Error", description: e.message + ". Quitting SEB.", variant: "destructive", duration: 10000 });
      setTimeout(() => { if (typeof window !== 'undefined') window.location.href = "seb://quit"; }, 9000);
    }
  }, [studentIdFromUrl, examDetails, supabase, toast]);

  const handleSubmitExamSeb = useCallback((answers: Record<string, string>, flaggedEvents: FlaggedEvent[]) => {
    return handleActualSubmit(answers, flaggedEvents, 'submit');
  }, [handleActualSubmit]);

  const handleTimeUpSeb = useCallback((answers: Record<string, string>, flaggedEvents: FlaggedEvent[]) => {
    return handleActualSubmit(answers, flaggedEvents, 'timeup');
  }, [handleActualSubmit]);

  const handleSebQuit = useCallback(() => {
     toast({ title: "Exiting SEB", description: "Safe Exam Browser will close.", duration: 3000 });
     if (typeof window !== 'undefined') window.location.href = "seb://quit";
  },[toast]);


  if (pageIsLoading || isValidSession === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 p-4 text-center">
        <Loader2 className="h-16 w-16 text-primary animate-spin mb-6" />
        <h2 className="text-xl font-medium text-slate-200 mb-1">
          {isValidSession === undefined ? "Validating Secure Exam Link..." : "Loading Live Exam Environment..."}
        </h2>
         <div className="flex items-center text-yellow-400 mt-4">
             <ShieldAlert className="h-5 w-5 mr-2" />
             <p className="text-sm">Secure Exam Environment Active. Please wait.</p>
         </div>
      </div>
    );
  }
  
  if (pageError || isValidSession === false) { 
     return (
       <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-800 to-red-950 p-4">
        <Card className="w-full max-w-md modern-card text-center shadow-xl bg-card/80 backdrop-blur-lg border-destructive">
          <CardHeader className="pt-8 pb-4">
            <XCircle className="h-16 w-16 text-destructive mx-auto mb-5" />
            <CardTitle className="text-2xl text-destructive">Exam Session Error</CardTitle>
          </CardHeader>
          <CardContent className="pb-6">
            <p className="text-sm text-muted-foreground mb-6">{pageError || "Invalid exam session. SEB will quit."}</p>
             <Button onClick={handleSebQuit} className="w-full btn-gradient-destructive">Exit SEB</Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!examDetails || !studentProfile) { // Should be caught by error state above, but as fallback
     return (
       <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 p-4">
        <Card className="w-full max-w-md modern-card text-center shadow-xl bg-card/80 backdrop-blur-lg">
           <CardHeader className="pt-8 pb-4">
            <ServerCrash className="h-16 w-16 text-orange-500 mx-auto mb-5" />
            <CardTitle className="text-2xl text-orange-500">Exam Data Unavailable</CardTitle>
          </CardHeader>
          <CardContent className="pb-6">
            <p className="text-sm text-muted-foreground mb-6">Could not load exam or student content. SEB will attempt to quit.</p>
             <Button onClick={handleSebQuit} className="w-full btn-gradient-destructive">Exit SEB</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-gradient-to-br from-green-800/80 via-emerald-900/80 to-teal-900/80 backdrop-blur-md p-6 text-center">
        <Card className="w-full max-w-lg modern-card shadow-2xl p-8 bg-card/90 dark:bg-card/85">
          <CardHeader className="pb-5">
            <CheckCircle className="h-20 w-20 text-green-400 mx-auto mb-5" />
            <h2 className="text-2xl font-semibold text-slate-100">Exam Submitted Successfully!</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Your responses for "{examDetails.title}" have been recorded.
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400">You may now exit Safe Exam Browser.</p>
          </CardContent>
          <CardFooter className="mt-6">
            <Button onClick={handleSebQuit} className="btn-gradient-positive w-full py-3 text-base rounded-lg shadow-lg hover:shadow-green-500/30">
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
