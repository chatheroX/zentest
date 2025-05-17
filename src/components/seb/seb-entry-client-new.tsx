
// src/components/seb/seb-entry-client-new.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertTriangle, PlayCircle, ShieldCheck, XCircle, Info, LogOut, ServerCrash, CheckCircle, Ban, CircleSlash, BookOpen, UserCircle2, CalendarDays, ListChecks } from 'lucide-react';
import type { Exam, CustomUser, FlaggedEvent } from '@/types/supabase';
import { useToast } from '@/hooks/use-toast';
import { format, isValid as isValidDate, parseISO } from 'date-fns';
import { isSebEnvironment, isOnline, areDevToolsLikelyOpen, isWebDriverActive } from '@/lib/seb-utils';
import { useAuth } from '@/contexts/AuthContext';
import { ExamTakingInterface } from '@/components/shared/exam-taking-interface';
import logoAsset from '../../../logo.png';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { getSafeErrorMessage, logErrorToBackend } from '@/lib/error-logging';

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

const TOKEN_VALIDATION_TIMEOUT_MS = 15000;

export function SebEntryClientNew() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  
  const entryTokenFromQuery = searchParams?.get('token');

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
        const errorMsg = "CRITICAL: Service connection failed. Cannot initialize exam.";
        console.error(`${effectId} ${errorMsg}`);
        setPageError(errorMsg);
        setStage('error'); 
        await logErrorToBackend(new Error(errorMsg), 'SebEntryClientNew-Init-SupabaseNull', { stage });
        return;
      }

      if (stage === 'initializing') {
        if (!entryTokenFromQuery) {
          const errorMsg = "CRITICAL: SEB entry token missing from URL query parameters.";
          console.error(`${effectId} ${errorMsg}`);
          setPageError(errorMsg);
          setStage('error'); 
          await logErrorToBackend(new Error(errorMsg), 'SebEntryClientNew-Init-TokenMissing', { stage });
          return;
        }
        if (!isSebEnvironment()) {
          const errorMsg = "This page must be accessed within Safe Exam Browser.";
          console.error(`${effectId} ${errorMsg}`);
          setPageError(errorMsg);
          setStage('error');
          setTimeout(handleExitSeb, 7000);
          await logErrorToBackend(new Error(errorMsg), 'SebEntryClientNew-Init-NotSEB', { stage });
          return;
        }
        setStage('validatingToken');
        return;
      }

      if (stage === 'validatingToken') {
        console.log(`${effectId} Validating token: ${entryTokenFromQuery ? entryTokenFromQuery.substring(0, 10) + "..." : "N/A"}`);
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), TOKEN_VALIDATION_TIMEOUT_MS);

          const res = await fetch(`/api/seb/validate-token?token=${encodeURIComponent(entryTokenFromQuery!)}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          
          const responseBody = await res.json().catch(() => ({ error: 'Failed to parse API response JSON.' }));

          if (!res.ok) {
            const apiErrorMsg = getSafeErrorMessage(responseBody, `Token validation API request failed with status: ${res.status}`);
            console.error(`${effectId} Token validation API failed. Status: ${res.status}, Response:`, responseBody);
            throw new Error(apiErrorMsg); 
          }
          
          if (responseBody.error) { 
             console.error(`${effectId} Token validation API returned specific error: ${responseBody.error}`);
             throw new Error(responseBody.error);
          }

          setValidatedStudentId(responseBody.studentId);
          setValidatedExamId(responseBody.examId);
          console.log(`${effectId} Token validated. StudentID: ${responseBody.studentId}, ExamID: ${responseBody.examId}. Moving to fetchingDetails.`);
          setStage('fetchingDetails');
        } catch (e: any) {
          const errorMsg = getSafeErrorMessage(e, "An unexpected error occurred during token validation.");
          console.error(`${effectId} Exception during token validation:`, errorMsg, e);
          setPageError(errorMsg);
          setStage('error');
          await logErrorToBackend(e, 'SebEntryClientNew-TokenValidation-Exception', { token: entryTokenFromQuery, stage });
        }
        return;
      }

      if (stage === 'fetchingDetails' && validatedExamId && validatedStudentId) {
        console.log(`${effectId} Fetching exam and student details for Exam: ${validatedExamId}, Student: ${validatedStudentId}`);
        try {
          const [examRes, studentRes] = await Promise.all([
            supabase.from('ExamX').select('*').eq('exam_id', validatedExamId).single(),
            supabase.from('proctorX').select('*').eq('user_id', validatedStudentId).single(),
          ]);

          if (examRes.error || !examRes.data) {
            const errorMsg = getSafeErrorMessage(examRes.error, `Exam ${validatedExamId} not found.`);
            console.error(`${effectId} Error fetching exam data:`, examRes.error);
            throw new Error(errorMsg);
          }
          if (studentRes.error || !studentRes.data) {
            const errorMsg = getSafeErrorMessage(studentRes.error, `Student ${validatedStudentId} not found.`);
            console.error(`${effectId} Error fetching student data:`, studentRes.error);
            throw new Error(errorMsg);
          }
          
          const fetchedExam = examRes.data as Exam;
          const fetchedStudent = studentRes.data as CustomUser;

          setExamDetails(fetchedExam);
          setStudentProfile(fetchedStudent);
          console.log(`${effectId} Exam and student details fetched successfully.`);
          
          if (fetchedExam && fetchedStudent && fetchedExam.questions && fetchedExam.questions.length > 0) {
              setIsDataReadyForExam(true);
              setStage('readyToStart');
          } else {
              setIsDataReadyForExam(false);
              const missingDataError = !fetchedExam ? "Exam data missing." : !fetchedStudent ? "Student data missing." : "This exam currently has no questions.";
              setPageError(`Cannot start exam: ${missingDataError} Contact support.`);
              setStage('error');
              await logErrorToBackend(new Error(missingDataError), 'SebEntryClientNew-DataFetch-IncompleteData', { examId: validatedExamId, studentId: validatedStudentId, stage });
          }
          setShowExitSebButton(true);
        } catch (e: any) {
          const errorMsg = getSafeErrorMessage(e, "Failed to load exam/student information.");
          console.error(`${effectId} Exception during data fetching:`, errorMsg, e);
          setPageError(errorMsg);
          setStage('error');
          await logErrorToBackend(e, 'SebEntryClientNew-DataFetch-Exception', { examId: validatedExamId, studentId: validatedStudentId, stage });
        }
      }
    }
    validateAndFetch();
  }, [stage, entryTokenFromQuery, supabase, authContextLoading, validatedExamId, validatedStudentId, handleExitSeb, toast]);


  const runSecurityChecks = useCallback(async () => {
    const operationId = `[SebEntryClientNew runSecurityChecks ${Date.now().toString().slice(-5)}]`;
    console.log(`${operationId} Initiated.`);
    if (!examDetails || !studentProfile || !validatedStudentId) {
        const errorMsg = "Cannot run security checks: Essential exam or student data is missing.";
        console.error(`${operationId} Aborting: ${errorMsg}`);
        setPageError(errorMsg);
        setStage('error');
        setShowExitSebButton(true);
        await logErrorToBackend(new Error(errorMsg), 'SebEntryClientNew-SecurityChecks-MissingData', { stage, examDetails: !!examDetails, studentProfile: !!studentProfile, validatedStudentId: !!validatedStudentId });
        return;
    }

    setStage('performingSecurityChecks');
    setShowExitSebButton(false);
    let allCriticalPassed = true;

    const updatedChecks = INITIAL_SECURITY_CHECKS.map(c => ({ ...c, status: 'pending' as 'pending' | 'checking' | 'passed' | 'failed' }));

    for (let i = 0; i < updatedChecks.length; i++) {
      const check = updatedChecks[i];
      updatedChecks[i] = { ...check, status: 'checking' };
      setSecurityChecks([...updatedChecks]);
      await new Promise(resolve => setTimeout(resolve, 1500)); 

      try {
        const passed = await check.checkFn();
        updatedChecks[i] = { ...check, status: passed ? 'passed' : 'failed', details: passed ? 'OK' : `Failed (${check.label})` };
        if (!passed && check.isCritical) {
          allCriticalPassed = false;
        }
        console.log(`${operationId} Check ${check.label}: ${passed ? 'Passed' : 'Failed'}`);
      } catch (e: any) {
        const errorMsg = getSafeErrorMessage(e, `Error during security check: ${check.label}`);
        updatedChecks[i] = { ...check, status: 'failed', details: errorMsg };
        if (check.isCritical) allCriticalPassed = false;
        console.error(`${operationId} Error in check ${check.label}:`, errorMsg, e);
        await logErrorToBackend(e, `SebEntryClientNew-SecurityCheckFailure-${check.id}`, { stage, checkLabel: check.label });
      }
      setSecurityChecks([...updatedChecks]);
      if (!allCriticalPassed && check.isCritical && updatedChecks[i].status === 'failed') break;
    }

    if (allCriticalPassed) {
      console.log(`${operationId} All critical checks passed. Moving to startingExamSession.`);
      // Content restrictions like context menu are now handled inside ExamTakingInterface or SebLiveTestClient
      setStage('startingExamSession');
    } else {
      const failedCritical = updatedChecks.find(c => c.status === 'failed' && c.isCritical);
      const errorMsg = `Critical security check failed: ${failedCritical?.label || 'Unknown Check'}. Cannot start exam.`;
      console.error(`${operationId} ${errorMsg}`);
      setPageError(errorMsg);
      setStage('securityChecksFailed');
      setShowExitSebButton(true);
      await logErrorToBackend(new Error(errorMsg), 'SebEntryClientNew-SecurityChecks-CriticalFail', { failedCheck: failedCritical?.label, stage });
    }
  }, [examDetails, studentProfile, validatedStudentId]);

  const handleStartExamSession = useCallback(async () => {
    const operationId = `[SebEntryClientNew handleStartExamSession ${Date.now().toString().slice(-5)}]`;
    console.log(`${operationId} Initiated.`);
    if (!examDetails || !validatedStudentId || !supabase || !studentProfile || !examDetails.questions || examDetails.questions.length === 0) {
      let errorParts: string[] = [];
      if (!examDetails) errorParts.push("ExamDetails missing");
      if (!validatedStudentId) errorParts.push("StudentId missing");
      if (!supabase) errorParts.push("Supabase client unavailable");
      if (!studentProfile) errorParts.push("StudentProfile missing");
      if (!examDetails?.questions || examDetails.questions.length === 0) errorParts.push("Exam has no questions");
      
      const errorMsg = `Essential data missing to start exam session: ${errorParts.join(', ')}.`;
      console.error(`${operationId} Aborting: ${errorMsg}`);
      setPageError(errorMsg);
      setStage('error');
      await logErrorToBackend(new Error(errorMsg), 'SebEntryClientNew-StartSession-MissingData', { stage, errorParts });
      return;
    }
    console.log(`${operationId} Upserting 'In Progress' for exam: ${examDetails.exam_id}, student: ${validatedStudentId}`);
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
        const warningMsg = getSafeErrorMessage(submissionUpsertError, "Could not record exam start time accurately, but proceeding.");
        console.warn(`${operationId} Error upserting 'In Progress' submission:`, warningMsg);
        toast({ title: "Start Record Warning", description: warningMsg, variant: "default" });
        await logErrorToBackend(submissionUpsertError, 'SebEntryClientNew-StartSession-UpsertWarning', { stage });
      } else {
        console.log(`${operationId} 'In Progress' submission record upserted successfully.`);
      }
      setActivityFlagsDuringExam([]);
      setStage('examInProgress');
      setShowExitSebButton(false);
      console.log(`${operationId} Stage set to examInProgress.`);
    } catch (e: any) {
      const errorMsg = getSafeErrorMessage(e, "Failed to initialize exam session state.");
      console.error(`${operationId} Exception:`, errorMsg, e);
      setPageError(errorMsg);
      setStage('error');
      await logErrorToBackend(e, 'SebEntryClientNew-StartSession-Exception', { stage });
    }
  }, [examDetails, validatedStudentId, supabase, studentProfile, toast]);

  useEffect(() => {
    const effectId = `[SebEntryClientNew useEffect for startingExamSession ${Date.now().toString().slice(-5)}]`;
    if (stage === 'startingExamSession') {
      console.log(`${effectId} Stage is startingExamSession, calling handleStartExamSession.`);
      if (!isDataReadyForExam || !examDetails || !validatedStudentId || !supabase || !studentProfile) {
        let errorParts: string[] = [];
        if (!isDataReadyForExam) errorParts.push("Data not ready for exam");
        if (!examDetails) errorParts.push("ExamDetails missing");
        if (!validatedStudentId) errorParts.push("StudentId missing");
        if (!supabase) errorParts.push("Supabase client missing");
        if (!studentProfile) errorParts.push("StudentProfile missing");
        const errorMsg = `Data error before starting exam session: ${errorParts.join(', ')}.`;

        console.error(`${effectId} ${errorMsg}`);
        setPageError(errorMsg);
        setStage('error');
        logErrorToBackend(new Error(errorMsg), 'SebEntryClientNew-StartSessionHook-PreCheckFail', { stage, errorParts });
        return;
      }
      handleStartExamSession();
    }
  }, [stage, handleStartExamSession, examDetails, validatedStudentId, supabase, studentProfile, isDataReadyForExam]);


  const handleExamSubmitOrTimeUp = useCallback(async (answers: Record<string, string>, flaggedEventsFromInterface: FlaggedEvent[], submissionType: 'submit' | 'timeup') => {
    const operationId = `[SebEntryClientNew handleExamSubmitOrTimeUp ${Date.now().toString().slice(-5)}] Type: ${submissionType}`;
    console.log(`${operationId} Initiated.`);
    if (!validatedExamId || !validatedStudentId || !examDetails || !studentProfile) {
      const errorMsg = "Student or Exam details missing for submission.";
      console.error(`${operationId} ${errorMsg}`);
      toast({ title: "Submission Error", description: errorMsg, variant: "destructive" });
      setStage('error');
      setPageError(errorMsg);
      await logErrorToBackend(new Error(errorMsg), 'SebEntryClientNew-Submit-MissingDetails', { stage, validatedExamId: !!validatedExamId, validatedStudentId: !!validatedStudentId, examDetails: !!examDetails, studentProfile: !!studentProfile });
      return;
    }
    setStage('submittingExam');
    setIsSubmittingViaApi(true);

    const submissionPayload = { 
      exam_id: validatedExamId,
      student_user_id: validatedStudentId,
      answers: answers,
      flagged_events: [...activityFlagsDuringExam, ...flaggedEventsFromInterface].length > 0 ? [...activityFlagsDuringExam, ...flaggedEventsFromInterface] : null,
      status: 'Completed' as 'Completed',
      submitted_at: new Date().toISOString(),
      // started_at should have been set when 'In Progress' was upserted.
      // If it's missing, the API route provides a fallback.
    };
    console.log(`${operationId} Submitting payload (answers omitted for brevity):`, {...submissionPayload, answers: Object.keys(answers).length > 0 ? "{...}" : "{}"});

    try {
      const response = await fetch('/api/seb/submit-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionPayload),
      });
      
      const responseBody = await response.json().catch(() => ({ error: "Failed to parse submission API response as JSON." }));

      if (!response.ok) {
        const apiErrorMsg = getSafeErrorMessage(responseBody, `API submission failed with status: ${response.status}`);
        console.error(`${operationId} API submission failed. Status: ${response.status}, Response:`, responseBody);
        throw new Error(apiErrorMsg);
      }
      
      console.log(`${operationId} Submission successful via API. Result:`, responseBody);
      toast({ title: submissionType === 'submit' ? "Exam Submitted!" : "Exam Auto-Submitted!", description: "Your responses have been recorded.", duration: 6000 });
      setStage('examCompleted');
      setShowExitSebButton(true);
    } catch (e: any) {
      const errorMsg = getSafeErrorMessage(e, "Failed to submit exam.");
      console.error(`${operationId} Exception:`, errorMsg, e);
      setPageError(errorMsg);
      setStage('error');
      toast({ title: "Submission Error", description: errorMsg, variant: "destructive", duration: 10000 });
      await logErrorToBackend(e, 'SebEntryClientNew-Submit-Exception', { stage, submissionPayload: {...submissionPayload, answers: "OMITTED"} });
    } finally {
      setIsSubmittingViaApi(false);
      // Content restrictions (context menu, etc.) are managed by SebLiveTestClient and removed on its unmount
    }
  }, [validatedExamId, validatedStudentId, examDetails, studentProfile, toast, activityFlagsDuringExam]);

  const isLoadingInitialStages = stage === 'initializing' || stage === 'validatingToken' || stage === 'fetchingDetails' || authContextLoading;

  if (isLoadingInitialStages) {
    let message = "Initializing Secure Exam Environment...";
    if (stage === 'validatingToken') message = "Validating exam session token...";
    if (stage === 'fetchingDetails') message = "Loading exam and student details...";
    if (authContextLoading && stage === 'initializing') message = "Initializing secure context...";

    return (
      <div className="flex flex-col items-center justify-center text-center min-h-screen w-full bg-background text-foreground p-4">
        <Loader2 className="h-16 w-16 text-primary animate-spin mb-6" />
        <h2 className="text-xl font-medium text-foreground mb-2">{message}</h2>
      </div>
    );
  }
  
  if (stage === 'error' || (!isDataReadyForExam && stage === 'readyToStart' && !isLoadingInitialStages && !pageError) ) {
    const displayError = pageError || "Could not load necessary exam information. This might be due to an invalid token, network issues, or configuration problems (e.g., exam has no questions).";
    return (
      <div className="flex flex-col items-center justify-center min-h-screen w-full bg-background text-foreground p-4">
        <div className="w-full max-w-lg text-center p-6 sm:p-8 rounded-xl shadow-2xl border border-destructive bg-destructive/5">
            <XCircle className="h-16 w-16 text-destructive mx-auto mb-5" />
            <h2 className="text-2xl font-semibold mb-3 text-destructive">Exam Access Error</h2>
            <p className="text-sm mb-6 whitespace-pre-wrap text-destructive/90">
                {displayError}
            </p>
            <Button onClick={handleExitSeb} className="w-full btn-gradient-destructive">Exit SEB</Button>
        </div>
      </div>
    );
  }

  if (!examDetails || !studentProfile) { 
     return (
       <div className="flex flex-col items-center justify-center text-center min-h-screen w-full bg-background text-foreground p-4">
        <div className="w-full max-w-lg text-center p-6 sm:p-8 rounded-xl shadow-2xl border border-destructive bg-destructive/5">
            <ServerCrash className="h-16 w-16 text-destructive mx-auto mb-5" />
            <h2 className="text-xl font-semibold mb-3 text-destructive">Data Error</h2>
            <p className="text-sm mb-6 text-destructive/90">Essential exam or student data could not be loaded. Please try again or contact support.</p>
            <Button onClick={handleExitSeb} className="w-full max-w-xs btn-gradient-destructive">Exit SEB</Button>
        </div>
      </div>
    );
  }


  if (stage === 'performingSecurityChecks' || stage === 'securityChecksFailed') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen w-full bg-background text-foreground p-4">
        <Card className="w-full max-w-lg text-center bg-card p-6 sm:p-8 rounded-xl shadow-xl border-border">
          <CardHeader className="border-b border-border/60 pb-4 mb-6">
            <ShieldCheck className="h-12 w-12 text-primary mx-auto mb-3" />
            <CardTitle className="text-xl sm:text-2xl font-semibold text-card-foreground">Security System Check</CardTitle>
            <p className="text-xs sm:text-sm text-muted-foreground pt-1">Verifying your exam environment. Please wait.</p>
          </CardHeader>
          <CardContent className="space-y-3 text-left">
            {securityChecks.map(check => (
              <div key={check.id} className={cn(
                "flex justify-between items-center p-3 rounded-md border text-sm",
                check.status === 'pending' ? 'border-border bg-muted/30 text-muted-foreground' :
                check.status === 'checking' ? 'border-primary/50 bg-primary/10 text-primary animate-pulse' :
                check.status === 'passed' ? 'border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-300' : 
                'border-destructive/50 bg-destructive/10 text-destructive dark:text-red-300' 
              )}>
                <span className="font-medium text-card-foreground">{check.label}</span>
                {check.status === 'pending' && <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />}
                {check.status === 'checking' && <Loader2 className="h-4 w-4 text-primary animate-spin" />}
                {check.status === 'passed' && <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />}
                {check.status === 'failed' && <XCircle className="h-5 w-5 text-destructive dark:text-red-400" />}
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
     if (!isDataReadyForExam || !examDetails || !studentProfile || !examDetails.questions) {
        const errorMsg = "Critical data missing for exam. Cannot proceed.";
        logErrorToBackend(new Error(errorMsg), 'SebEntryClientNew-ExamInProgress-MissingData', { isDataReadyForExam, examDetails:!!examDetails, studentProfile:!!studentProfile, questions: examDetails?.questions?.length });
        return ( 
             <div className="flex flex-col items-center justify-center text-center min-h-screen w-full bg-background text-foreground p-4">
                <div className="w-full max-w-lg text-center p-6 sm:p-8 rounded-xl shadow-2xl border border-destructive bg-destructive/5">
                    <ServerCrash className="h-16 w-16 text-destructive mx-auto mb-5" />
                    <h2 className="text-xl font-semibold mb-3 text-destructive">Application Error</h2>
                    <p className="text-sm mb-6 text-destructive/90">
                        {errorMsg} Please contact support.
                    </p>
                    <Button onClick={handleExitSeb} className="w-full max-w-xs btn-gradient-destructive">Exit SEB</Button>
                </div>
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

  const isExamEffectivelyCompleted = stage === 'examCompleted';
  let examStatusText = "Not Started";
  if (isExamEffectivelyCompleted) examStatusText = "Completed";
  else if (stage === 'readyToStart' && isDataReadyForExam) examStatusText = "Ready to Start";

  // Full-screen two-column layout for readyToStart and examCompleted stages
  return (
    <div className="min-h-screen w-full flex flex-col sm:flex-row bg-background text-foreground">
      {/* Left Column - Exam Info */}
      <div className="w-full sm:w-1/3 p-6 sm:p-10 flex flex-col justify-between bg-slate-50 dark:bg-slate-800/30 border-r border-border/30">
        <div>
          <Image src={logoAsset} alt="ZenTest Logo" width={180} height={50} className="mb-6 sm:mb-10 h-16 w-auto" />
          <div className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-primary flex items-center gap-2.5">
              <BookOpen className="h-6 sm:h-7 w-6 sm:h-7" />
              Exam Details
            </h2>
            <p className="text-lg sm:text-xl font-semibold text-foreground">{examDetails.title}</p>
            {examDetails.description && (
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-line max-h-60 overflow-y-auto pr-2 scrollbar-thin">
                    {examDetails.description}
                </p>
            )}
            <div className="pt-3 space-y-2 text-sm text-foreground">
                <p className="flex items-center gap-2"><ListChecks className="h-4 w-4 text-primary" /> Questions: <span className="font-medium">{examDetails.questions?.length || 0}</span></p>
                <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> Scheduled Start: <span className="font-medium">{isValidDate(parseISO(examDetails.start_time)) ? format(parseISO(examDetails.start_time), "MMM d, yyyy, hh:mm a") : "N/A"}</span></p>
                <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> Scheduled End: <span className="font-medium">{isValidDate(parseISO(examDetails.end_time)) ? format(parseISO(examDetails.end_time), "MMM d, yyyy, hh:mm a") : "N/A"}</span></p>
            </div>
          </div>
        </div>
        {showExitSebButton && (
          <Button variant="outline" onClick={handleExitSeb} className="w-full mt-6 sm:mt-10 btn-outline-subtle">
            <LogOut className="mr-2 h-4 w-4" /> Exit SEB
          </Button>
        )}
      </div>

      {/* Right Column - User Info & Actions */}
      <div className="w-full sm:w-2/3 p-6 sm:p-10 flex flex-col bg-background">
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
          <div className="p-4 sm:p-6 bg-muted/30 rounded-xl shadow-inner border border-border/50 min-w-[280px] sm:min-w-[320px]">
            <h3 className="text-sm sm:text-md font-medium text-muted-foreground mb-1.5">Exam Duration</h3>
            <p className="text-3xl sm:text-4xl font-bold text-primary tabular-nums">{examDetails.duration} minutes</p>
          </div>
          <div className="p-4 sm:p-6 bg-muted/30 rounded-xl shadow-inner border border-border/50 min-w-[280px] sm:min-w-[320px]">
            <h3 className="text-sm sm:text-md font-medium text-muted-foreground mb-1.5">Status</h3>
            <p className={cn(
                "text-3xl sm:text-4xl font-bold tabular-nums", 
                isExamEffectivelyCompleted ? "text-green-600 dark:text-green-400" : 
                (stage === 'readyToStart' && isDataReadyForExam) ? "text-blue-600 dark:text-blue-400" : 
                "text-yellow-600 dark:text-yellow-400" 
              )}
            >
              {examStatusText}
            </p>
          </div>
        </div>

        <div className="flex justify-center mt-auto pt-6 sm:pt-10">
          {isExamEffectivelyCompleted ? (
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
              disabled={stage !== 'readyToStart' || !isDataReadyForExam || !examDetails.questions || examDetails.questions.length === 0}
            >
              <PlayCircle className="mr-2 h-5 sm:h-6 w-5 sm:h-6" /> 
              {(!examDetails.questions || examDetails.questions.length === 0) ? "No Questions in Exam" : "Start Exam & Security Checks"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
