
// src/components/seb/seb-entry-client-new.tsx
'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Card can still be used for security checks section
import { Loader2, AlertTriangle, PlayCircle, ShieldCheck, XCircle, Info, LogOut, ServerCrash, CheckCircle, Ban, CircleSlash, BookOpen, UserCircle2, CalendarDays, ListChecks, ShieldX } from 'lucide-react';
import type { Exam, CustomUser, FlaggedEvent } from '@/types/supabase';
import { useToast } from '@/hooks/use-toast';
import { format, isValid as isValidDate, parseISO } from 'date-fns';
import { isSebEnvironment, isOnline, areDevToolsLikelyOpen, isWebDriverActive } from '@/lib/seb-utils';
import { useAuth } from '@/contexts/AuthContext';
import { ExamTakingInterface } from '@/components/shared/exam-taking-interface';
import logoAsset from '../../../logo.png';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';

// Local getSafeErrorMessage helper (copied here since error-logging.ts was removed)
function getLocalSafeErrorMessage(e: any, defaultMessage = "An unknown error occurred."): string {
  if (e && typeof e === 'object') {
    if (e.name === 'AbortError') {
      return "The request timed out. Please check your connection and try again.";
    }
    if (typeof e.message === 'string' && e.message.trim() !== '') {
      return e.message;
    }
    try {
      const strError = JSON.stringify(e);
      if (strError !== '{}' && strError.length > 2) return `Error details: ${strError}`;
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
  | 'validatingToken'       // For production JWT flow
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

const TOKEN_VALIDATION_TIMEOUT_MS = 15000; // 15 seconds

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
  const isDevModeActive = process.env.NEXT_PUBLIC_DEV_MODE_SKIP_SEB_LAUNCH === "true";

  const handleExitSeb = useCallback(() => {
    toast({ title: "Exiting SEB", description: "Safe Exam Browser will attempt to close.", duration: 3000 });
    if (typeof window !== 'undefined') window.location.href = "seb://quit";
  }, [toast]);

  useEffect(() => {
    const effectId = `[SebEntryClientNew InitEffect ${Date.now().toString().slice(-5)}]`;
    console.log(`${effectId} Current stage: ${stage}. IsDevMode: ${isDevModeActive}. Token: ${entryTokenFromQuery ? 'Present' : 'N/A'}`);

    async function validateAndFetch() {
      if (authContextLoading) {
        console.log(`${effectId} AuthContext loading. Waiting.`);
        setStage('initializing'); 
        return;
      }

      if (stage === 'initializing') {
        console.log(`${effectId} Stage: initializing. Performing initial checks.`);
        // In dev mode, SEB environment check is lenient during security checks, not here.
        // This page MUST be entered with a token now, dev mode just changes SEB launch.
        if (!isDevModeActive && !isSebEnvironment()) {
          const errorMsg = "This page must be accessed within Safe Exam Browser (production mode).";
          console.error(`${effectId} CRITICAL (Prod Mode): ${errorMsg}`);
          setPageError(errorMsg);
          setStage('error');
          return;
        }

        if (!entryTokenFromQuery) {
          const errorMsg = "CRITICAL: SEB entry token missing from URL query parameters.";
          console.error(`${effectId} ${errorMsg}`);
          setPageError(errorMsg);
          setStage('error');
          return;
        }
        console.log(`${effectId} Token found, moving to validatingToken stage.`);
        setStage('validatingToken');
        return;
      }

      if (stage === 'validatingToken' && entryTokenFromQuery) { 
        console.log(`${effectId} Stage: validatingToken. Token: ${entryTokenFromQuery.substring(0, 10)}...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            console.warn(`${effectId} Token validation API call timed out after ${TOKEN_VALIDATION_TIMEOUT_MS}ms.`);
            controller.abort();
        }, TOKEN_VALIDATION_TIMEOUT_MS);

        try {
          const res = await fetch(`/api/seb/validate-token?token=${encodeURIComponent(entryTokenFromQuery)}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          
          console.log(`${effectId} Token validation API response status: ${res.status}`);
          let responseBody;
          let apiErrorMsg = `Token validation API request failed with status: ${res.status}.`;

          if (!res.ok) {
            try {
              responseBody = await res.json();
              apiErrorMsg = getLocalSafeErrorMessage(responseBody?.error || responseBody, apiErrorMsg);
            } catch (jsonParseError) {
              const rawText = await res.text().catch(() => "Could not read response text.");
              apiErrorMsg = `Failed to parse token validation API error response as JSON. Status: ${res.status}. Response: ${rawText.substring(0,150)}`;
            }
            console.error(`${effectId} Token validation API error: ${apiErrorMsg}`, responseBody);
            throw new Error(apiErrorMsg);
          }
          
          responseBody = await res.json(); // Assuming res.ok means valid JSON
          
          if (responseBody.error) { 
            apiErrorMsg = getLocalSafeErrorMessage(responseBody.error, `Token validation failed.`);
            console.error(`${effectId} Token validation API reported an error: ${apiErrorMsg}`);
            throw new Error(apiErrorMsg);
          }
          
          setValidatedStudentId(responseBody.studentId);
          setValidatedExamId(responseBody.examId);
          console.log(`${effectId} Token validated. StudentID: ${responseBody.studentId}, ExamID: ${responseBody.examId}. Moving to fetchingDetails stage.`);
          setStage('fetchingDetails');
        } catch (e: any) {
          const errorMsg = getLocalSafeErrorMessage(e, "An unexpected error occurred during token validation.");
          console.error(`${effectId} Exception during token validation:`, errorMsg, e);
          setPageError(`Token Validation Error: ${errorMsg}`);
          setStage('error');
        }
        return;
      }

      if (stage === 'fetchingDetails' && validatedExamId && validatedStudentId) {
        console.log(`${effectId} Stage: fetchingDetails. Fetching exam (${validatedExamId}) and student (${validatedStudentId}) details.`);
        
        if (!supabase) {
          const errorMsg = "CRITICAL: Service connection failed (Supabase client not available). Cannot load exam details.";
          console.error(`${effectId} ${errorMsg}`);
          setPageError(errorMsg);
          setStage('error');
          return;
        }

        let fetchedExam: Exam | null = null;
        let fetchedStudent: CustomUser | null = null;

        try {
          console.log(`${effectId} Fetching exam details for ID: ${validatedExamId}`);
          const { data: examData, error: examError } = await supabase
            .from('ExamX')
            .select('*')
            .eq('exam_id', validatedExamId)
            .single();

          if (examError || !examData) {
            const errorMsg = getLocalSafeErrorMessage(examError, `Exam ${validatedExamId} not found or could not be fetched.`);
            console.error(`${effectId} Error fetching exam: ${errorMsg}`, examError);
            throw new Error(`Failed to load exam details: ${errorMsg}`);
          }
          fetchedExam = examData as Exam;
          console.log(`${effectId} Exam details fetched: ${fetchedExam.title}`);

          console.log(`${effectId} Fetching student profile for ID: ${validatedStudentId}`);
          const { data: studentData, error: studentError } = await supabase
            .from('proctorX')
            .select('*') 
            .eq('user_id', validatedStudentId)
            .single();
            
          if (studentError || !studentData) {
            const errorMsg = getLocalSafeErrorMessage(studentError, `Student ${validatedStudentId} not found or could not be fetched.`);
            console.error(`${effectId} Error fetching student: ${errorMsg}`, studentError);
            throw new Error(`Failed to load student profile: ${errorMsg}`);
          }
          fetchedStudent = studentData as CustomUser;
          console.log(`${effectId} Student profile fetched: ${fetchedStudent.name}`);

          setExamDetails(fetchedExam);
          setStudentProfile(fetchedStudent);
          
          if (fetchedExam.questions && fetchedExam.questions.length > 0) {
              console.log(`${effectId} Exam and student details fetched successfully. Data is ready for exam.`);
              setIsDataReadyForExam(true);
              setStage('readyToStart');
          } else {
              const noQuestionsError = "This exam currently has no questions. Please contact your instructor.";
              console.error(`${effectId} ${noQuestionsError}`);
              setPageError(`Cannot start exam: ${noQuestionsError}`);
              setStage('error');
          }
          setShowExitSebButton(true);
        } catch (e: any) {
          const errorMsg = getLocalSafeErrorMessage(e, "Failed to load exam or student information.");
          console.error(`${effectId} Exception during data fetching:`, errorMsg, e);
          setPageError(`Data Loading Error: ${errorMsg}`);
          setStage('error');
        }
      }
    }

    if (stage === 'initializing' || stage === 'validatingToken' || stage === 'fetchingDetails') {
        validateAndFetch();
    }
  }, [stage, entryTokenFromQuery, isDevModeActive, supabase, authContextLoading, validatedExamId, validatedStudentId, handleExitSeb, toast]);


  const runSecurityChecks = useCallback(async () => {
    const operationId = `[SebEntryClientNew runSecurityChecks ${Date.now().toString().slice(-5)}]`;
    console.log(`${operationId} Initiated.`);
    if (!examDetails || !studentProfile || !validatedStudentId) {
        const errorMsg = "Cannot run security checks: Essential exam or student data is missing.";
        console.error(`${operationId} Aborting: ${errorMsg}`);
        setPageError(errorMsg);
        setStage('error');
        setShowExitSebButton(true);
        return;
    }

    setStage('performingSecurityChecks');
    setShowExitSebButton(false); 
    let allCriticalPassed = true;

    const currentChecksConfig = INITIAL_SECURITY_CHECKS.map(c => {
        let isCritical = c.isCritical;
        // In dev mode, SEB environment check is non-critical
        if (isDevModeActive && c.id === 'sebEnv') {
            isCritical = false; 
        }
        return { ...c, status: 'pending' as 'pending' | 'checking' | 'passed' | 'failed', details: undefined, isCritical };
    });
    setSecurityChecks([...currentChecksConfig]);

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
          allCriticalPassed = false;
        }
        console.log(`${operationId} Check ${check.label}: ${passed ? 'Passed' : 'Failed'}`);
      } catch (e: any) {
        const errorMsg = getLocalSafeErrorMessage(e, `Error during security check: ${check.label}`);
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
      if(isDevModeActive && failedCritical?.id === 'sebEnv'){
         errorMsg = `SEB Environment check failed (dev mode: non-critical). Other critical checks might have passed.`;
         // For dev mode, even if SEB check fails, if it's the *only* critical fail, we might allow proceeding
         // but this logic path means *another* critical check failed.
         console.warn(`${operationId} Dev mode with SEB check failed, but allowing proceed if it was the only one. Current state: allCriticalPassed is ${allCriticalPassed}. This implies another critical check failed.`);
      }
      
      console.error(`${operationId} Security checks evaluation: ${errorMsg}`);
      setPageError(errorMsg);
      setStage('securityChecksFailed');
      setShowExitSebButton(true);
    }
  }, [examDetails, studentProfile, validatedStudentId, isDevModeActive]);

  const handleStartExamSession = useCallback(async () => {
    const operationId = `[SebEntryClientNew handleStartExamSession ${Date.now().toString().slice(-5)}]`;
    console.log(`${operationId} Initiated.`);

    if (!isDataReadyForExam || !examDetails || !validatedStudentId || !supabase || !studentProfile || !examDetails.questions || examDetails.questions.length === 0) {
      let errorParts: string[] = [];
      if (!isDataReadyForExam) errorParts.push("Data not ready for exam flag not set");
      if (!examDetails) errorParts.push("ExamDetails missing");
      else if (!examDetails.questions || examDetails.questions.length === 0) errorParts.push("Exam has no questions");
      if (!validatedStudentId) errorParts.push("ValidatedStudentId missing");
      if (!supabase) errorParts.push("Supabase client unavailable");
      if (!studentProfile) errorParts.push("StudentProfile missing");
      
      const errorMsg = `Essential data missing to start exam session: ${errorParts.join(', ')}. Cannot proceed.`;
      console.error(`${operationId} Aborting: ${errorMsg}`);
      setPageError(errorMsg);
      setStage('error');
      return;
    }
    console.log(`${operationId} All data present. Upserting 'In Progress' for exam: ${examDetails.exam_id}, student: ${validatedStudentId}`);
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
          score: null, 
          submitted_at: null, 
        }, { onConflict: 'exam_id, student_user_id' })
        .select();

      if (submissionUpsertError) {
        const warningMsg = getLocalSafeErrorMessage(submissionUpsertError, "Could not accurately record exam start time, but proceeding.");
        console.warn(`${operationId} Error upserting 'In Progress' submission:`, warningMsg, submissionUpsertError);
        toast({ title: "Start Record Warning", description: warningMsg, variant: "default" });
      } else {
        console.log(`${operationId} 'In Progress' submission record upserted successfully.`);
      }
      setActivityFlagsDuringExam([]); 
      setStage('examInProgress');
      setShowExitSebButton(false); 
      console.log(`${operationId} Stage set to examInProgress.`);
    } catch (e: any) {
      const errorMsg = getLocalSafeErrorMessage(e, "Failed to initialize exam session state.");
      console.error(`${operationId} Exception:`, errorMsg, e);
      setPageError(errorMsg);
      setStage('error');
    }
  }, [examDetails, validatedStudentId, supabase, studentProfile, toast, isDataReadyForExam]);

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
      toast({ title: "Submission Error", description: errorMsg, variant: "destructive" });
      setPageError(errorMsg); 
      setStage('error'); 
      return;
    }
    setStage('submittingExam');
    setIsSubmittingViaApi(true);

    const combinedFlaggedEvents = [...activityFlagsDuringExam, ...flaggedEventsFromInterface];
    const submissionPayload = { 
      exam_id: validatedExamId,
      student_user_id: validatedStudentId,
      answers: answers,
      flagged_events: combinedFlaggedEvents.length > 0 ? combinedFlaggedEvents : null,
      status: 'Completed' as 'Completed',
      submitted_at: new Date().toISOString(),
    };
    console.log(`${operationId} Submitting payload (answers omitted for brevity):`, {...submissionPayload, answers: Object.keys(answers).length > 0 ? "{...}" : "{}"});

    try {
      const response = await fetch('/api/seb/submit-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionPayload),
      });
      
      if (!response.ok) {
        let apiErrorMsg = `API submission failed with status: ${response.status}.`;
         try {
            const errorBody = await response.json();
            apiErrorMsg = getLocalSafeErrorMessage(errorBody?.error || errorBody, apiErrorMsg);
        } catch (jsonParseError) {
            apiErrorMsg += ` Response was not valid JSON.`;
        }
        console.error(`${operationId} API submission failed. Status: ${response.status}, Error: ${apiErrorMsg}`);
        throw new Error(apiErrorMsg);
      }
      
      const responseBody = await response.json();
      console.log(`${operationId} Submission successful via API. Result:`, responseBody);
      toast({ title: submissionType === 'submit' ? "Exam Submitted!" : "Exam Auto-Submitted!", description: "Your responses have been recorded.", duration: 6000 });
      setExamDetails(prev => prev ? ({ ...prev, status: 'Completed' }) : null); 
      setStage('examCompleted');
      setShowExitSebButton(true);
    } catch (e: any) {
      const errorMsg = getLocalSafeErrorMessage(e, "Failed to submit exam.");
      console.error(`${operationId} Exception during submission:`, errorMsg, e);
      setPageError(`Submission Error: ${errorMsg}`);
      setStage('error'); 
      toast({ title: "Submission Error", description: errorMsg, variant: "destructive", duration: 10000 });
    } finally {
      setIsSubmittingViaApi(false);
    }
  }, [validatedExamId, validatedStudentId, examDetails, studentProfile, toast, activityFlagsDuringExam]);

  // --- RENDER LOGIC ---

  const isLoadingCriticalStages = stage === 'initializing' || stage === 'validatingToken' || stage === 'fetchingDetails' || authContextLoading;

  if (isLoadingCriticalStages && !pageError) {
    let message = "Initializing Secure Exam Environment...";
    if (stage === 'validatingToken') message = "Validating exam session token...";
    if (stage === 'fetchingDetails') message = "Loading exam and student details...";
    if (authContextLoading && stage === 'initializing') message = "Initializing secure context...";

    return (
      <div className="flex flex-col items-center justify-center text-center min-h-screen w-full p-4 bg-background text-foreground">
        <Loader2 className="h-16 w-16 text-primary animate-spin mb-6" />
        <h2 className="text-xl font-medium text-foreground mb-2">{message}</h2>
      </div>
    );
  }
  
  if (stage === 'error') {
    const displayError = pageError || "An unknown error occurred. Could not prepare the exam session.";
    return (
      <div className="flex flex-col items-center justify-center min-h-screen w-full p-4 bg-background text-foreground">
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
     console.error("[SebEntryClientNew Render] Critical data (examDetails or studentProfile) is missing post-loading stages. Stage:", stage, "Exam:", !!examDetails, "Student:", !!studentProfile);
     return ( 
       <div className="flex flex-col items-center justify-center text-center min-h-screen w-full p-4 bg-background text-foreground">
        <div className="w-full max-w-lg text-center p-6 sm:p-8 rounded-xl shadow-2xl border border-destructive bg-destructive/5">
            <ServerCrash className="h-16 w-16 text-destructive mx-auto mb-5" />
            <h2 className="text-xl font-semibold mb-3 text-destructive">Data Error</h2>
            <p className="text-sm mb-6 text-destructive/90">Essential exam or student data could not be loaded. Please try re-entering or contact support.</p>
            <Button onClick={handleExitSeb} className="w-full max-w-xs btn-gradient-destructive">Exit SEB</Button>
        </div>
      </div>
    );
  }


  if (stage === 'performingSecurityChecks' || stage === 'securityChecksFailed') {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-background text-foreground">
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
                check.status === 'passed' ? 'border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400' : 
                'border-destructive/50 bg-red-500/10 text-red-700 dark:text-red-400' 
              )}>
                <span className="font-medium text-foreground">{check.label}</span>
                {check.status === 'pending' && <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />}
                {check.status === 'checking' && <Loader2 className="h-4 w-4 text-primary animate-spin" />}
                {check.status === 'passed' && <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-500" />}
                {check.status === 'failed' && <ShieldX className="h-5 w-5 text-destructive dark:text-red-500" />}
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
            {stage === 'securityChecksFailed' && showExitSebButton && (
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
      <div className="flex flex-col items-center justify-center text-center min-h-screen w-full p-4 bg-background text-foreground">
        <Loader2 className="h-16 w-16 text-primary animate-spin mb-6" />
        <h2 className="text-xl font-medium text-foreground mb-2">Preparing your exam session...</h2>
      </div>
    );
  }
  
  if (stage === 'submittingExam') {
     return (
      <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-background/90 backdrop-blur-md p-6 text-center">
          <Loader2 className="h-16 w-16 text-primary animate-spin mb-6" />
          <h2 className="text-xl font-medium text-foreground mb-2">Submitting Exam...</h2>
          <p className="text-sm text-muted-foreground">Please wait, do not close SEB.</p>
      </div>
    );
  }


  if (stage === 'examInProgress') {
     if (!isDataReadyForExam || !examDetails.questions || examDetails.questions.length === 0) { 
        const errorMsg = "Critical data missing for exam. Cannot proceed.";
        console.error("[SebEntryClientNew Render] Error before rendering ExamTakingInterface:", errorMsg, { isDataReadyForExam, examDetails:!!examDetails, studentProfile:!!studentProfile, questions: examDetails?.questions?.length });
        return ( 
             <div className="flex flex-col items-center justify-center text-center min-h-screen w-full p-4 bg-background text-foreground">
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
        parentIsLoading={isSubmittingViaApi} 
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

  return (
    <div className="min-h-screen w-full flex flex-col sm:flex-row bg-background text-foreground">
      {/* Left Column - Exam Info */}
      <div className="w-full sm:w-1/3 p-6 sm:p-10 flex flex-col justify-between bg-slate-50 border-r border-border/30">
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
                {examDetails.start_time && isValidDate(parseISO(examDetails.start_time)) && 
                    <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> Scheduled Start: <span className="font-medium">{format(parseISO(examDetails.start_time), "MMM d, yyyy, hh:mm a")}</span></p>
                }
                {examDetails.end_time && isValidDate(parseISO(examDetails.end_time)) && 
                    <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> Scheduled End: <span className="font-medium">{format(parseISO(examDetails.end_time), "MMM d, yyyy, hh:mm a")}</span></p>
                }
            </div>
          </div>
        </div>
        {showExitSebButton && (
          <Button variant="outline" onClick={handleExitSeb} className="w-full mt-6 sm:mt-10 btn-outline-subtle text-muted-foreground border-border hover:bg-accent/50">
            <LogOut className="mr-2 h-4 w-4" /> Exit SEB
          </Button>
        )}
      </div>

      {/* Right Column - User Info & Actions */}
      <div className="w-full sm:w-2/3 p-6 sm:p-10 flex flex-col bg-background">
        <div className="flex justify-end items-start mb-auto">
          <div className="text-right space-y-1 p-3 sm:p-4 bg-card rounded-lg shadow-md border border-border/50">
            <div className="flex items-center justify-end gap-2 sm:gap-3">
              <div>
                <p className="text-sm sm:text-md font-semibold text-foreground">{studentProfile.name}</p>
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
                isExamEffectivelyCompleted ? "text-green-600" : 
                (stage === 'readyToStart' && isDataReadyForExam) ? "text-blue-600" : 
                "text-yellow-600" 
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
              disabled={stage !== 'readyToStart' || !isDataReadyForExam || !examDetails.questions || examDetails.questions.length === 0 || isSubmittingViaApi}
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
