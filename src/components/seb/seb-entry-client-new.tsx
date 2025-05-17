
// src/components/seb/seb-entry-client-new.tsx
'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Keep for security check grouping
import { Loader2, AlertTriangle, PlayCircle, ShieldCheck, XCircle, Info, LogOut, ServerCrash, CheckCircle, Ban, CircleSlash, BookOpen, UserCircle2, CalendarDays, ListChecks } from 'lucide-react';
import type { Exam, CustomUser, FlaggedEvent, ExamSubmission, ExamSubmissionInsert } from '@/types/supabase';
import { useToast } from '@/hooks/use-toast';
import { format, isValid as isValidDate, parseISO } from 'date-fns';
import { isSebEnvironment, isOnline, areDevToolsLikelyOpen, isWebDriverActive, disableContextMenu, attemptBlockShortcuts, disableCopyPaste, addInputRestrictionListeners } from '@/lib/seb-utils';
import { useAuth } from '@/contexts/AuthContext';
import { ExamTakingInterface } from '@/components/shared/exam-taking-interface';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import Image from 'next/image';
import logoAsset from '../../../logo.png';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from '@/lib/utils';

type SebStage =
  | 'initializing'
  | 'validatingToken'
  | 'fetchingDetails'
  | 'readyToStart'
  | 'performingSecurityChecks'
  | 'securityChecksFailed'
  | 'startingExamSession'
  | 'examInProgress'
  | 'submittingExam'
  | 'examCompleted'
  | 'error';

interface SebEntryClientNewProps {
  entryTokenFromPath: string;
}

interface SecurityCheck {
  id: string;
  label: string;
  checkFn: () => boolean | Promise<boolean>;
  isCritical: boolean;
  status: 'pending' | 'checking' | 'passed' | 'failed';
  details?: string;
}

const INITIAL_SECURITY_CHECKS: SecurityCheck[] = [
  { id: 'sebEnv', label: 'SEB Environment Check', checkFn: isSebEnvironment, isCritical: true, status: 'pending' },
  { id: 'online', label: 'Internet Connectivity', checkFn: isOnline, isCritical: true, status: 'pending' },
  { id: 'devTools', label: 'Developer Tools Closed', checkFn: () => !areDevToolsLikelyOpen(), isCritical: true, status: 'pending' },
  { id: 'webDriver', label: 'No Automation (WebDriver)', checkFn: () => !isWebDriverActive(), isCritical: true, status: 'pending' },
];

