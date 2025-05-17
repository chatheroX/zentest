
// src/components/seb/seb-entry-client-new.tsx
'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, AlertTriangle, PlayCircle, ShieldCheck, XCircle, Info, LogOut, ServerCrash, CheckCircle, Ban, CircleSlash } from 'lucide-react';
import type { Exam, CustomUser, FlaggedEvent, ExamSubmission, ExamSubmissionInsert } from '@/types/supabase';
import { useToast } from '@/hooks/use-toast';
import { format, isValid as isValidDate, parseISO } from 'date-fns';
import { isSebEnvironment, isOnline, areDevToolsLikelyOpen, isWebDriverActive, disableContextMenu, attemptBlockShortcuts, disableCopyPaste, addInputRestrictionListeners } from '@/lib/seb-utils';
import { useAuth } from '@/contexts/AuthContext';
import { ExamTakingInterface } from '@/components/shared/exam-taking-interface';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import Image from 'next/image';
import logoAsset from '../../../logo.png';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"


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
  { id: 'sebEnv', label: 'SEB Environment', checkFn: isSebEnvironment, isCritical: true, status: 'pending' },
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
  
  const [showExitSebButton, setShowExitSebButton] = useState(true);
  const [securityChecks, setSecurityChecks] = useState<SecurityCheck[]>(INITIAL_SECURITY_CHECKS.map(c => ({...c, status: 'pending'}))); // ensure initial state is pending
  const [isSubmittingViaApi, setIsSubmittingViaApi] = useState(false);
  const [activityFlagsDuringExam, setActivityFlagsDuringExam] = useState<FlaggedEvent[]>([]);

  const handleExitSeb = useCallback(() => {
    toast({ title: "Exiting SEB", description: "Safe Exam Browser will attempt to close.", duration: 3000 });
    if (typeof window !== 'undefined') window.location.href = "seb://quit";
  }, [toast]);

  // Effect 1: Validate Token & Fetch Initial Data
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
        setPageError("CRITICAL: Service connection failed. Cannot initialize exam.");
        setStage('error'); return;
      }

      if (stage === 'initializing') {
        if (!entryTokenFromPath) {
          setPageError("CRITICAL: SEB entry token missing from URL.");
          setStage('error'); return;
        }
        // Basic SEB env check upfront
        if (!isSebEnvironment()) {
          setPageError("This page must be accessed within Safe Exam Browser.");
          setStage('error');
          // Redirect or show link to /unsupported-browser, then quit.
          // For now, direct error and quit.
          setTimeout(handleExitSeb, 7000); 
          return;
        }
        setStage('validatingToken');
        return; 
      }

      if (stage === 'validatingToken') {
        console.log(`${effectId} Validating token: ${entryTokenFromPath.substring(0,10)}...`);
        try {
          const res = await fetch('/api/seb/validate-entry-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: entryTokenFromPath }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || `Token validation API failed: ${res.status}`);
          
          setValidatedStudentId(data.student_user_id);
          setValidatedExamId(data.exam_id);
          setStage('fetchingDetails');
        } catch (e: any) {
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

          if (examRes.error || !examRes.data) throw new Error(examRes.error?.message || `Exam ${validatedExamId} not found.`);
          if (studentRes.error || !studentRes.data) throw new Error(studentRes.error?.message || `Student ${validatedStudentId} not found.`);
          
          setExamDetails(examRes.data as Exam);
          setStudentProfile(studentRes.data as CustomUser);

          if (submissionRes.data?.status === 'Completed') {
            setStage('examCompleted');
          } else {
            setStage('readyToStart');
          }
          setShowExitSebButton(true);
        } catch (e: any) {
          setPageError(`Failed to load exam/student information: ${e.message}.`);
          setStage('error');
        }
      }
    }
    validateAndFetch();
  }, [stage, entryTokenFromPath, supabase, authContextLoading, validatedExamId, validatedStudentId, handleExitSeb]);


  const runSecurityChecks = useCallback(async () => {
    setStage('performingSecurityChecks');
    setShowExitSebButton(false); 
    let allCriticalPassed = true;

    const updatedChecks = INITIAL_SECURITY_CHECKS.map(c => ({...c, status: 'pending'})); // Reset checks

    for (let i = 0; i < updatedChecks.length; i++) {
      const check = updatedChecks[i];
      updatedChecks[i] = { ...check, status: 'checking' };
      setSecurityChecks([...updatedChecks]); 

      await new Promise(resolve => setTimeout(resolve, 300)); // Small delay for UI update

      try {
        const passed = await check.checkFn();
        updatedChecks[i] = { ...check, status: passed ? 'passed' : 'failed', details: passed ? 'OK' : 'Failed' };
        if (!passed && check.isCritical) {
          allCriticalPassed = false;
        }
      } catch (e:any) {
        updatedChecks[i] = { ...check, status: 'failed', details: e.message || 'Error during check' };
        if (check.isCritical) allCriticalPassed = false;
      }
      setSecurityChecks([...updatedChecks]); 
      if (!allCriticalPassed && check.isCritical) break; 
    }
    
    if (allCriticalPassed) {
        document.addEventListener('contextmenu', disableContextMenu);
        document.addEventListener('copy', disableCopyPaste);
        document.addEventListener('paste', disableCopyPaste);
        setStage('startingExamSession'); 
    } else {
      const failedCritical = updatedChecks.find(c => c.status === 'failed' && c.isCritical);
      setPageError(`Critical security check failed: ${failedCritical?.label || 'Unknown Check'}. Cannot start exam.`);
      setStage('securityChecksFailed');
      setShowExitSebButton(true);
    }
  }, []);

  const handleStartExamSession = useCallback(async () => {
    if (!examDetails || !validatedStudentId || !supabase) {
      setPageError("Essential data missing to start exam session.");
      setStage('error');
      return;
    }
    try {
        const { error: submissionUpsertError } = await supabase
          .from('ExamSubmissionsX')
          .upsert({
              exam_id: examDetails.exam_id,
              student_user_id: validatedStudentId,
              status: 'In Progress', 
              started_at: new Date().toISOString(),
              answers: null, // Initialize answers as null or empty
              flagged_events: null, // Initialize flagged_events
          }, { onConflict: 'exam_id, student_user_id' }) 
          .select();
        
        if (submissionUpsertError) {
          console.warn(`[SebEntryClientNew] Error upserting 'In Progress' submission:`, submissionUpsertError.message);
          toast({title: "Start Record Warning", description: "Could not record exam start time accurately, but proceeding.", variant: "default"});
        }
        setActivityFlagsDuringExam([]); // Reset flags for the new session
        setStage('examInProgress');
        setShowExitSebButton(false); 
    } catch (e: any) {
        setPageError(`Failed to initialize exam session state: ${e.message}`);
        setStage('error');
    }
  }, [examDetails, validatedStudentId, supabase, toast]);

  useEffect(() => {
    if (stage === 'startingExamSession') {
        handleStartExamSession();
    }
  }, [stage, handleStartExamSession]);


  const handleExamSubmitOrTimeUp = useCallback(async (answers: Record<string, string>, flaggedEventsFromInterface: FlaggedEvent[], submissionType: 'submit' | 'timeup') => {
    if (!validatedExamId || !validatedStudentId || !examDetails || !studentProfile) {
      toast({title: "Submission Error", description: "Student or Exam details missing.", variant: "destructive"});
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
        // Combine flags collected by this component (if any prior to exam) with flags from interface
        flagged_events: [...activityFlagsDuringExam, ...flaggedEventsFromInterface].length > 0 ? [...activityFlagsDuringExam, ...flaggedEventsFromInterface] : null,
        status: 'Completed',
        submitted_at: new Date().toISOString(),
        // started_at should already be set when 'In Progress' record was made.
        // If not, we need to fetch it or pass it through. For upsert, we can send it.
        started_at: studentProfile.created_at || new Date(Date.now() - examDetails.duration * 60 * 1000).toISOString(), // Placeholder if not available
    };

    try {
      const response = await fetch('/api/seb/submit-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionPayload),
      });
      const result = await response.json();
      if (!response.ok) {
        // If API says already completed, trust it and move to completed state.
        if (result.alreadyCompleted) {
            toast({ title: "Exam Already Completed", description: "This exam was already marked as completed.", duration: 6000 });
            setStage('examCompleted');
            setShowExitSebButton(true);
            return;
        }
        throw new Error(result.error || `API submission failed: ${response.status}`);
      }
      
      toast({ title: submissionType === 'submit' ? "Exam Submitted!" : "Exam Auto-Submitted!", description: "Your responses have been recorded.", duration: 6000 });
      setStage('examCompleted');
      setShowExitSebButton(true);
    } catch(e: any) {
      setPageError(`Failed to submit exam: ${e.message}.`);
      setStage('error'); 
      toast({ title: "Submission Error", description: e.message, variant: "destructive", duration: 10000 });
    } finally {
      setIsSubmittingViaApi(false);
      document.removeEventListener('contextmenu', disableContextMenu);
      document.removeEventListener('copy', disableCopyPaste);
      document.removeEventListener('paste', disableCopyPaste);
    }
  }, [validatedExamId, validatedStudentId, examDetails, studentProfile, toast, activityFlagsDuringExam]);


  // --- RENDER LOGIC ---

  if (stage === 'initializing' || stage === 'validatingToken' || stage === 'fetchingDetails' || authContextLoading) {
    let message = "Initializing Secure Exam Environment...";
    if (stage === 'validatingToken') message = "Validating entry token...";
    if (stage === 'fetchingDetails') message = "Loading exam and student details...";
    if (authContextLoading && stage === 'initializing') message = "Initializing secure context...";
    
    return (
      <div className="flex flex-col items-center justify-center text-center min-h-screen">
        <Loader2 className="h-16 w-16 text-primary animate-spin mb-6" />
        <h2 className="text-xl font-medium text-slate-200 mb-2">{message}</h2>
      </div>
    );
  }

  if (stage === 'error' || (!examDetails && stage !== 'initializing' && stage !== 'validatingToken') || (!studentProfile && stage !== 'initializing' && stage !== 'validatingToken')) {
    return (
      <Card className="w-full max-w-lg modern-card text-center shadow-xl bg-card/80 backdrop-blur-lg border-destructive">
        <CardHeader className="pt-8 pb-4">
          <XCircle className="h-16 w-16 text-destructive mx-auto mb-5" />
          <CardTitle className="text-2xl text-destructive">Exam Access Error</CardTitle>
        </CardHeader>
        <CardContent className="pb-6">
          <p className="text-sm text-muted-foreground mb-6 whitespace-pre-wrap">
            {pageError || "Could not load necessary exam information. This might be due to an invalid token, network issues, or configuration problems."}
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={handleExitSeb} className="w-full btn-gradient-destructive">Exit SEB</Button>
        </CardFooter>
      </Card>
    );
  }
  
  // This check is crucial: examDetails and studentProfile MUST be loaded to proceed.
  if (!examDetails || !studentProfile) {
    // This case should ideally be caught by the 'error' stage if fetching failed.
    // But as a fallback if stage is somehow advanced without data:
    return (
         <Card className="w-full max-w-lg modern-card text-center shadow-xl bg-card/80 backdrop-blur-lg border-destructive">
            <CardHeader className="pt-8 pb-4">
                <ServerCrash className="h-16 w-16 text-destructive mx-auto mb-5" />
                <CardTitle className="text-2xl text-destructive">Data Error</CardTitle>
            </CardHeader>
            <CardContent className="pb-6">
                <p className="text-sm text-muted-foreground mb-6">Essential exam or student data could not be loaded. Please try again or contact support.</p>
            </CardContent>
             <CardFooter>
                <Button onClick={handleExitSeb} className="w-full btn-gradient-destructive">Exit SEB</Button>
            </CardFooter>
        </Card>
    );
  }


  if (stage === 'performingSecurityChecks' || stage === 'securityChecksFailed') {
    return (
        <Card className="w-full max-w-lg modern-card text-center shadow-xl bg-card/80 backdrop-blur-lg">
            <CardHeader className="pt-8 pb-4">
                <ShieldCheck className="h-16 w-16 text-primary mx-auto mb-5" />
                <CardTitle className="text-2xl text-foreground">Security System Check</CardTitle>
                <CardDescription className="text-muted-foreground">Verifying your exam environment. Please wait.</CardDescription>
            </CardHeader>
            <CardContent className="pb-6 space-y-3">
                {securityChecks.map(check => (
                    <div key={check.id} className={`flex justify-between items-center p-3 rounded-md border text-left ${
                        check.status === 'pending' ? 'border-muted bg-muted/20' :
                        check.status === 'checking' ? 'border-blue-500 bg-blue-500/10 text-blue-300' :
                        check.status === 'passed' ? 'border-green-500 bg-green-500/10 text-green-300' :
                        'border-destructive bg-destructive/10 text-red-300'
                    }`}>
                        <span className="text-sm font-medium text-slate-200">{check.label}</span>
                        {check.status === 'pending' && <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />}
                        {check.status === 'checking' && <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />}
                        {check.status === 'passed' && <CheckCircle className="h-5 w-5 text-green-400" />}
                        {check.status === 'failed' && <XCircle className="h-5 w-5 text-destructive" />}
                    </div>
                ))}
                {stage === 'securityChecksFailed' && pageError && (
                     <Alert variant="destructive" className="mt-4 text-left">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Security Check Failed!</AlertTitle>
                        <AlertDescription>{pageError}</AlertDescription>
                    </Alert>
                )}
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
                {stage === 'securityChecksFailed' && (
                    <Button onClick={handleExitSeb} className="w-full btn-gradient-destructive">Exit SEB</Button>
                )}
                 {stage === 'performingSecurityChecks' && !securityChecks.find(c => c.status === 'failed' && c.isCritical) && (
                    <Button className="w-full btn-primary-solid" disabled>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Checking Environment...
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
  }
  
  if (stage === 'startingExamSession') {
     return (
      <div className="flex flex-col items-center justify-center text-center min-h-screen">
        <Loader2 className="h-16 w-16 text-primary animate-spin mb-6" />
        <h2 className="text-xl font-medium text-slate-200 mb-2">Preparing your exam session...</h2>
      </div>
    );
  }

  if (stage === 'examInProgress' || stage === 'submittingExam') {
    return (
      <ExamTakingInterface
        examDetails={examDetails}
        questions={examDetails.questions || []}
        parentIsLoading={stage === 'submittingExam' || isSubmittingViaApi}
        onAnswerChange={() => {}} 
        onSubmitExam={(answers, flaggedEvents) => handleExamSubmitOrTimeUp(answers, flaggedEvents, 'submit')}
        onTimeUp={(answers, flaggedEvents) => handleExamSubmitOrTimeUp(answers, flaggedEvents, 'timeup')}
        isDemoMode={false}
        userIdForActivityMonitor={studentProfile.user_id}
        studentName={studentProfile.name}
        studentRollNumber={studentProfile.user_id}
        studentAvatarUrl={studentProfile.avatar_url}
      />
    );
  }

  // Stage: 'readyToStart' or 'examCompleted' (Semi-Landing Page UI)
  const isExamCompleted = stage === 'examCompleted';
  let examStatusText = "Not Started";
  if (isExamCompleted) examStatusText = "Completed";
  else if (examDetails.status === 'Ongoing' && !isExamCompleted) examStatusText = "Ready to Start";


  return (
    <Card className="w-full max-w-2xl modern-card shadow-2xl bg-card/90 backdrop-blur-xl border-border/30">
      <CardHeader className="text-center border-b border-border/20 pb-6">
        <Image src={logoAsset} alt="ZenTest Logo" width={140} height={40} className="mx-auto mb-5 h-16 w-auto" /> {/* Logo consistent */}
        <CardTitle className="text-3xl font-bold text-foreground">{examDetails.title}</CardTitle>
        <CardDescription className="text-muted-foreground mt-1">
          Welcome, {studentProfile.name || 'Student'}! Please review the exam details before starting.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div className="space-y-3 p-4 border rounded-lg bg-background/50 shadow-sm">
            <h3 className="font-semibold text-lg text-primary mb-2">Student Details</h3>
            <p><strong className="text-muted-foreground">Name:</strong> {studentProfile.name}</p>
            <p><strong className="text-muted-foreground">ID:</strong> {studentProfile.user_id}</p>
            {studentProfile.email && <p><strong className="text-muted-foreground">Email:</strong> {studentProfile.email}</p>}
          </div>
          <div className="space-y-3 p-4 border rounded-lg bg-background/50 shadow-sm">
            <h3 className="font-semibold text-lg text-primary mb-2">Exam Information</h3>
            <p><strong className="text-muted-foreground">Duration:</strong> {examDetails.duration} minutes</p>
            <p><strong className="text-muted-foreground">Questions:</strong> {examDetails.questions?.length || 0}</p>
            <p><strong className="text-muted-foreground">Status:</strong> 
                <span className={`font-semibold ml-1 ${isExamCompleted ? 'text-green-400' : 'text-yellow-400'}`}>{examStatusText}</span>
            </p>
          </div>
        </div>
        
        {examDetails.description && (
            <div className="p-4 border rounded-lg bg-background/50">
                <h4 className="font-semibold text-md text-primary mb-1">Instructions:</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{examDetails.description}</p>
            </div>
        )}

        <Alert variant="default" className="bg-blue-500/10 border-blue-500/30 text-blue-300 dark:bg-blue-900/40 dark:border-blue-700 dark:text-blue-300">
          <Info className="h-5 w-5 text-blue-400" />
          <AlertTitle className="font-semibold text-blue-300">Important</AlertTitle>
          <AlertDescription className="text-blue-400/90 text-sm">
            This exam must be taken in Safe Exam Browser. Ensure you are in a quiet environment. Activity will be monitored. Do not attempt to exit SEB or switch applications once the exam starts.
          </AlertDescription>
        </Alert>
      </CardContent>

      <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 p-6 border-t border-border/20">
        {showExitSebButton && (
          <Button variant="outline" onClick={handleExitSeb} className="btn-outline-subtle text-slate-300 border-slate-600 hover:bg-slate-700/50 w-full sm:w-auto order-2 sm:order-1">
            <LogOut className="mr-2 h-4 w-4" /> Exit SEB
          </Button>
        )}
        
        {isExamCompleted ? (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-full sm:w-auto order-1 sm:order-2"> {/* Wrapper for tooltip on disabled button */}
                    <Button className="btn-gradient w-full py-3 text-base opacity-60 cursor-not-allowed" disabled>
                    <CircleSlash className="mr-2 h-5 w-5" /> Exam Already Submitted
                    </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-popover text-popover-foreground border-border shadow-sm rounded-sm">
                <p>You have already completed and submitted this exam.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Button onClick={runSecurityChecks} className="btn-gradient w-full sm:w-auto py-3 text-base order-1 sm:order-2" disabled={stage !== 'readyToStart'}>
            <PlayCircle className="mr-2 h-5 w-5" /> Start Exam & Security Checks
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
