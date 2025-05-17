
'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Card is used for Security Checks modal-like view
import { Loader2, AlertTriangle, PlayCircle, ShieldCheck, XCircle, Info, LogOut, ServerCrash, CheckCircle, Ban, CircleSlash, BookOpen, UserCircle2, CalendarDays, ListChecks, Shield, ClockIcon, FileTextIcon, HelpCircleIcon, Wifi, Maximize, Zap } from 'lucide-react';
import type { Exam, CustomUser, FlaggedEvent } from '@/types/supabase';
import { useToast, toast as globalToast } from '@/hooks/use-toast'; // Renamed toast to globalToast to avoid conflict
import { format, isValid as isValidDate, parseISO } from 'date-fns';
import { isSebEnvironment, isOnline, areDevToolsLikelyOpen, isWebDriverActive } from '@/lib/seb-utils';
import { useAuth } from '@/contexts/AuthContext';
import { ExamTakingInterface } from '@/components/shared/exam-taking-interface';
import logoAsset from '../../../logo.png';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';

// Local helper for safe error message extraction
function getSafeErrorMessage(e: any, defaultMessage = "An unknown error occurred."): string {
  if (e && typeof e === 'object') {
    if (e.name === 'AbortError') {
      return "The request timed out. Please check your connection and try again.";
    } else if (typeof e.message === 'string' && e.message.trim() !== '') {
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

const TOKEN_VALIDATION_TIMEOUT_MS = 15000;

interface SecurityCheck {
  id: string;
  label: string;
  checkFn: () => boolean | Promise<boolean>;
  isCritical: boolean;
  status: 'pending' | 'checking' | 'passed' | 'failed';
  details?: string;
  icon?: React.ElementType;
}

const generalRules = [
  { text: "Ensure your internet connection is stable throughout the exam.", icon: Wifi },
  { text: "Do not switch tabs, open other applications, or use unauthorized tools.", icon: Ban },
  { text: "Only one submission is allowed per student for this exam.", icon: FileTextIcon },
  { text: "The time limit is strictly enforced. The exam will auto-submit when time expires.", icon: ClockIcon },
  { text: "Read all questions and instructions carefully before answering.", icon: BookOpen },
  { text: "Keep your exam environment secure and free from distractions.", icon: Shield },
  { text: "Attempting to use disallowed shortcuts or tools will be flagged.", icon: AlertTriangle },
  { text: "Ensure SEB is in fullscreen mode if required by your institution.", icon: Maximize },
];


export function SebEntryClientNew() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { supabase, isLoading: authContextLoading } = useAuth();

  const [stage, setStage] = useState<SebStage>('initializing');
  const [pageError, setPageError] = useState<string | null>(null);

  const [validatedStudentId, setValidatedStudentId] = useState<string | null>(null);
  const [validatedExamId, setValidatedExamId] = useState<string | null>(null);
  const [isPreviouslySubmitted, setIsPreviouslySubmitted] = useState(false);

  const [examDetails, setExamDetails] = useState<Exam | null>(null);
  const [studentProfile, setStudentProfile] = useState<CustomUser | null>(null);
  const [isDataReadyForExam, setIsDataReadyForExam] = useState(false);

  const [showExitSebButton, setShowExitSebButton] = useState(true);
  const [securityChecks, setSecurityChecks] = useState<SecurityCheck[]>([]);
  const [isSubmittingViaApi, setIsSubmittingViaApi] = useState(false);

  const isDevModeActive = process.env.NEXT_PUBLIC_DEV_MODE_SKIP_SEB_LAUNCH === "true";

  useEffect(() => {
    const initialChecks: SecurityCheck[] = [
      { id: 'sebEnv', label: 'SEB Environment', checkFn: isSebEnvironment, isCritical: !isDevModeActive, status: 'pending', icon: Shield },
      { id: 'online', label: 'Internet Connection', checkFn: isOnline, isCritical: true, status: 'pending', icon: Wifi },
      { id: 'devTools', label: 'Developer Tools', checkFn: () => !areDevToolsLikelyOpen(), isCritical: true, status: 'pending', icon: Zap },
      { id: 'webDriver', label: 'Automation Tools', checkFn: () => !isWebDriverActive(), isCritical: true, status: 'pending', icon: Ban },
    ];
    setSecurityChecks(initialChecks.map(c => ({ ...c, status: 'pending' })));
  }, [isDevModeActive]);

  const handleExitSeb = useCallback(() => {
    globalToast({ title: "Exiting SEB", description: "Safe Exam Browser will attempt to close.", duration: 3000 });
    if (typeof window !== 'undefined') window.location.href = "seb://quit";
  }, []);

  useEffect(() => {
    const effectId = `[SebEntryClientNew ExitButtonEffect ${Date.now().toString().slice(-5)}]`;
    console.log(`${effectId} Stage: ${stage}, PreviouslySubmitted: ${isPreviouslySubmitted}`);
    if (
      stage === 'error' ||
      stage === 'securityChecksFailed' ||
      stage === 'examCompleted' ||
      stage === 'readyToStart'
    ) {
      setShowExitSebButton(true);
    } else if (
      stage === 'validatingToken' ||
      stage === 'fetchingDetails' ||
      stage === 'performingSecurityChecks' ||
      stage === 'startingExamSession' ||
      stage === 'examInProgress' ||
      stage === 'submittingExam'
    ) {
      setShowExitSebButton(false);
    }
  }, [stage, isPreviouslySubmitted]);


  useEffect(() => {
    const effectId = `[SebEntryClientNew InitEffect ${Date.now().toString().slice(-5)}]`;
    console.log(`${effectId} Current stage: ${stage}. IsDevMode: ${isDevModeActive}. Query params:`, searchParams?.toString());

    async function validateAndFetch() {
      if (authContextLoading && stage === 'initializing') {
        console.log(`${effectId} AuthContext loading during initialization. Waiting.`);
        return;
      }

      if (stage === 'initializing') {
        console.log(`${effectId} Stage: initializing. Performing initial checks for token flow.`);
        const tokenFromQuery = searchParams?.get('token');

        if (!isDevModeActive && !isSebEnvironment()) {
          const errorMsg = "This page must be accessed within Safe Exam Browser (production mode).";
          console.error(`${effectId} CRITICAL (Prod Mode): ${errorMsg}`);
          setPageError(errorMsg); setStage('error'); return;
        }

        if (!tokenFromQuery) {
          const errorMsg = "CRITICAL: SEB entry token missing from URL query parameters.";
          console.error(`${effectId} ${errorMsg}`);
          setPageError(errorMsg); setStage('error'); return;
        }
        console.log(`${effectId} Token found, moving to validatingToken stage.`);
        setStage('validatingToken');
        return;
      }

      if (stage === 'validatingToken') {
        const tokenToValidate = searchParams?.get('token');
        if (!tokenToValidate) {
          setPageError("Token missing for validation stage."); setStage('error'); return;
        }
        console.log(`${effectId} Stage: validatingToken. Token: ${tokenToValidate.substring(0, 10)}...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.warn(`${effectId} Token validation API call timed out after ${TOKEN_VALIDATION_TIMEOUT_MS}ms.`);
          controller.abort();
        }, TOKEN_VALIDATION_TIMEOUT_MS);

        try {
          const res = await fetch(`/api/seb/validate-token?token=${encodeURIComponent(tokenToValidate)}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          console.log(`${effectId} Token validation API response status: ${res.status}`);
          
          let responseBody;
          let apiErrorMsg = `Token validation API request failed with status: ${res.status}.`; 
          
          if (res.ok) {
            responseBody = await res.json().catch(() => { throw new Error("Failed to parse successful API response as JSON.")});
            setValidatedStudentId(responseBody.studentId);
            setValidatedExamId(responseBody.examId);
            setIsPreviouslySubmitted(responseBody.isAlreadySubmitted || false);
            console.log(`${effectId} Token validated. StudentID: ${responseBody.studentId}, ExamID: ${responseBody.examId}, PreviouslySubmitted: ${responseBody.isAlreadySubmitted}. Moving to fetchingDetails.`);
            setStage('fetchingDetails');

          } else { 
            try {
                responseBody = await res.json();
                if (responseBody && typeof responseBody.error === 'string') {
                    apiErrorMsg = responseBody.error;
                } else {
                    apiErrorMsg = res.statusText || apiErrorMsg;
                }
            } catch (jsonParseError) {
                apiErrorMsg = res.statusText || apiErrorMsg; 
            }
            console.error(`${effectId} Token validation API error: ${apiErrorMsg}`, responseBody);
            throw new Error(apiErrorMsg);
          }
        } catch (e: any) {
          const errorMsg = getSafeErrorMessage(e, "Error during token validation.");
          console.error(`${effectId} Exception during token validation:`, errorMsg, e);
          setPageError(`Token Validation Error: ${errorMsg}`); setStage('error');
        }
        return;
      }

      if (stage === 'fetchingDetails' && validatedExamId && validatedStudentId) {
        console.log(`${effectId} Stage: fetchingDetails. Fetching exam (${validatedExamId}) and student (${validatedStudentId}) details.`);
        if (!supabase) {
          const errorMsg = "CRITICAL: Service connection failed. Cannot load exam details.";
          console.error(`${effectId} ${errorMsg}`);
          setPageError(errorMsg); setStage('error'); return;
        }

        let fetchedExam: Exam | null = null;
        let fetchedStudent: CustomUser | null = null;

        try {
          console.log(`${effectId} Fetching exam details for ID: ${validatedExamId}`);
          const { data: examData, error: examError } = await supabase.from('ExamX').select('*').eq('exam_id', validatedExamId).single();
          if (examError || !examData) {
              const fetchExamErrorMsg = getSafeErrorMessage(examError, `Exam ${validatedExamId} not found or access denied.`);
              throw new Error(fetchExamErrorMsg);
          }
          fetchedExam = examData as Exam;
          console.log(`${effectId} Exam details fetched: ${fetchedExam.title}`);

          console.log(`${effectId} Fetching student profile for ID: ${validatedStudentId}`);
          const { data: studentData, error: studentError } = await supabase.from('proctorX').select('*').eq('user_id', validatedStudentId).single();
          if (studentError || !studentData) {
            const fetchStudentErrorMsg = getSafeErrorMessage(studentError, `Student ${validatedStudentId} not found or access denied.`);
            throw new Error(fetchStudentErrorMsg);
          }
          fetchedStudent = studentData as CustomUser;
          console.log(`${effectId} Student profile fetched: ${fetchedStudent.name}`);

          setExamDetails(fetchedExam);
          setStudentProfile(fetchedStudent);

          if (fetchedExam.questions && fetchedExam.questions.length > 0) {
            console.log(`${effectId} Exam and student details fetched successfully. Data is ready.`);
            setIsDataReadyForExam(true); setStage('readyToStart');
          } else {
            const noQuestionsError = "This exam currently has no questions. Please contact your instructor.";
            console.error(`${effectId} ${noQuestionsError}`);
            setPageError(`Cannot start exam: ${noQuestionsError}`); setStage('error');
          }
        } catch (e: any) {
          const errorMsg = getSafeErrorMessage(e, "Failed to load exam/student info.");
          console.error(`${effectId} Exception during data fetching:`, errorMsg, e);
          setPageError(`Data Loading Error: ${errorMsg}`); setStage('error');
        }
      }
    }

    if (stage === 'initializing' || stage === 'validatingToken' || stage === 'fetchingDetails') {
      validateAndFetch();
    }
  }, [stage, searchParams, isDevModeActive, supabase, authContextLoading, validatedExamId, validatedStudentId]);

  const runSecurityChecks = useCallback(async () => {
    const operationId = `[SebEntryClientNew runSecurityChecks ${Date.now().toString().slice(-5)}]`;
    console.log(`${operationId} Initiated.`);
    if (!examDetails || !studentProfile || !validatedStudentId) {
      const errorMsg = "Cannot run security checks: Essential exam or student data is missing.";
      console.error(`${operationId} Aborting: ${errorMsg}`);
      setPageError(errorMsg); setStage('error'); return;
    }
    if (isPreviouslySubmitted) {
      console.log(`${operationId} Exam previously submitted. Skipping security checks.`);
      setStage('readyToStart'); 
      return;
    }

    setStage('performingSecurityChecks');
    let allCriticalPassed = true;

    const currentChecksConfig = securityChecks.map(c => ({ ...c, status: 'pending' as 'pending' }));

    for (let i = 0; i < currentChecksConfig.length; i++) {
      const check = currentChecksConfig[i];
      console.log(`${operationId} Performing check: ${check.label} (Critical: ${check.isCritical})`);
      currentChecksConfig[i] = { ...check, status: 'checking' };
      setSecurityChecks([...currentChecksConfig]);
      await new Promise(resolve => setTimeout(resolve, 1800));

      try {
        const passed = await check.checkFn();
        currentChecksConfig[i] = { ...check, status: passed ? 'passed' : 'failed', details: passed ? 'OK' : `Failed: ${check.label}` };
        if (!passed && check.isCritical) {
          console.log(`${operationId} Check ${check.label}: Failed (Critical)`);
          allCriticalPassed = false;
        } else {
          console.log(`${operationId} Check ${check.label}: ${passed ? 'Passed' : 'Failed'}`);
        }
      } catch (e: any) {
        const errorMsg = getSafeErrorMessage(e, `Error during security check: ${check.label}`);
        currentChecksConfig[i] = { ...check, status: 'failed', details: errorMsg };
        if (check.isCritical) allCriticalPassed = false;
        console.error(`${operationId} Error in check ${check.label}:`, errorMsg, e);
      }
      setSecurityChecks([...currentChecksConfig]);
      if (!allCriticalPassed && check.isCritical && currentChecksConfig[i].status === 'failed') {
        console.error(`${operationId} Critical check ${currentChecksConfig[i].label} failed. Stopping further checks.`);
        break;
      }
    }

    if (allCriticalPassed) {
      console.log(`${operationId} All critical checks passed. Moving to startingExamSession.`);
      setStage('startingExamSession');
    } else {
      const failedCritical = currentChecksConfig.find(c => c.status === 'failed' && c.isCritical);
      let errorMsg = `Critical security check failed: ${failedCritical?.details || failedCritical?.label || 'Unknown Check'}. Cannot start exam.`;
      console.error(`${operationId} Security checks evaluation: ${errorMsg}`);
      setPageError(errorMsg); setStage('securityChecksFailed');
    }
  }, [examDetails, studentProfile, validatedStudentId, isPreviouslySubmitted, securityChecks, isDevModeActive]);

  const handleStartExamSession = useCallback(async () => {
    const operationId = `[SebEntryClientNew handleStartExamSession ${Date.now().toString().slice(-5)}]`;
    console.log(`${operationId} Initiated.`);

    if (!isDataReadyForExam || !examDetails || !validatedStudentId || !supabase || !studentProfile || !examDetails.questions || examDetails.questions.length === 0) {
      let errorParts: string[] = [];
      if (!isDataReadyForExam) errorParts.push("Data not fully ready");
      if (!examDetails) errorParts.push("ExamDetails missing"); else if (!examDetails.questions || examDetails.questions.length === 0) errorParts.push("Exam has no questions");
      if (!validatedStudentId) errorParts.push("ValidatedStudentId missing"); if (!supabase) errorParts.push("Supabase client unavailable"); if (!studentProfile) errorParts.push("StudentProfile missing");
      const errorMsg = `Essential data missing to start exam session: ${errorParts.join(', ')}. Cannot proceed.`;
      console.error(`${operationId} Aborting: ${errorMsg}`);
      setPageError(errorMsg); setStage('error'); return;
    }
    console.log(`${operationId} Upserting 'In Progress' for exam: ${examDetails.exam_id}, student: ${validatedStudentId}`);
    try {
      const { error: submissionUpsertError } = await supabase.from('ExamSubmissionsX')
        .upsert({
          exam_id: examDetails.exam_id, student_user_id: validatedStudentId, status: 'In Progress', started_at: new Date().toISOString(),
          answers: null, flagged_events: null, score: null, submitted_at: null,
        }, { onConflict: 'exam_id, student_user_id' })
        .select();

      if (submissionUpsertError) {
        const warningMsg = getSafeErrorMessage(submissionUpsertError, "Could not record exam start accurately.");
        console.warn(`${operationId} Error upserting 'In Progress' submission:`, warningMsg, submissionUpsertError);
        globalToast({ title: "Start Record Warning", description: warningMsg, variant: "default" });
      } else console.log(`${operationId} 'In Progress' submission record upserted.`);
      setStage('examInProgress');
      console.log(`${operationId} Stage set to examInProgress.`);
    } catch (e: any) {
      const errorMsg = getSafeErrorMessage(e, "Failed to initialize exam session state.");
      console.error(`${operationId} Exception:`, errorMsg, e);
      setPageError(errorMsg); setStage('error');
    }
  }, [examDetails, validatedStudentId, supabase, studentProfile, globalToast, isDataReadyForExam]);

  useEffect(() => {
    const effectId = `[SebEntryClientNew useEffect for startingExamSession ${Date.now().toString().slice(-5)}]`;
    if (stage === 'startingExamSession') {
      console.log(`${effectId} Stage is startingExamSession, calling handleStartExamSession.`);
      handleStartExamSession();
    }
  }, [stage, handleStartExamSession]);

  const handleExamSubmitOrTimeUp = useCallback(async (answers: Record<string, string>, flaggedEventsFromInterface: FlaggedEvent[], submissionType: 'submit' | 'timeup') => {
    const operationId = `[SebEntryClientNew handleExamSubmitOrTimeUp ${Date.now().toString().slice(-5)}] Type: ${submissionType}`;
    console.log(`${operationId} Initiated.`);
    if (!validatedExamId || !validatedStudentId || !examDetails || !studentProfile) {
      const errorMsg = "Student or Exam details missing for submission. Cannot submit.";
      console.error(`${operationId} ${errorMsg}`);
      globalToast({ title: "Submission Error", description: errorMsg, variant: "destructive" });
      setPageError(errorMsg); setStage('error'); return;
    }
    setStage('submittingExam'); setIsSubmittingViaApi(true);

    const submissionPayload = {
      exam_id: validatedExamId, student_user_id: validatedStudentId, answers: answers,
      flagged_events: flaggedEventsFromInterface.length > 0 ? flaggedEventsFromInterface : null,
      status: 'Completed' as 'Completed', submitted_at: new Date().toISOString(),
    };
    console.log(`${operationId} Submitting payload (answers omitted for brevity):`, { ...submissionPayload, answers: Object.keys(answers).length > 0 ? "{...}" : "{}" });

    try {
      const response = await fetch('/api/seb/submit-exam', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(submissionPayload),
      });

      const responseBody = await response.json().catch(() => {
        throw new Error(`API Error: ${response.status} - ${response.statusText || 'Could not parse submission response.'}`);
      });

      if (!response.ok) {
        const apiErrorMsg = getSafeErrorMessage(responseBody?.error || responseBody, `API submission failed with status: ${response.status}.`);
        console.error(`${operationId} API submission failed. Status: ${response.status}, Error: ${apiErrorMsg}`);
        throw new Error(apiErrorMsg);
      }

      console.log(`${operationId} Submission successful via API. Result:`, responseBody);
      globalToast({ title: submissionType === 'submit' ? "Exam Submitted!" : "Exam Auto-Submitted!", description: "Your responses have been recorded.", duration: 6000 });
      setExamDetails(prev => prev ? ({ ...prev, status: 'Completed' }) : null); 
      setIsPreviouslySubmitted(true); 
      setStage('examCompleted');
    } catch (e: any) {
      const errorMsg = getSafeErrorMessage(e, "Failed to submit exam.");
      console.error(`${operationId} Exception during submission:`, errorMsg, e);
      setPageError(`Submission Error: ${errorMsg}`); setStage('error');
      globalToast({ title: "Submission Error", description: errorMsg, variant: "destructive", duration: 10000 });
    } finally {
      setIsSubmittingViaApi(false);
    }
  }, [validatedExamId, validatedStudentId, examDetails, studentProfile, globalToast]);

  const isLoadingCriticalStages = stage === 'initializing' || stage === 'validatingToken' || stage === 'fetchingDetails' || (authContextLoading && stage === 'initializing');

  if (isLoadingCriticalStages && !pageError) {
    let message = "Initializing Secure Exam Environment...";
    if (stage === 'validatingToken') message = "Validating exam session token...";
    if (stage === 'fetchingDetails') message = "Loading exam and student details...";
    if (authContextLoading && stage === 'initializing') message = "Initializing secure context...";

    return (
      <div className="flex flex-col items-center justify-center text-center min-h-screen w-full p-4 bg-background text-foreground overflow-hidden">
        <Loader2 className="h-16 w-16 text-primary animate-spin mb-6 stroke-width-1.5" />
        <h2 className="text-xl font-medium mb-2">{message}</h2>
      </div>
    );
  }

  if (stage === 'error') {
    const displayError = pageError || "An unknown error occurred. Could not prepare the exam session.";
    return (
      <main className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-background text-foreground overflow-hidden">
        <div className="w-full max-w-lg text-center bg-card p-6 sm:p-8 rounded-xl shadow-xl border-destructive/50">
          <XCircle className="h-16 w-16 text-destructive mx-auto mb-5 stroke-width-1.5" />
          <h2 className="text-2xl font-semibold mb-3 text-destructive">Exam Access Error</h2>
          <p className="text-sm mb-6 whitespace-pre-wrap text-muted-foreground">{displayError}</p>
          {showExitSebButton && (
              <Button onClick={handleExitSeb} className="w-full btn-gradient-destructive">Exit SEB</Button>
          )}
        </div>
      </main>
    );
  }

  if (stage === 'performingSecurityChecks' || stage === 'securityChecksFailed') {
    return (
      <main className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-background text-foreground overflow-hidden">
        <Card className="w-full max-w-lg text-center bg-card p-6 sm:p-8 rounded-xl shadow-xl border-border/30">
          <CardHeader className="border-b border-border/20 pb-4 mb-6 p-0">
            <Shield className="h-12 w-12 text-primary mx-auto mb-3 stroke-width-1.5" />
            <CardTitle className="text-xl sm:text-2xl font-semibold text-foreground">Security System Check</CardTitle>
            <p className="text-xs sm:text-sm text-muted-foreground pt-1">Verifying your exam environment. Please wait.</p>
          </CardHeader>
          <CardContent className="space-y-3 text-left p-0">
            {securityChecks.map(check => {
              const IconComponent = check.icon || HelpCircleIcon;
              return (
                <div key={check.id} className={cn(
                  "flex justify-between items-center p-3 rounded-md border text-sm",
                  check.status === 'pending' ? 'border-border/50 bg-muted/30 text-muted-foreground' :
                  check.status === 'checking' ? 'border-primary/60 bg-primary/10 text-primary animate-pulse' :
                  check.status === 'passed' ? 'border-green-500/60 bg-green-500/10 text-green-700 dark:text-green-300' :
                  'border-destructive/60 bg-red-500/10 text-red-700 dark:text-red-300'
                )}>
                  <div className="flex items-center gap-2">
                    <IconComponent className={cn("h-5 w-5 stroke-width-1.5",
                       check.status === 'pending' ? 'text-muted-foreground/70' :
                       check.status === 'checking' ? 'text-primary' :
                       check.status === 'passed' ? 'text-green-600 dark:text-green-400' :
                       'text-red-600 dark:text-red-400'
                    )} />
                    <span className="font-medium text-foreground">{check.label}</span>
                  </div>
                  {check.status === 'pending' && <Loader2 className="h-4 w-4 text-muted-foreground animate-spin stroke-width-1.5" />}
                  {check.status === 'checking' && <Loader2 className="h-4 w-4 text-primary animate-spin stroke-width-1.5" />}
                  {check.status === 'passed' && <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 stroke-width-1.5" />}
                  {check.status === 'failed' && <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 stroke-width-1.5" />}
                </div>
              );
            })}
          </CardContent>
          {stage === 'securityChecksFailed' && pageError && (
            <Alert variant="destructive" className="mt-6 text-left">
              <AlertTriangle className="h-5 w-5 stroke-width-1.5" />
              <AlertTitle className="font-semibold">Security Check Failed!</AlertTitle>
              <AlertDescription>{pageError}</AlertDescription>
            </Alert>
          )}
          <div className="mt-8">
            {stage === 'securityChecksFailed' && showExitSebButton && (
              <Button onClick={handleExitSeb} className="w-full btn-gradient-destructive">Exit SEB</Button>
            )}
            {stage === 'performingSecurityChecks' && !securityChecks.find(c => c.status === 'failed' && c.isCritical) && (
              <Button className="w-full btn-primary-solid opacity-70" disabled>
                <Loader2 className="h-4 w-4 mr-2 animate-spin stroke-width-1.5" /> Checking Environment...
              </Button>
            )}
          </div>
        </Card>
      </main>
    );
  }

  if (stage === 'startingExamSession' || stage === 'submittingExam') {
    return (
      <div className="flex flex-col items-center justify-center text-center min-h-screen w-full p-4 bg-background text-foreground overflow-hidden">
        <Loader2 className="h-16 w-16 text-primary animate-spin mb-6 stroke-width-1.5" />
        <h2 className="text-xl font-medium mb-2">
          {stage === 'startingExamSession' ? "Preparing your exam session..." : "Submitting Exam..."}
        </h2>
        {stage === 'submittingExam' && <p className="text-sm text-muted-foreground">Please wait, do not close SEB.</p>}
      </div>
    );
  }

  if (!examDetails || !studentProfile || !isDataReadyForExam) {
    console.error("[SebEntryClientNew Render] Critical data (examDetails, studentProfile, or isDataReady) is missing post-loading. Stage:", stage, "ExamDetails:", !!examDetails, "StudentProfile:", !!studentProfile, "isDataReady:", isDataReadyForExam);
    return (
      <main className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-background text-foreground overflow-hidden">
        <div className="w-full max-w-lg text-center bg-card p-6 sm:p-8 rounded-xl shadow-xl border-destructive/50">
          <ServerCrash className="h-16 w-16 text-destructive mx-auto mb-5 stroke-width-1.5" />
          <h2 className="text-xl font-semibold mb-3 text-destructive">Data Error</h2>
          <p className="text-sm mb-6 text-muted-foreground">Essential exam or student data could not be loaded. Please try re-entering or contact support.</p>
          {showExitSebButton && (
              <Button onClick={handleExitSeb} className="w-full max-w-xs btn-gradient-destructive">Exit SEB</Button>
          )}
        </div>
      </main>
    );
  }

  if (stage === 'examInProgress') {
    return (
      <ExamTakingInterface
        examDetails={examDetails} questions={examDetails.questions || []} parentIsLoading={isSubmittingViaApi}
        onAnswerChange={() => { }} 
        onSubmitExam={(answers, flaggedEvents) => handleExamSubmitOrTimeUp(answers, flaggedEvents, 'submit')}
        onTimeUp={(answers, flaggedEvents) => handleExamSubmitOrTimeUp(answers, flaggedEvents, 'timeup')}
        isDemoMode={false} userIdForActivityMonitor={studentProfile.user_id}
        studentName={studentProfile.name} studentRollNumber={studentProfile.user_id} 
        studentAvatarUrl={studentProfile.avatar_url} examStarted={true}
      />
    );
  }

  const isEffectivelyCompleted = stage === 'examCompleted' || isPreviouslySubmitted;
  let examStatusText = "Not Started";
  if (isPreviouslySubmitted) examStatusText = "Already Submitted";
  else if (stage === 'examCompleted') examStatusText = "Completed";
  else if (stage === 'readyToStart' && isDataReadyForExam) examStatusText = "Ready to Start";

  return (
    <div className="min-h-screen w-full flex flex-col sm:flex-row bg-background text-foreground overflow-hidden p-4 sm:p-6">
      {/* Left Column: Exam Info & Logo */}
      <div className="w-full sm:w-2/5 lg:w-1/3 flex flex-col bg-slate-50 text-foreground p-4 sm:p-6 space-y-4 rounded-lg sm:rounded-r-none shadow-lg">
        <header className="flex items-center justify-start shrink-0 h-16">
          <Image src={logoAsset} alt="ZenTest Logo" width={180} height={50} className="h-16 w-auto" />
        </header>
        <div className="flex-grow overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">{examDetails.title}</h1>
          {examDetails.description && <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{examDetails.description}</p>}
          
          <div className="space-y-1.5 text-xs sm:text-sm pt-3 border-t border-border/20">
            <p className="flex items-center gap-2 text-muted-foreground"><FileTextIcon className="h-4 w-4 text-primary shrink-0 stroke-width-1.5" /> Questions: <span className="font-medium text-foreground">{examDetails.questions?.length || 0}</span></p>
            {examDetails.start_time && isValidDate(parseISO(examDetails.start_time)) &&
              <p className="flex items-center gap-2 text-muted-foreground"><CalendarDays className="h-4 w-4 text-primary shrink-0 stroke-width-1.5" /> Scheduled Start: <span className="font-medium text-foreground">{format(parseISO(examDetails.start_time), "MMM d, yyyy, hh:mm a")}</span></p>
            }
            {examDetails.end_time && isValidDate(parseISO(examDetails.end_time)) &&
              <p className="flex items-center gap-2 text-muted-foreground"><CalendarDays className="h-4 w-4 text-primary shrink-0 stroke-width-1.5" /> Scheduled End: <span className="font-medium text-foreground">{format(parseISO(examDetails.end_time), "MMM d, yyyy, hh:mm a")}</span></p>
            }
            <p className="flex items-center gap-2 text-muted-foreground"><ListChecks className="h-4 w-4 text-primary shrink-0 stroke-width-1.5" /> Backtracking: <span className="font-medium text-foreground">{examDetails.allow_backtracking ? 'Allowed' : 'Not Allowed'}</span></p>
          </div>
        </div>
        <div className="mt-auto pt-4 border-t border-border/20 shrink-0">
          {showExitSebButton && (
            <Button variant="outline" onClick={handleExitSeb} className="w-full btn-outline-subtle py-2.5 rounded-md text-sm">
              <LogOut className="mr-2 h-4 w-4 stroke-width-1.5" /> Exit SEB
            </Button>
          )}
        </div>
      </div>

      {/* Right Column: User Info, Status, Actions, Rules */}
      <div className="w-full sm:w-3/5 lg:w-2/3 flex flex-col p-4 sm:p-6 space-y-6 bg-background">
        <div className="flex justify-end items-start shrink-0">
          <div className="flex items-center gap-3 p-3 border border-border/20 rounded-lg bg-card shadow-sm">
            <Avatar className="h-12 w-12 sm:h-16 sm:w-16 border-2 border-primary/60">
              <AvatarImage src={studentProfile.avatar_url || undefined} alt={studentProfile.name || 'Student'} />
              <AvatarFallback className="bg-muted text-muted-foreground text-lg sm:text-xl">
                {(studentProfile.name || "S").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-md sm:text-lg font-semibold text-foreground">{studentProfile.name}</p>
              <p className="text-xs text-muted-foreground">ID: {studentProfile.user_id}</p>
              {studentProfile.email && <p className="text-xs text-muted-foreground">{studentProfile.email}</p>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 shrink-0">
          <div className="border border-border/20 rounded-lg p-4 sm:p-6 text-center bg-card shadow-sm">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">Exam Duration</p>
            <p className="text-3xl sm:text-4xl font-bold text-foreground tabular-nums">{examDetails.duration} minutes</p>
          </div>
          <div className="border border-border/20 rounded-lg p-4 sm:p-6 text-center bg-card shadow-sm">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">Status</p>
            <p className={cn("text-3xl sm:text-4xl font-bold tabular-nums", isEffectivelyCompleted ? "text-green-600 dark:text-green-400" : "text-primary")}>
              {examStatusText}
            </p>
          </div>
        </div>
        
        <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 glass-pane p-4 sm:p-6 rounded-lg shadow-lg border border-border/20">
          <h3 className="text-md sm:text-lg font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary stroke-width-1.5" /> General Rules & Instructions
          </h3>
          <ul className="space-y-2 sm:space-y-2.5 text-xs sm:text-sm seb-rules-list">
            {generalRules.map((rule, index) => {
              const RuleIcon = rule.icon;
              return (
                <li key={index} className="flex items-start gap-2 sm:gap-2.5 text-muted-foreground">
                  <RuleIcon className="h-5 w-5 text-primary shrink-0 mt-0.5 stroke-width-1.5" />
                  <span>{rule.text}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex justify-center mt-auto pt-4 shrink-0">
          {isEffectivelyCompleted ? (
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-full max-w-md">
                    <Button className="w-full py-2.5 sm:py-3 text-md sm:text-lg opacity-60 cursor-not-allowed bg-primary/70 hover:bg-primary/60 text-primary-foreground/80" disabled>
                      <CircleSlash className="mr-2 h-5 w-5 stroke-width-1.5" /> Exam Submitted
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-popover text-popover-foreground border-border shadow-lg">
                  <p>You have already submitted this exam.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button
              onClick={runSecurityChecks}
              className="w-full max-w-md py-2.5 sm:py-3 text-md sm:text-lg shadow-xl btn-gradient"
              disabled={stage !== 'readyToStart' || !isDataReadyForExam || !examDetails.questions || examDetails.questions.length === 0 || isSubmittingViaApi}
            >
              <PlayCircle className="mr-2 h-5 sm:h-6 w-5 sm:w-6 stroke-width-1.5" />
              {(!examDetails.questions || examDetails.questions.length === 0) ? "No Questions in Exam" : "Start Exam & Security Checks"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