export function SebEntryClientNew({ entryTokenFromPath }: SebEntryClientNewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { supabase, isLoading: authContextLoading } = useAuth();

  const [stage, setStage] = useState<SebStage>('initializing');
  const [pageError, setPageError] = useState<string | null>(null);

  const [validatedStudentId, setValidatedStudentId] = useState<string | null>(null);
  const [validatedExamId, setValidatedExamId] = useState<string | null>(null);

  const [examDetails, setExamDetails] = useState<Exam | null>(null);
  const [studentProfile, setStudentProfile] = useState<CustomUser | null>(null);
  const [isDataReadyForExam, setIsDataReadyForExam] = useState(false);

  const [showExitSebButton, setShowExitSebButton] = useState(true);
  const [securityChecks, setSecurityChecks] = useState<SecurityCheck[]>(INITIAL_SECURITY_CHECKS.map(c => ({ ...c, status: 'pending' })));
  const [isSubmittingViaApi, setIsSubmittingViaApi] = useState(false);
  const [activityFlagsDuringExam, setActivityFlagsDuringExam] = useState<FlaggedEvent[]>([]);
  

  const handleExitSeb = useCallback(() => {
    toast({ title: "Exiting SEB", description: "Safe Exam Browser will attempt to close.", duration: 3000 });
    if (typeof window !== 'undefined') window.location.href = "seb://quit";
  }, [toast]);

  useEffect(() => {
    const effectId = `[SebEntryClientNew InitEffect ${Date.now().toString().slice(-5)}]`;
    if (stage !== 'initializing' && stage !== 'validatingToken' && stage !== 'fetchingDetails') return;

    async function validateAndFetch() {
      console.log(`${effectId} Current stage: ${stage}`);

      if (authContextLoading) {
        console.log(`${effectId} AuthContext loading. Waiting.`);
        return;
      }

      if (!supabase) {
        console.error(`${effectId} CRITICAL: Supabase client not available. Cannot initialize exam.`);
        setPageError("CRITICAL: Service connection failed. Cannot initialize exam.");
        setStage('error'); return;
      }

      if (stage === 'initializing') {
        if (!entryTokenFromPath) {
          console.error(`${effectId} CRITICAL: SEB entry token missing from URL.`);
          setPageError("CRITICAL: SEB entry token missing from URL.");
          setStage('error'); return;
        }
        if (!isSebEnvironment()) {
          console.error(`${effectId} Not in SEB environment. This page is restricted.`);
          setPageError("This page must be accessed within Safe Exam Browser.");
          setStage('error');
          setTimeout(handleExitSeb, 7000);
          return;
        }
        setStage('validatingToken');
        return;
      }

      if (stage === 'validatingToken') {
        console.log(`${effectId} Validating token: ${entryTokenFromPath.substring(0, 10)}...`);
        try {
          const res = await fetch('/api/seb/validate-entry-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: entryTokenFromPath }),
          });
          const data = await res.json();
          if (!res.ok) {
            console.error(`${effectId} Token validation API failed. Status: ${res.status}, Body:`, data);
            throw new Error(data.error || `Token validation API failed: ${res.status}`);
          }

          setValidatedStudentId(data.student_user_id);
          setValidatedExamId(data.exam_id);
          console.log(`${effectId} Token validated. StudentID: ${data.student_user_id}, ExamID: ${data.exam_id}. Moving to fetchingDetails.`);
          setStage('fetchingDetails');
        } catch (e: any) {
          console.error(`${effectId} Exception during token validation:`, e);
          setPageError(`Token validation failed: ${e.message}.`);
          setStage('error');
        }
        return;
      }

      if (stage === 'fetchingDetails' && validatedExamId && validatedStudentId) {
        console.log(`${effectId} Fetching exam and student details for Exam: ${validatedExamId}, Student: ${validatedStudentId}`);
        try {
          const [examRes, studentRes, submissionRes] = await Promise.all([
            supabase.from('ExamX').select('*').eq('exam_id', validatedExamId).single(),
            supabase.from('proctorX').select('*').eq('user_id', validatedStudentId).single(),
            supabase.from('ExamSubmissionsX').select('status').eq('exam_id', validatedExamId).eq('student_user_id', validatedStudentId).maybeSingle()
          ]);

          if (examRes.error || !examRes.data) {
            console.error(`${effectId} Error fetching exam data:`, examRes.error);
            throw new Error(examRes.error?.message || `Exam ${validatedExamId} not found.`);
          }
          if (studentRes.error || !studentRes.data) {
            console.error(`${effectId} Error fetching student data:`, studentRes.error);
            throw new Error(studentRes.error?.message || `Student ${validatedStudentId} not found.`);
          }
          
          const fetchedExam = examRes.data as Exam;
          const fetchedStudent = studentRes.data as CustomUser;

          setExamDetails(fetchedExam);
          setStudentProfile(fetchedStudent);
          console.log(`${effectId} Exam and student details fetched successfully.`);

          if (submissionRes.data?.status === 'Completed') {
            console.log(`${effectId} Exam already completed by student. Moving to examCompleted stage.`);
            setIsDataReadyForExam(true); // Data is ready, even if completed
            setStage('examCompleted');
          } else {
             if (fetchedExam && fetchedStudent && fetchedExam.questions && fetchedExam.questions.length > 0) {
                setIsDataReadyForExam(true);
                setStage('readyToStart');
            } else {
                setIsDataReadyForExam(false);
                const missingDataError = !fetchedExam ? "Exam data missing." : !fetchedStudent ? "Student data missing." : "Exam questions missing.";
                setPageError(`Cannot start exam: ${missingDataError} Contact support.`);
                setStage('error');
            }
          }
          setShowExitSebButton(true);
        } catch (e: any) {
          console.error(`${effectId} Exception during data fetching:`, e);
          setPageError(`Failed to load exam/student information: ${e.message}.`);
          setStage('error');
        }
      }
    }
    validateAndFetch();
  }, [stage, entryTokenFromPath, supabase, authContextLoading, validatedExamId, validatedStudentId, handleExitSeb]);


  const runSecurityChecks = useCallback(async () => {
    console.log('[SebEntryClientNew runSecurityChecks] Initiated.');
    if (!examDetails || !studentProfile || !validatedStudentId) {
        const errorMsg = "Cannot run security checks: Essential exam or student data is missing.";
        console.error(`[SebEntryClientNew runSecurityChecks] Aborting: ${errorMsg}`);
        setPageError(errorMsg);
        setStage('error');
        setShowExitSebButton(true);
        return;
    }

    setStage('performingSecurityChecks');
    setShowExitSebButton(false);
    let allCriticalPassed = true;

    const updatedChecks = INITIAL_SECURITY_CHECKS.map(c => ({ ...c, status: 'pending' }));

    for (let i = 0; i < updatedChecks.length; i++) {
      const check = updatedChecks[i];
      updatedChecks[i] = { ...check, status: 'checking' };
      setSecurityChecks([...updatedChecks]);

      await new Promise(resolve => setTimeout(resolve, 1100)); 

      try {
        const passed = await check.checkFn();
        updatedChecks[i] = { ...check, status: passed ? 'passed' : 'failed', details: passed ? 'OK' : `Failed (${check.label})` };
        if (!passed && check.isCritical) {
          allCriticalPassed = false;
        }
        console.log(`[SebEntryClientNew runSecurityChecks] Check ${check.label}: ${passed ? 'Passed' : 'Failed'}`);
      } catch (e: any) {
        updatedChecks[i] = { ...check, status: 'failed', details: e.message || 'Error during check' };
        if (check.isCritical) allCriticalPassed = false;
        console.error(`[SebEntryClientNew runSecurityChecks] Error in check ${check.label}:`, e);
      }
      setSecurityChecks([...updatedChecks]);
      if (!allCriticalPassed && check.isCritical) break;
    }

    if (allCriticalPassed) {
      console.log('[SebEntryClientNew runSecurityChecks] All critical checks passed. Applying content restrictions and moving to startingExamSession.');
      document.addEventListener('contextmenu', disableContextMenu);
      document.addEventListener('copy', disableCopyPaste);
      document.addEventListener('paste', disableCopyPaste);
      setStage('startingExamSession');
    } else {
      const failedCritical = updatedChecks.find(c => c.status === 'failed' && c.isCritical);
      const errorMsg = `Critical security check failed: ${failedCritical?.label || 'Unknown Check'}. Cannot start exam.`;
      console.error(`[SebEntryClientNew runSecurityChecks] ${errorMsg}`);
      setPageError(errorMsg);
      setStage('securityChecksFailed');
      setShowExitSebButton(true);
    }
  }, [examDetails, studentProfile, validatedStudentId]);

  const handleStartExamSession = useCallback(async () => {
    console.log('[SebEntryClientNew handleStartExamSession] Initiated.');
    if (!examDetails || !validatedStudentId || !supabase || !studentProfile || !examDetails.questions || examDetails.questions.length === 0) {
      let errorMsg = "Essential data missing to start exam session: ";
      if (!examDetails) errorMsg += "ExamDetails, ";
      if (!validatedStudentId) errorMsg += "StudentId, ";
      if (!supabase) errorMsg += "Supabase client, ";
      if (!studentProfile) errorMsg += "StudentProfile, ";
      if (!examDetails?.questions || examDetails.questions.length === 0) errorMsg += "Exam Questions missing/empty.";
      
      console.error(`[SebEntryClientNew handleStartExamSession] Aborting: ${errorMsg}`);
      setPageError(errorMsg);
      setStage('error');
      return;
    }
    console.log(`[SebEntryClientNew handleStartExamSession] Upserting 'In Progress' for exam: ${examDetails.exam_id}, student: ${validatedStudentId}`);
    try {
      const { error: submissionUpsertError } = await supabase
        .from('ExamSubmissionsX')
        .upsert({
          exam_id: examDetails.exam_id,
          student_user_id: validatedStudentId,
          status: 'In Progress',
          started_at: new Date().toISOString(),
          answers: null,
          flagged_events: null,
        }, { onConflict: 'exam_id, student_user_id' })
        .select();

      if (submissionUpsertError) {
        console.warn(`[SebEntryClientNew handleStartExamSession] Error upserting 'In Progress' submission:`, submissionUpsertError.message);
        toast({ title: "Start Record Warning", description: "Could not record exam start time accurately, but proceeding.", variant: "default" });
      } else {
        console.log(`[SebEntryClientNew handleStartExamSession] 'In Progress' submission record upserted successfully.`);
      }
      setActivityFlagsDuringExam([]);
      setStage('examInProgress');
      setShowExitSebButton(false);
      console.log('[SebEntryClientNew handleStartExamSession] Stage set to examInProgress.');
    } catch (e: any) {
      const errorMsg = `Failed to initialize exam session state: ${e.message}`;
      console.error(`[SebEntryClientNew handleStartExamSession] Exception:`, e);
      setPageError(errorMsg);
      setStage('error');
    }
  }, [examDetails, validatedStudentId, supabase, studentProfile, toast]);

  useEffect(() => {
    if (stage === 'startingExamSession') {
      console.log('[SebEntryClientNew useEffect for startingExamSession] Stage is startingExamSession, calling handleStartExamSession.');
      if (!examDetails || !validatedStudentId || !supabase || !studentProfile || !examDetails.questions || examDetails.questions.length === 0) {
        let errorMsg = "Data error before starting exam session: ";
        if (!examDetails) errorMsg += "ExamDetails, ";
        if (!studentProfile) errorMsg += "StudentProfile, ";
        if (!examDetails?.questions || examDetails.questions.length === 0) errorMsg += "Exam Questions.";
        console.error(`[SebEntryClientNew useEffect for startingExamSession] ${errorMsg}`);
        setPageError(errorMsg);
        setStage('error');
        return;
      }
      handleStartExamSession();
    }
  }, [stage, handleStartExamSession, examDetails, validatedStudentId, supabase, studentProfile]);


  const handleExamSubmitOrTimeUp = useCallback(async (answers: Record<string, string>, flaggedEventsFromInterface: FlaggedEvent[], submissionType: 'submit' | 'timeup') => {
    console.log(`[SebEntryClientNew handleExamSubmitOrTimeUp] Initiated for type: ${submissionType}.`);
    if (!validatedExamId || !validatedStudentId || !examDetails || !studentProfile) {
      const errorMsg = "Student or Exam details missing for submission.";
      console.error(`[SebEntryClientNew handleExamSubmitOrTimeUp] ${errorMsg}`);
      toast({ title: "Submission Error", description: errorMsg, variant: "destructive" });
      setStage('error');
      setPageError("Data integrity issue during submission.");
      return;
    }
    setStage('submittingExam');
    setIsSubmittingViaApi(true);

    const submissionPayload: ExamSubmissionInsert = {
      exam_id: validatedExamId,
      student_user_id: validatedStudentId,
      answers: answers,
      flagged_events: [...activityFlagsDuringExam, ...flaggedEventsFromInterface].length > 0 ? [...activityFlagsDuringExam, ...flaggedEventsFromInterface] : null,
      status: 'Completed',
      submitted_at: new Date().toISOString(),
      started_at: studentProfile.created_at || new Date(Date.now() - examDetails.duration * 60 * 1000).toISOString(), // Fallback for started_at
    };
    console.log(`[SebEntryClientNew handleExamSubmitOrTimeUp] Submitting payload:`, submissionPayload);

    try {
      const response = await fetch('/api/seb/submit-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionPayload),
      });
      const result = await response.json();
      if (!response.ok) {
        console.error(`[SebEntryClientNew handleExamSubmitOrTimeUp] API submission failed. Status: ${response.status}, Result:`, result);
        if (result.error && result.error.includes("already completed")) {
          toast({ title: "Exam Already Completed", description: "This exam was already marked as completed.", duration: 6000 });
          setStage('examCompleted');
          setShowExitSebButton(true);
          setIsSubmittingViaApi(false);
          return;
        }
        throw new Error(result.error || `API submission failed: ${response.status}`);
      }

      console.log(`[SebEntryClientNew handleExamSubmitOrTimeUp] Submission successful via API.`);
      toast({ title: submissionType === 'submit' ? "Exam Submitted!" : "Exam Auto-Submitted!", description: "Your responses have been recorded.", duration: 6000 });
      setStage('examCompleted');
      setShowExitSebButton(true);
    } catch (e: any) {
      const errorMsg = `Failed to submit exam: ${e.message}.`;
      console.error(`[SebEntryClientNew handleExamSubmitOrTimeUp] Exception:`, e);
      setPageError(errorMsg);
      setStage('error');
      toast({ title: "Submission Error", description: e.message, variant: "destructive", duration: 10000 });
    } finally {
      setIsSubmittingViaApi(false);
      console.log(`[SebEntryClientNew handleExamSubmitOrTimeUp] Removing content restrictions.`);
      document.removeEventListener('contextmenu', disableContextMenu);
      document.removeEventListener('copy', disableCopyPaste);
      document.removeEventListener('paste', disableCopyPaste);
    }
  }, [validatedExamId, validatedStudentId, examDetails, studentProfile, toast, activityFlagsDuringExam]);

  // --- RENDER LOGIC ---

  const isLoadingInitialStages = stage === 'initializing' || stage === 'validatingToken' || stage === 'fetchingDetails' || authContextLoading;

  if (isLoadingInitialStages) {
    let message = "Initializing Secure Exam Environment...";
    if (stage === 'validatingToken') message = "Validating entry token...";
    if (stage === 'fetchingDetails') message = "Loading exam and student details...";
    if (authContextLoading && stage === 'initializing') message = "Initializing secure context...";

    return (
      <div className="flex flex-col items-center justify-center text-center min-h-screen w-full bg-background text-foreground p-4">
        <Loader2 className="h-16 w-16 text-primary animate-spin mb-6" />
        <h2 className="text-xl font-medium text-foreground mb-2">{message}</h2>
      </div>
    );
  }

  if (stage === 'error' || (!isDataReadyForExam && stage === 'readyToStart' && !isLoadingInitialStages) ) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen w-full bg-background text-foreground p-4">
        <div className="w-full max-w-lg text-center bg-card p-8 rounded-xl shadow-2xl border border-destructive">
          <XCircle className="h-16 w-16 text-destructive mx-auto mb-5" />
          <h2 className="text-2xl font-semibold text-destructive mb-3">Exam Access Error</h2>
          <p className="text-sm text-muted-foreground mb-6 whitespace-pre-wrap">
            {pageError || "Could not load necessary exam information. This might be due to an invalid token, network issues, or configuration problems."}
          </p>
          <Button onClick={handleExitSeb} className="w-full btn-gradient-destructive">Exit SEB</Button>
        </div>
      </div>
    );
  }

  if (!examDetails || !studentProfile) {
    return (
      <div className="flex flex-col items-center justify-center text-center min-h-screen w-full bg-background text-foreground p-4">
        <ServerCrash className="h-16 w-16 text-destructive mx-auto mb-5" />
        <h2 className="text-xl font-semibold text-destructive mb-3">Data Error</h2>
        <p className="text-sm text-muted-foreground mb-6">Essential exam or student data could not be loaded after validation. Please try again or contact support.</p>
        <Button onClick={handleExitSeb} className="w-full max-w-xs btn-gradient-destructive">Exit SEB</Button>
      </div>
    );
  }


  if (stage === 'performingSecurityChecks' || stage === 'securityChecksFailed') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen w-full bg-background text-foreground p-4">
        <Card className="w-full max-w-lg text-center bg-card p-8 rounded-xl shadow-2xl border border-border">
          <CardHeader className="border-b border-border/30 pb-4 mb-6">
            <ShieldCheck className="h-12 w-12 text-primary mx-auto mb-3" />
            <CardTitle className="text-2xl font-semibold text-foreground">Security System Check</CardTitle>
            <p className="text-sm text-muted-foreground pt-1">Verifying your exam environment. Please wait.</p>
          </CardHeader>
          <CardContent className="space-y-3 text-left">
            {securityChecks.map(check => (
              <div key={check.id} className={`flex justify-between items-center p-3 rounded-md border text-sm ${
                check.status === 'pending' ? 'border-border bg-muted/30 text-muted-foreground' :
                check.status === 'checking' ? 'border-primary/50 bg-primary/10 text-primary animate-pulse' :
                check.status === 'passed' ? 'border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400' :
                'border-destructive/50 bg-destructive/10 text-destructive dark:text-red-400'
              }`}>
                <span className="font-medium text-card-foreground">{check.label}</span>
                {check.status === 'pending' && <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />}
                {check.status === 'checking' && <Loader2 className="h-4 w-4 text-primary animate-spin" />}
                {check.status === 'passed' && <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-500" />}
                {check.status === 'failed' && <XCircle className="h-5 w-5 text-destructive dark:text-red-500" />}
              </div>
            ))}
          </CardContent>
          {stage === 'securityChecksFailed' && pageError && (
            <Alert variant="destructive" className="mt-6 text-left">
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle className="font-semibold">Security Check Failed!</AlertTitle>
              <AlertDescription>{pageError}</AlertDescription>
            </Alert>
          )}
          <div className="mt-8">
            {stage === 'securityChecksFailed' && (
              <Button onClick={handleExitSeb} className="w-full btn-gradient-destructive">Exit SEB</Button>
            )}
            {stage === 'performingSecurityChecks' && !securityChecks.find(c => c.status === 'failed' && c.isCritical) && (
              <Button className="w-full btn-primary-solid opacity-70" disabled>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Checking Environment...
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  if (stage === 'startingExamSession') {
    return (
      <div className="flex flex-col items-center justify-center text-center min-h-screen w-full bg-background text-foreground p-4">
        <Loader2 className="h-16 w-16 text-primary animate-spin mb-6" />
        <h2 className="text-xl font-medium text-foreground mb-2">Preparing your exam session...</h2>
      </div>
    );
  }

  if (stage === 'examInProgress' || stage === 'submittingExam') {
     if (!examDetails || !studentProfile || !examDetails.questions) {
        return (
             <div className="flex flex-col items-center justify-center text-center min-h-screen w-full bg-background text-foreground p-4">
                <ServerCrash className="h-16 w-16 text-destructive mx-auto mb-5" />
                <h2 className="text-xl font-semibold text-destructive mb-3">Application Error</h2>
                <p className="text-sm text-muted-foreground mb-6">
                    Critical data missing for starting the exam. Please contact support.
                </p>
                <Button onClick={handleExitSeb} className="w-full max-w-xs btn-gradient-destructive">Exit SEB</Button>
            </div>
        );
    }
    return (
      <ExamTakingInterface
        examDetails={examDetails}
        questions={examDetails.questions || []} 
        parentIsLoading={stage === 'submittingExam' || isSubmittingViaApi}
        onAnswerChange={() => { }}
        onSubmitExam={(answers, flaggedEvents) => handleExamSubmitOrTimeUp(answers, flaggedEvents, 'submit')}
        onTimeUp={(answers, flaggedEvents) => handleExamSubmitOrTimeUp(answers, flaggedEvents, 'timeup')}
        isDemoMode={false}
        userIdForActivityMonitor={studentProfile.user_id}
        studentName={studentProfile.name}
        studentRollNumber={studentProfile.user_id}
        studentAvatarUrl={studentProfile.avatar_url}
        examStarted={true}
      />
    );
  }

  const isExamCompleted = stage === 'examCompleted';
  let examStatusText = "Not Started";
  let statusTextColor = "text-muted-foreground";

  if (isExamCompleted) {
    examStatusText = "Completed";
    statusTextColor = "text-green-600 dark:text-green-500";
  } else if (stage === 'readyToStart' && examDetails.status === 'Ongoing') {
    examStatusText = "Ready to Start";
    statusTextColor = "text-yellow-600 dark:text-yellow-500";
  } else if (stage === 'readyToStart') {
    examStatusText = "Not Yet Active";
  }

  return (
    <div className="min-h-screen w-full flex flex-col sm:flex-row bg-background text-foreground">
      {/* Left Column - Exam Info */}
      <div className="w-full sm:w-1/3 bg-slate-50 dark:bg-slate-800/30 p-6 sm:p-10 flex flex-col justify-between border-r border-border">
        <div>
          <Image src={logoAsset} alt="ZenTest Logo" width={180} height={50} className="mb-10 h-16 w-auto" />
          <div className="space-y-3">
            <h2 className="text-2xl sm:text-3xl font-bold text-primary flex items-center gap-2.5">
              <BookOpen className="h-7 w-7" />
              Exam Details
            </h2>
            <p className="text-xl sm:text-2xl font-semibold text-foreground">{examDetails.title}</p>
            {examDetails.description && (
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line max-h-60 overflow-y-auto pr-2 scrollbar-thin">
                    {examDetails.description}
                </p>
            )}
            <div className="pt-3 space-y-2 text-sm">
                <p className="flex items-center gap-2"><ListChecks className="h-4 w-4 text-primary" /> Questions: <span className="font-medium text-foreground">{examDetails.questions?.length || 0}</span></p>
                <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> Start Time: <span className="font-medium text-foreground">{isValidDate(parseISO(examDetails.start_time)) ? format(parseISO(examDetails.start_time), "MMM d, yyyy, hh:mm a") : "N/A"}</span></p>
                <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> End Time: <span className="font-medium text-foreground">{isValidDate(parseISO(examDetails.end_time)) ? format(parseISO(examDetails.end_time), "MMM d, yyyy, hh:mm a") : "N/A"}</span></p>
            </div>
          </div>
        </div>
        {showExitSebButton && (
          <Button variant="outline" onClick={handleExitSeb} className="w-full mt-10 btn-outline-subtle">
            <LogOut className="mr-2 h-4 w-4" /> Exit SEB
          </Button>
        )}
      </div>

      {/* Right Column - User Info & Actions */}
      <div className="w-full sm:w-2/3 p-6 sm:p-10 flex flex-col">
        <div className="flex justify-end items-start mb-auto">
          <div className="text-right space-y-1 p-3 sm:p-4 bg-card rounded-lg shadow border border-border/50">
            <div className="flex items-center justify-end gap-2 sm:gap-3">
              <div>
                <p className="text-sm sm:text-md font-semibold text-card-foreground">{studentProfile.name}</p>
                <p className="text-xs text-muted-foreground">ID: {studentProfile.user_id}</p>
                {studentProfile.email && <p className="text-xs text-muted-foreground">{studentProfile.email}</p>}
              </div>
              <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-primary/40">
                <AvatarImage src={studentProfile.avatar_url || undefined} alt={studentProfile.name || 'Student'} />
                <AvatarFallback className="bg-muted text-muted-foreground">
                  {(studentProfile.name || "S").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center text-center space-y-5 sm:space-y-8 my-auto">
          <div className="p-4 sm:p-6 bg-card rounded-xl shadow-lg border border-border/50 min-w-[280px]">
            <h3 className="text-md sm:text-lg font-medium text-muted-foreground mb-1.5">Exam Duration</h3>
            <p className="text-4xl sm:text-5xl font-bold text-primary tabular-nums">{examDetails.duration} minutes</p>
          </div>
          <div className="p-4 sm:p-6 bg-card rounded-xl shadow-lg border border-border/50 min-w-[280px]">
            <h3 className="text-md sm:text-lg font-medium text-muted-foreground mb-1.5">Status</h3>
            <p className={cn("text-4xl sm:text-5xl font-bold tabular-nums", statusTextColor)}>
              {examStatusText}
            </p>
          </div>
        </div>

        <div className="flex justify-center mt-auto pt-6 sm:pt-10">
          {isExamCompleted ? (
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-full max-w-xs">
                    <Button className="btn-gradient w-full py-3 text-md sm:text-lg opacity-60 cursor-not-allowed" disabled>
                      <CircleSlash className="mr-2 h-5 w-5" /> Exam Already Submitted
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-popover text-popover-foreground border-border shadow-lg rounded-md">
                  <p>You have already completed and submitted this exam.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button
              onClick={runSecurityChecks}
              className="btn-gradient w-full max-w-xs py-3 text-md sm:text-lg shadow-xl hover:shadow-primary/40"
              disabled={stage !== 'readyToStart' || !isDataReadyForExam}
            >
              <PlayCircle className="mr-2 h-5 sm:h-6 w-5 sm:h-6" /> Start Exam & Security Checks
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
