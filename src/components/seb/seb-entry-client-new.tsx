
'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertTriangle, PlayCircle, ShieldCheck, XCircle, Info, LogOut, ServerCrash, CheckCircle, Ban, CircleSlash, BookOpen, UserCircle2, CalendarDays, ListChecks, Shield, ClockIcon, FileTextIcon, HelpCircleIcon, Wifi, Maximize, Zap, LinkIcon } from 'lucide-react';
import type { Exam, CustomUser, FlaggedEvent, ExamSubmissionInsert } from '@/types/supabase'; // Added ExamSubmissionInsert
import { useToast, toast as globalToast } from '@/hooks/use-toast'; 
import { format, isValid as isValidDate, parseISO } from 'date-fns';
import { isSebEnvironment, isOnline, areDevToolsLikelyOpen, isWebDriverActive } from '@/lib/seb-utils';
import { useAuth } from '@/contexts/AuthContext';
import { ExamTakingInterface } from '@/components/shared/exam-taking-interface';
import logoAsset from '../../../logo.png';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ScrollArea } from '@/components/ui/scroll-area';

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
  const { toast } = useToast();

  const [stage, setStage] = useState<string>('initializing');
  const [pageError, setPageError] = useState<string | null>(null);

  const [validatedStudentId, setValidatedStudentId] = useState<string | null>(null);
  const [validatedExamId, setValidatedExamId] = useState<string | null>(null);
  const [isPreviouslySubmitted, setIsPreviouslySubmitted] = useState(false);
  const [fetchedSavedLinks, setFetchedSavedLinks] = useState<string[]>([]); // New state for links

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
      (stage === 'readyToStart') 
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
    console.log(`${effectId} Current stage: ${stage}. DevMode: ${isDevModeActive}. Query:`, searchParams?.toString());

    async function validateAndFetch() {
      if (authContextLoading && stage === 'initializing') {
        console.log(`${effectId} AuthContext loading during init. Waiting.`);
        return;
      }
      
      if (stage === 'initializing' || (stage === 'validatingToken' && !validatedExamId)) {
        const tokenFromQuery = searchParams?.get('token');
        console.log(`${effectId} Stage: ${stage}. Attempting to use token:`, tokenFromQuery ? tokenFromQuery.substring(0,10)+"..." : "No Token");

        if (!tokenFromQuery) {
          const errorMsg = "CRITICAL: SEB entry token missing from URL query parameters.";
          console.error(`${effectId} ${errorMsg}`);
          setPageError(errorMsg); setStage('error'); return;
        }

        if (!isDevModeActive && !isSebEnvironment()) {
          const errorMsg = "This page must be accessed within Safe Exam Browser (production mode).";
          console.error(`${effectId} CRITICAL (Prod Mode): ${errorMsg}`);
          setPageError(errorMsg); setStage('error'); return;
        }
        
        console.log(`${effectId} Token found, moving/staying in validatingToken stage.`);
        if (stage !== 'validatingToken') setStage('validatingToken');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.warn(`${effectId} Token validation API call timed out after ${TOKEN_VALIDATION_TIMEOUT_MS}ms.`);
          controller.abort();
        }, TOKEN_VALIDATION_TIMEOUT_MS);

        try {
          console.log(`${effectId} Validating token via API: ${tokenFromQuery.substring(0, 10) + "..."}`);
          const res = await fetch(`/api/seb/validate-token?token=${encodeURIComponent(tokenFromQuery)}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          console.log(`${effectId} Token validation API response status: ${res.status}`);
          
          let responseBodyText = await res.text();
          let apiErrorMsg = `Token validation API request failed with status: ${res.status}.`; 

          if (res.ok) {
            try {
              const responseBodyJson = JSON.parse(responseBodyText);
              if (responseBodyJson.error) { 
                  console.error(`${effectId} Token validation API returned error in JSON: ${responseBodyJson.error}`);
                  throw new Error(responseBodyJson.error);
              }
              setValidatedStudentId(responseBodyJson.studentId);
              setValidatedExamId(responseBodyJson.examId);
              setIsPreviouslySubmitted(responseBodyJson.isAlreadySubmitted || false);
              setFetchedSavedLinks(responseBodyJson.savedLinks || []); // Set saved links from token
              console.log(`${effectId} Token validated. StudentID: ${responseBodyJson.studentId}, ExamID: ${responseBodyJson.examId}, PreviouslySubmitted: ${responseBodyJson.isAlreadySubmitted}, Links: ${responseBodyJson.savedLinks?.length || 0}. Moving to fetchingDetails.`);
              setStage('fetchingDetails');
            } catch (jsonParseError: any) {
                console.error(`${effectId} Failed to parse successful API response JSON:`, jsonParseError, "Response text:", responseBodyText);
                throw new Error(getSafeErrorMessage(jsonParseError, "Failed to parse server response after successful validation."));
            }
          } else { 
            try {
                const errorBodyJson = JSON.parse(responseBodyText);
                if (errorBodyJson && typeof errorBodyJson.error === 'string' && errorBodyJson.error.trim() !== '') {
                    apiErrorMsg = errorBodyJson.error; 
                } else {
                    apiErrorMsg += ` Server response: ${responseBodyText.substring(0,150)}${responseBodyText.length > 150 ? '...' : ''}`;
                }
            } catch (jsonParseError) {
                apiErrorMsg += ` Server response (non-JSON): ${responseBodyText.substring(0,150)}${responseBodyText.length > 150 ? '...' : ''}`;
            }
            console.error(`${effectId} Token validation API error: ${apiErrorMsg}`);
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
        console.log(`${effectId} Fetching exam (${validatedExamId}) and student (${validatedStudentId}) details.`);
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
              setPageError(`Failed to load exam details: ${fetchExamErrorMsg}`); setStage('error'); return;
          }
          fetchedExam = examData as Exam;
          console.log(`${effectId} Exam details fetched: ${fetchedExam.title}`);

          console.log(`${effectId} Fetching student profile for ID: ${validatedStudentId}`);
          const { data: studentData, error: studentError } = await supabase.from('proctorX').select('*').eq('user_id', validatedStudentId).single();
          if (studentError || !studentData) {
            const fetchStudentErrorMsg = getSafeErrorMessage(studentError, `Student ${validatedStudentId} not found or access denied.`);
            setPageError(`Failed to load student profile: ${fetchStudentErrorMsg}`); setStage('error'); return;
          }
          fetchedStudent = studentData as CustomUser;
          console.log(`${effectId} Student profile fetched: ${fetchedStudent.name}`);

          setExamDetails(fetchedExam);
          setStudentProfile(fetchedStudent);

          if (fetchedExam.questions && fetchedExam.questions.length > 0) {
            console.log(`${effectId} Exam and student details fetched. Data is ready for exam.`);
            setIsDataReadyForExam(true); 
            if (isPreviouslySubmitted) {
                console.log(`${effectId} Exam previously submitted. Stage set to 'examCompleted'.`);
                setStage('examCompleted'); 
            } else {
                console.log(`${effectId} Exam not previously submitted. Stage set to 'readyToStart'.`);
                setStage('readyToStart');
            }
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, searchParams, isDevModeActive, supabase, authContextLoading]);

  const runSecurityChecks = useCallback(async () => {
    const operationId = `[SebEntryClientNew runSecurityChecks ${Date.now().toString().slice(-5)}]`;
    console.log(`${operationId} Initiated.`);
    if (!examDetails || !studentProfile || !validatedStudentId) {
      const errorMsg = "Cannot run security checks: Essential exam or student data is missing.";
      console.error(`${operationId} Aborting: ${errorMsg}`);
      setPageError(errorMsg); setStage('error'); return;
    }
    
    setStage('performingSecurityChecks');
    let allCriticalPassed = true;

    const currentChecksConfig = securityChecks.map(c => ({ 
        ...c, 
        status: 'pending' as 'pending',
        isCritical: (c.id === 'sebEnv' && isDevModeActive) ? false : c.isCritical 
    }));
    
    for (let i = 0; i < currentChecksConfig.length; i++) {
      const check = currentChecksConfig[i];
      console.log(`${operationId} Performing check: ${check.label} (Critical: ${check.isCritical})`);
      currentChecksConfig[i] = { ...check, status: 'checking' };
      setSecurityChecks([...currentChecksConfig]);
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 600)); 

      try {
        const passed = await check.checkFn();
        currentChecksConfig[i] = { ...check, status: passed ? 'passed' : 'failed', details: passed ? 'OK' : `Failed: ${check.label}` };
        if (!passed && check.isCritical) {
          console.log(`${operationId} Check ${check.label}: Failed (Critical)`);
          allCriticalPassed = false;
        } else {
          console.log(`${operationId} Check ${check.label}: ${passed ? 'Passed' : 'Failed (Non-Critical)'}`);
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
  }, [examDetails, studentProfile, validatedStudentId, securityChecks, isDevModeActive]);


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
    console.log(`${operationId} Upserting 'In Progress' for exam: ${examDetails.exam_id}, student: ${validatedStudentId}, with links:`, fetchedSavedLinks);
    try {
      const submissionUpsertData: ExamSubmissionInsert = {
        exam_id: examDetails.exam_id,
        student_user_id: validatedStudentId,
        status: 'In Progress',
        started_at: new Date().toISOString(),
        saved_links: fetchedSavedLinks.length > 0 ? fetchedSavedLinks : null,
        answers: null,
        flagged_events: null,
        score: null,
        submitted_at: null,
      };

      const { error: submissionUpsertError } = await supabase.from('ExamSubmissionsX')
        .upsert(submissionUpsertData, { onConflict: 'exam_id, student_user_id' })
        .select();

      if (submissionUpsertError) {
        const warningMsg = getSafeErrorMessage(submissionUpsertError, "Could not record exam start accurately.");
        console.warn(`${operationId} Error upserting 'In Progress' submission:`, warningMsg, submissionUpsertError);
        globalToast({ title: "Start Record Warning", description: warningMsg, variant: "default" });
      } else console.log(`${operationId} 'In Progress' submission record upserted with links.`);
      setStage('examInProgress');
      console.log(`${operationId} Stage set to examInProgress.`);
    } catch (e: any) {
      const errorMsg = getSafeErrorMessage(e, "Failed to initialize exam session state.");
      console.error(`${operationId} Exception:`, errorMsg, e);
      setPageError(errorMsg); setStage('error');
    }
  }, [examDetails, validatedStudentId, supabase, studentProfile, globalToast, isDataReadyForExam, fetchedSavedLinks]);

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
      saved_links: fetchedSavedLinks.length > 0 ? fetchedSavedLinks : null, // Ensure links are part of final submission too
    };
    console.log(`${operationId} Submitting payload (answers omitted for brevity):`, { ...submissionPayload, answers: Object.keys(answers).length > 0 ? "{...}" : "{}" });

    try {
      const response = await fetch('/api/seb/submit-exam', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(submissionPayload),
      });

      let responseBodyText = await response.text();
      if (!response.ok) {
        let apiErrorMsg = `API submission failed with status: ${response.status}.`;
        try {
            const errorBodyJson = JSON.parse(responseBodyText);
            if (errorBodyJson && typeof errorBodyJson.error === 'string' && errorBodyJson.error.trim() !== '') {
                apiErrorMsg = errorBodyJson.error; 
            } else {
                apiErrorMsg += ` Server response: ${responseBodyText.substring(0,100)}${responseBodyText.length > 100 ? '...' : ''}`;
            }
        } catch (jsonParseError) {
            apiErrorMsg += ` Server response (non-JSON): ${responseBodyText.substring(0,100)}${responseBodyText.length > 100 ? '...' : ''}`;
        }
        console.error(`${operationId} API submission failed. Status: ${response.status}, Error: ${apiErrorMsg}`);
        throw new Error(apiErrorMsg);
      }

      let responseBodyJson;
      try {
        responseBodyJson = JSON.parse(responseBodyText);
      } catch (jsonParseError) {
        console.error(`${operationId} Failed to parse successful submission API response:`, jsonParseError, "Raw text:", responseBodyText);
        throw new Error("Could not parse submission confirmation from server.");
      }
      
      console.log(`${operationId} Submission successful via API. Result:`, responseBodyJson);
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
  }, [validatedExamId, validatedStudentId, examDetails, studentProfile, globalToast, fetchedSavedLinks]);

  const isLoadingCriticalStages = stage === 'initializing' || stage === 'validatingToken' || stage === 'fetchingDetails' || (authContextLoading && stage === 'initializing');
  
  if (isLoadingCriticalStages && !pageError) {
    let message = "Initializing Secure Exam Environment...";
    if (stage === 'validatingToken') message = "Validating exam session token...";
    if (stage === 'fetchingDetails') message = "Loading exam and student details...";
    if (authContextLoading && stage === 'initializing') message = "Initializing secure context...";

    return (
      <div className="flex flex-col items-center justify-center text-center min-h-screen w-full bg-background text-foreground overflow-hidden p-2">
        <Loader2 className="h-16 w-16 text-blue-500 animate-spin mb-6 stroke-width-1.5" />
        <h2 className="text-xl font-medium text-slate-700 mb-2">{message}</h2>
      </div>
    );
  }

  if (stage === 'error' || stage === 'securityChecksFailed') {
    const displayError = pageError || "An unknown error occurred. Could not prepare the exam session.";
    const errorTitle = stage === 'securityChecksFailed' ? "Security Check Failed" : "Exam Access Error";
    return (
      <main className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground overflow-hidden p-2">
        <Card className="w-full max-w-lg text-center card-3d p-6 sm:p-8 rounded-xl shadow-xl border-red-500/50">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-5 stroke-width-1.5" />
          <h2 className="text-2xl font-semibold mb-3 text-red-600">{errorTitle}</h2>
          <p className="text-sm mb-6 whitespace-pre-wrap text-slate-500">{displayError}</p>
          {showExitSebButton && (
              <Button onClick={handleExitSeb} className="w-full logout-button-gradient-light">Exit SEB</Button>
          )}
        </Card>
      </main>
    );
  }

  if (stage === 'performingSecurityChecks') {
    return (
      <main className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground overflow-hidden p-2">
        <Card className="w-full max-w-lg text-center card-3d p-6 sm:p-8 rounded-xl shadow-xl border-slate-300/70">
          <CardHeader className="border-b border-slate-200/70 pb-3 mb-5 p-0">
            <Shield className="h-12 w-12 text-blue-500 mx-auto mb-3 stroke-width-1.5" />
            <CardTitle className="text-xl sm:text-2xl font-semibold text-slate-700">Security System Check</CardTitle>
            <p className="text-xs sm:text-sm text-slate-500 pt-1">Verifying your exam environment. Please wait.</p>
          </CardHeader>
          <CardContent className="space-y-3 text-left p-0">
            {securityChecks.map(check => {
              const IconComponent = check.icon || HelpCircleIcon;
              return (
                <div key={check.id} className={cn(
                  "flex justify-between items-center p-2 rounded-md border text-sm",
                  check.status === 'pending' ? 'border-slate-300 bg-slate-100/50 text-slate-500' :
                  check.status === 'checking' ? 'border-blue-500/60 bg-blue-500/10 text-blue-600 animate-pulse' :
                  check.status === 'passed' ? 'border-green-500/60 bg-green-500/10 text-green-700' :
                  'border-red-500/60 bg-red-500/10 text-red-700'
                )}>
                  <div className="flex items-center gap-2">
                    <IconComponent className={cn("h-4 w-4 stroke-width-1.5",
                       check.status === 'pending' ? 'text-slate-400' :
                       check.status === 'checking' ? 'text-blue-500' :
                       check.status === 'passed' ? 'text-green-600' :
                       'text-red-600'
                    )} />
                    <span className="font-medium text-slate-700">{check.label}</span>
                  </div>
                  {check.status === 'pending' && <Loader2 className="h-4 w-4 text-slate-400 animate-spin stroke-width-1.5" />}
                  {check.status === 'checking' && <Loader2 className="h-4 w-4 text-blue-500 animate-spin stroke-width-1.5" />}
                  {check.status === 'passed' && <CheckCircle className="h-4 w-4 text-green-600 stroke-width-1.5" />}
                  {check.status === 'failed' && <AlertTriangle className="h-4 w-4 text-red-600 stroke-width-1.5" />}
                </div>
              );
            })}
          </CardContent>
           <div className="mt-6">
             <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white opacity-70" disabled>
                <Loader2 className="h-4 w-4 mr-2 animate-spin stroke-width-1.5" /> Checking Environment...
              </Button>
          </div>
        </Card>
      </main>
    );
  }

  if (stage === 'startingExamSession' || stage === 'submittingExam') {
    return (
      <div className="flex flex-col items-center justify-center text-center min-h-screen w-full bg-background text-foreground overflow-hidden p-2">
        <Loader2 className="h-16 w-16 text-blue-500 animate-spin mb-6 stroke-width-1.5" />
        <h2 className="text-xl font-medium text-slate-700 mb-2">
          {stage === 'startingExamSession' ? "Preparing your exam session..." : "Submitting Exam..."}
        </h2>
        {stage === 'submittingExam' && <p className="text-sm text-slate-500">Please wait, do not close SEB.</p>}
      </div>
    );
  }

  if (!examDetails || !studentProfile || !isDataReadyForExam) {
    console.error("[SebEntryClientNew Render] Critical data missing post-loading. Stage:", stage, "ExamDetails:", !!examDetails, "StudentProfile:", !!studentProfile, "isDataReady:", isDataReadyForExam);
    return (
      <main className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground overflow-hidden p-2">
        <Card className="w-full max-w-lg text-center card-3d p-6 sm:p-8 rounded-xl shadow-xl border-red-500/50">
          <ServerCrash className="h-16 w-16 text-red-500 mx-auto mb-5 stroke-width-1.5" />
          <h2 className="text-xl font-semibold mb-3 text-red-600">Data Error</h2>
          <p className="text-sm mb-6 text-slate-500">Essential exam or student data could not be loaded. Please contact support.</p>
          {showExitSebButton && (
              <Button onClick={handleExitSeb} className="w-full max-w-xs logout-button-gradient-light">Exit SEB</Button>
          )}
        </Card>
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

  const isExamEffectivelyCompleted = stage === 'examCompleted' || isPreviouslySubmitted;
  let examStatusText = "Ready to Start";
  if (isPreviouslySubmitted) examStatusText = "Already Submitted";
  else if (stage === 'examCompleted') examStatusText = "Completed";


  return (
    <div className="min-h-screen w-full flex flex-col sm:flex-row bg-slate-50 text-slate-800 overflow-hidden">
      {/* Left Column: Logo and Exam Info */}
      <div className="w-full sm:w-2/5 lg:w-1/3 flex flex-col sidebar-bg p-3 sm:p-5">
        <header className="flex items-center justify-start shrink-0 h-16 mb-3"> 
          <Image src={logoAsset} alt="ZenTest Logo" width={160} height={45} className="h-12 sm:h-14 w-auto" /> 
        </header>
        <div className="flex-grow overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-slate-300 text-slate-700">
          <h1 className="text-lg sm:text-xl font-bold text-slate-800">{examDetails.title}</h1>
          {examDetails.description && <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{examDetails.description}</p>}
          
          <div className="space-y-1 text-xs sm:text-sm pt-2 border-t border-white/30">
            <p className="flex items-center gap-1.5 text-slate-600"><FileTextIcon className="h-3.5 w-3.5 text-blue-600 shrink-0 stroke-width-1.5" /> Questions: <span className="font-medium text-slate-700">{examDetails.questions?.length || 0}</span></p>
            {examDetails.start_time && isValidDate(parseISO(examDetails.start_time)) &&
              <p className="flex items-center gap-1.5 text-slate-600"><CalendarDays className="h-3.5 w-3.5 text-blue-600 shrink-0 stroke-width-1.5" /> Start: <span className="font-medium text-slate-700">{format(parseISO(examDetails.start_time), "MMM d, hh:mm a")}</span></p>
            }
            {examDetails.end_time && isValidDate(parseISO(examDetails.end_time)) &&
              <p className="flex items-center gap-1.5 text-slate-600"><CalendarDays className="h-3.5 w-3.5 text-blue-600 shrink-0 stroke-width-1.5" /> End: <span className="font-medium text-slate-700">{format(parseISO(examDetails.end_time), "MMM d, hh:mm a")}</span></p>
            }
            <p className="flex items-center gap-1.5 text-slate-600"><ListChecks className="h-3.5 w-3.5 text-blue-600 shrink-0 stroke-width-1.5" /> Backtracking: <span className="font-medium text-slate-700">{examDetails.allow_backtracking ? 'Allowed' : 'Not Allowed'}</span></p>
          </div>
        </div>
        {showExitSebButton && (
            <div className="mt-auto shrink-0 pt-3 border-t border-white/30"> 
                <Button variant="outline" onClick={handleExitSeb} className="w-full logout-button-gradient-light py-2 rounded-lg text-xs sm:text-sm text-white">
                    <LogOut className="mr-1.5 h-3.5 w-3.5 stroke-width-1.5" /> Exit SEB
                </Button>
            </div>
        )}
      </div>

      {/* Right Column: User Info, Status, Rules/Links, Actions */}
      <div className="w-full sm:w-3/5 lg:w-2/3 flex flex-col p-3 sm:p-5 space-y-4 bg-slate-50 text-slate-800">
        <div className="flex justify-end items-start shrink-0">
          <div className="flex items-center gap-2 p-2 border border-slate-200 rounded-lg card-3d bg-white/80 shadow-sm">
            <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-blue-500">
              <AvatarImage src={studentProfile.avatar_url || undefined} alt={studentProfile.name || 'Student'} />
              <AvatarFallback className="bg-slate-200 text-slate-500 text-base sm:text-lg">
                {(studentProfile.name || "S").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm sm:text-base font-semibold text-slate-700">{studentProfile.name}</p>
              <p className="text-xs text-slate-500">ID: {studentProfile.user_id}</p>
              {studentProfile.email && <p className="text-xs text-slate-500">{studentProfile.email}</p>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 shrink-0">
          <div className="border border-slate-200 rounded-lg p-3 text-center card-3d bg-white/80 shadow-sm">
            <p className="text-xs font-medium text-slate-500 mb-0.5">Exam Duration</p>
            <p className="text-2xl sm:text-3xl font-bold text-slate-700 tabular-nums">{examDetails.duration} minutes</p>
          </div>
          <div className="border border-slate-200 rounded-lg p-3 text-center card-3d bg-white/80 shadow-sm"> 
            <p className="text-xs font-medium text-slate-500 mb-0.5">Status</p> 
            <p className={cn("text-2xl sm:text-3xl font-bold tabular-nums", isExamEffectivelyCompleted ? "text-green-600" : "text-blue-600")}>
              {examStatusText}
            </p>
          </div>
        </div>
        
        <div className="card-3d p-3 sm:p-4 rounded-lg shadow-lg border border-slate-200 flex-grow overflow-hidden flex flex-col">
          <h3 className="text-base sm:text-md font-semibold mb-2 flex items-center gap-1.5 text-slate-700 shrink-0">
            <ShieldCheck className="h-4 w-4 text-blue-600 stroke-width-1.5" /> 
            {fetchedSavedLinks.length > 0 ? "Your Saved Links & Exam Rules" : "General Rules & Instructions"}
          </h3>
          <ScrollArea className="flex-grow seb-rules-list text-slate-600 pr-2">
            {fetchedSavedLinks.length > 0 && (
                <div className="mb-3 pt-2 border-t border-slate-200">
                    <h4 className="text-sm font-semibold mb-1.5 text-slate-700 flex items-center gap-1.5">
                        <LinkIcon className="h-4 w-4 text-blue-500 stroke-width-1.5"/>
                        Saved Links:
                    </h4>
                    <ul className="space-y-1 text-xs sm:text-sm">
                        {fetchedSavedLinks.map((link, index) => (
                             <li key={index} className="flex items-center gap-1.5 p-1 hover:bg-blue-50 rounded">
                                <ExternalLink className="h-3.5 w-3.5 text-blue-500 shrink-0 stroke-width-1.5" />
                                <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate" title={link}>
                                    {link}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            <ul className="space-y-1.5 text-xs sm:text-sm">
                {generalRules.map((rule, index) => {
                const RuleIcon = rule.icon;
                return (
                    <li key={index} className="flex items-start gap-1.5"> 
                    <RuleIcon className="h-4 w-4 text-blue-600 shrink-0 mt-0.5 stroke-width-1.5" />
                    <span>{rule.text}</span>
                    </li>
                );
                })}
            </ul>
          </ScrollArea>
        </div>


        <div className="flex justify-center mt-auto pt-3 shrink-0"> 
          {isExamEffectivelyCompleted ? (
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-full max-w-sm"> 
                    <Button className="w-full py-2 text-sm sm:text-base opacity-60 cursor-not-allowed bg-blue-500/70 hover:bg-blue-500/60 text-white/80" disabled>
                      <CircleSlash className="mr-1.5 h-4 w-4 stroke-width-1.5" /> Exam Submitted
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-white text-slate-700 border-slate-200 shadow-lg">
                  <p>You have already submitted this exam.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button
              onClick={runSecurityChecks}
              className="w-full max-w-sm py-2 text-sm sm:text-base shadow-xl bg-blue-500 hover:bg-blue-600 text-white font-medium transition-all duration-300 ease-in-out transform hover:-translate-y-0.5" 
              disabled={stage !== 'readyToStart' || !isDataReadyForExam || !examDetails.questions || examDetails.questions.length === 0 || isSubmittingViaApi}
            >
              <PlayCircle className="mr-1.5 h-4 sm:h-5 w-4 sm:w-5 stroke-width-1.5" />
              {(!examDetails.questions || examDetails.questions.length === 0) ? "No Questions in Exam" : "Start Exam & Security Checks"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
