
// src/components/seb/seb-entry-client.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertTriangle, PlayCircle, ShieldCheck, XCircle, Info, LogOut, ServerCrash } from 'lucide-react';
import type { Exam, CustomUser } from '@/types/supabase';
import { useToast } from '@/hooks/use-toast';
import { format, isValid as isValidDate, parseISO } from 'date-fns';
import { isSebEnvironment, isOnline, areDevToolsLikelyOpen, isWebDriverActive, isVMLikely } from '@/lib/seb-utils';
import { useAuth } from '@/contexts/AuthContext';

const TOKEN_VALIDITY_MINUTES_FROM_API_PERSPECTIVE = 10; // How long the token is valid from generation

interface SebEntryClientProps {
  entryTokenFromPath: string | null; // Token from URL path, e.g., /seb/entry/[token_value]
}

interface ValidatedSessionData {
  student_user_id: string;
  exam_id: string;
}

export function SebEntryClient({ entryTokenFromPath }: SebEntryClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  // We don't use studentUser from AuthContext here because SEB session is authenticated by the token.
  // We only need authSupabase for fetching data after token validation.
  const { supabase: authSupabase, isLoading: authContextLoading, authError: contextAuthError } = useAuth();

  const [currentStatusMessage, setCurrentStatusMessage] = useState("Initializing SEB session...");
  const [isLoading, setIsLoading] = useState(true); 
  const [pageError, setPageError] = useState<string | null>(null);
  
  const [validatedSessionData, setValidatedSessionData] = useState<ValidatedSessionData | null>(null);
  const [examDetails, setExamDetails] = useState<Exam | null>(null);
  const [studentName, setStudentName] = useState<string | null>(null);
  const [studentAvatarUrl, setStudentAvatarUrl] = useState<string | null>(null);


  const [performingChecks, setPerformingChecks] = useState(false);

  const handleExitSeb = useCallback(() => {
    const exitLogPrefix = `[SebEntryClient handleExitSeb ${Date.now().toString().slice(-4)}]`;
    console.log(`${exitLogPrefix} Attempting to exit SEB.`);
    toast({ title: "Exiting SEB", description: "Safe Exam Browser will attempt to close.", duration: 3000 });
    if (typeof window !== 'undefined') window.location.href = "seb://quit";
  }, [toast]);


  // Step 1: Initial SEB Environment Check & Token Presence
  useEffect(() => {
    const effectId = `[SebEntryClient InitEffect ${Date.now().toString().slice(-4)}]`;
    console.log(`${effectId} Running. EntryToken:`, entryTokenFromPath ? entryTokenFromPath.substring(0,10) + "..." : "NOT_PROVIDED");
    setCurrentStatusMessage("Verifying SEB environment & entry token...");

    if (typeof window === 'undefined') {
      const errMsg = "CRITICAL: Window object not found. Cannot proceed.";
      console.error(`${effectId} ${errMsg}`);
      setPageError(errMsg); setIsLoading(false); return;
    }
    if (!isSebEnvironment()) {
      const errMsg = "CRITICAL: This page must be accessed within Safe Exam Browser.";
      console.warn(`${effectId} Not in SEB environment. Redirecting to unsupported browser page.`);
      setPageError(errMsg);
      toast({ title: "SEB Required", description: "Redirecting to unsupported browser page...", variant: "destructive", duration: 5000 });
      setTimeout(() => router.replace('/unsupported-browser'), 4000);
      setIsLoading(false);
      return;
    }
    console.log(`${effectId} SEB Environment Confirmed.`);

    if (!entryTokenFromPath) {
      const errMsg = "Error: SEB entry token missing from URL. Cannot initialize exam session. SEB will quit.";
      console.error(`${effectId} ${errMsg}`);
      setPageError(errMsg);
      toast({ title: "SEB Launch Error", description: "Exam entry token missing. Quitting SEB.", variant: "destructive", duration: 15000 });
      setTimeout(handleExitSeb, 14000);
      setIsLoading(false);
      return;
    }
    console.log(`${effectId} Entry token found in path. Proceeding to server-side validation.`);
  }, [entryTokenFromPath, router, toast, handleExitSeb]);


  // Step 2: Validate Token via API
  useEffect(() => {
    const effectId = `[SebEntryClient TokenValidationEffect ${Date.now().toString().slice(-4)}]`;

    // Conditions to skip this effect:
    // - No entry token from path.
    // - Already an error on the page.
    // - Not in SEB environment (though prior effect should catch this).
    // - Session data already successfully validated and set.
    if (!entryTokenFromPath || pageError || !isSebEnvironment() || validatedSessionData) { 
      if (validatedSessionData) console.log(`${effectId} Skipping: Validated session data already exists.`);
      else if (!entryTokenFromPath) console.log(`${effectId} Skipping: Waiting for entryTokenFromPath.`);
      else if (pageError) console.log(`${effectId} Skipping: pageError is set: ${pageError}.`);
      else if (!isSebEnvironment()) console.log(`${effectId} Skipping: Not in SEB environment (should be caught earlier).`);
      return;
    }
    
    console.log(`${effectId} Attempting to validate entry token via API:`, entryTokenFromPath.substring(0,10) + "...");
    setCurrentStatusMessage("Contacting server to validate entry token...");
    if (!isLoading) setIsLoading(true); // Ensure loading state is true for this async operation

    fetch('/api/seb/validate-entry-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: entryTokenFromPath }),
    })
    .then(async res => {
      const responseBody = await res.json().catch(() => ({ error: 'Failed to parse API response JSON.' }));
      if (!res.ok) {
        console.error(`${effectId} Token validation API failed. Status: ${res.status}, Body:`, responseBody);
        throw new Error(responseBody.error || `Token validation API request failed with status: ${res.status}`);
      }
      return responseBody;
    })
    .then(data => {
      if (data.error) {
         console.error(`${effectId} Token validation API returned an error:`, data.error);
        throw new Error(data.error);
      }
      console.log(`${effectId} Token validated by API. Session data received:`, data);
      setValidatedSessionData({ student_user_id: data.student_user_id, exam_id: data.exam_id });
      setCurrentStatusMessage("Entry token validated. Fetching exam and student details...");
      // setIsLoading will be handled by the next effect (data fetching) or if an error occurs here
    })
    .catch(e => {
      console.error(`${effectId} Entry token validation API error:`, e.message, e);
      setPageError(`Entry token validation failed: ${e.message}. SEB will quit.`);
      toast({ title: "Invalid Session", description: `Token error: ${e.message}. Quitting SEB.`, variant: "destructive", duration: 10000 });
      setTimeout(handleExitSeb, 9000);
      setIsLoading(false); // Critical error, stop loading
    });
  }, [entryTokenFromPath, pageError, validatedSessionData, toast, handleExitSeb, isLoading]);


  // Step 3: Fetch Exam and Student Details (once validatedSessionData is available AND authSupabase client is ready)
  useEffect(() => {
    const effectId = `[SebEntryClient DataFetchEffect ${Date.now().toString().slice(-4)}]`;

    if (!validatedSessionData?.exam_id || !validatedSessionData?.student_user_id || pageError) {
      if (!validatedSessionData && entryTokenFromPath && !pageError) console.log(`${effectId} Waiting for session data from token validation.`);
      else if (pageError) console.log(`${effectId} Skipping data fetch due to pageError: ${pageError}`);
      return;
    }
    
    if (authContextLoading) {
      console.log(`${effectId} AuthContext (for Supabase client) still loading. Waiting to fetch exam/student data.`);
      setCurrentStatusMessage("Loading user session details...");
      if (!isLoading) setIsLoading(true);
      return;
    }

    if (!authSupabase) {
      const errMsg = `CRITICAL: Service connection (Supabase client) failed. Cannot load exam details. ${contextAuthError || 'AuthContext Supabase client is null.'} SEB will quit.`;
      console.error(`${effectId} ${errMsg}`);
      setPageError(errMsg);
      toast({ title: "Internal Error", description: "Service connection failed. Quitting SEB.", variant: "destructive", duration: 8000 });
      setTimeout(handleExitSeb, 7000);
      setIsLoading(false);
      return;
    }
    
    if (examDetails && studentName) {
        console.log(`${effectId} Exam and student details already exist. Skipping data fetch.`);
        if (isLoading) setIsLoading(false);
        return;
    }

    console.log(`${effectId} Fetching exam details for exam_id: ${validatedSessionData.exam_id} and student: ${validatedSessionData.student_user_id}`);
    setCurrentStatusMessage("Fetching exam and student information...");
    if(!isLoading) setIsLoading(true);

    Promise.all([
      authSupabase.from('ExamX').select('*').eq('exam_id', validatedSessionData.exam_id).single(),
      authSupabase.from('proctorX').select('name, user_id, avatar_url').eq('user_id', validatedSessionData.student_user_id).single()
    ])
    .then(([examRes, studentRes]) => {
      if (examRes.error || !examRes.data) {
        throw new Error(examRes.error?.message || `Exam with ID ${validatedSessionData.exam_id} not found.`);
      }
      if (studentRes.error || !studentRes.data) {
        throw new Error(studentRes.error?.message || `Student profile for ID ${validatedSessionData.student_user_id} not found.`);
      }
      
      setExamDetails(examRes.data as Exam);
      setStudentName(studentRes.data.name || "Student"); 
      setStudentAvatarUrl(studentRes.data.avatar_url || null);
      console.log(`${effectId} Exam details fetched: ${examRes.data.title}, Student name: ${studentRes.data.name}`);
      setCurrentStatusMessage("Exam details loaded. Ready for final system checks.");
      setPageError(null); 
    })
    .catch(e => {
      console.error(`${effectId} Error fetching exam/student details:`, e.message, e);
      setPageError(`Failed to load exam information: ${e.message}. SEB will quit.`);
      toast({ title: "Exam Load Error", description: e.message, variant: "destructive", duration: 10000 });
      setTimeout(handleExitSeb, 9000);
    })
    .finally(() => setIsLoading(false));
  }, [validatedSessionData, authSupabase, pageError, toast, handleExitSeb, authContextLoading, examDetails, studentName, isLoading, contextAuthError]);


  const handleStartSystemChecksAndExam = useCallback(async () => {
    const operationId = `[SebEntryClient StartChecks ${Date.now().toString().slice(-4)}]`;
    if (!examDetails || !validatedSessionData?.student_user_id || !entryTokenFromPath) {
      const missingInfoError = "Cannot start exam: Missing essential exam/session information for checks.";
      console.error(`${operationId} ${missingInfoError}`);
      setPageError(missingInfoError);
      toast({ title: "Cannot Start", description: "Essential exam or session data is missing.", variant: "destructive" });
      return;
    }
    setPerformingChecks(true);
    setCurrentStatusMessage("Performing final system checks...");
    setPageError(null);
    console.log(`${operationId} Performing system checks...`);

    const checks = [
      { label: "SEB Environment", pass: isSebEnvironment(), details: isSebEnvironment() ? "Confirmed" : "Critical: Not in SEB!", critical: true },
      { label: "Internet Connectivity", pass: isOnline(), details: isOnline() ? "Online" : "Warning: Offline! Exam may not submit.", critical: false }, // Not critical to *start*, but good to note
      { label: "Developer Tools", pass: !areDevToolsLikelyOpen(), details: areDevToolsLikelyOpen() ? "Alert: Developer Tools potentially open." : "Not Detected", critical: true },
      { label: "WebDriver/Automation", pass: !isWebDriverActive(), details: isWebDriverActive() ? "Alert: WebDriver (automation) detected." : "Not Detected", critical: true },
      { label: "Virtual Machine", pass: !isVMLikely(), details: isVMLikely() ? "Info: Potentially a Virtual Machine." : "Not Detected", critical: false }, // Not strictly critical, but can be flagged
    ];
    
    console.log(`${operationId} System Check Details:`, checks);

    const criticalFailedChecks = checks.filter(check => !check.pass && check.critical);
    
    const allCriticalPass = criticalFailedChecks.length === 0;

    if (allCriticalPass) {
      toast({ title: "System Checks Passed!", description: "Proceeding to live exam environment.", duration: 3000 });
      console.log(`${operationId} System checks passed. Navigating to live test with examId=${validatedSessionData.exam_id}, studentId=${validatedSessionData.student_user_id}`);
      // Pass validated student_user_id and exam_id to the live test page
      router.push(`/seb/live-test?examId=${validatedSessionData.exam_id}&studentId=${validatedSessionData.student_user_id}`);
    } else {
      const errorMessages = criticalFailedChecks.map(fc => `${fc.label}: ${fc.details || 'Failed'}`).join('; ');
      console.error(`${operationId} Critical system checks failed: ${errorMessages}`);
      setPageError(`Critical system integrity checks failed: ${errorMessages}. Cannot start exam. SEB will quit.`);
      toast({ title: "System Checks Failed", description: errorMessages + ". Quitting SEB.", variant: "destructive", duration: 15000 });
      setTimeout(handleExitSeb, 14000);
    }
    setPerformingChecks(false);
  }, [examDetails, validatedSessionData, entryTokenFromPath, router, toast, handleExitSeb]);
  

  if (isLoading && !pageError && !examDetails) {
    return (
      <div className="flex flex-col items-center justify-center text-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 text-slate-100 p-4">
        <Loader2 className="h-16 w-16 text-primary animate-spin mb-6" />
        <h2 className="text-xl font-medium text-slate-200 mb-2">
          {currentStatusMessage}
        </h2>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-red-800 via-red-900 to-red-950 text-white p-4">
        <Card className="w-full max-w-lg modern-card text-center shadow-xl bg-card/80 backdrop-blur-lg border-destructive">
          <CardHeader className="pt-8 pb-4">
            <XCircle className="h-16 w-16 text-destructive mx-auto mb-5" />
            <CardTitle className="text-2xl text-destructive">Exam Access Error</CardTitle>
          </CardHeader>
          <CardContent className="pb-6">
            <p className="text-sm text-muted-foreground mb-6 whitespace-pre-wrap">{pageError}</p>
            <Button onClick={handleExitSeb} className="w-full btn-gradient-destructive">
              Exit SEB
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!examDetails || !studentName || !validatedSessionData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 text-slate-100 p-4">
        <Card className="w-full max-w-lg modern-card text-center shadow-xl bg-card/80 backdrop-blur-lg">
          <CardHeader className="pt-8 pb-4">
            <Loader2 className="h-16 w-16 text-primary animate-spin mx-auto mb-5" />
            <CardTitle className="text-2xl text-slate-300">{currentStatusMessage || "Finalizing exam session..."}</CardTitle>
          </CardHeader>
          <CardContent className="pb-6">
            <p className="text-sm text-muted-foreground">Please wait. If this persists, contact support or try re-initiating from the dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  function getEffectiveExamStatusLocal(exam: Exam | null | undefined, currentTime?: Date): Exam['status'] | 'Upcoming' {
    if (!exam) return 'Published'; // Default if exam is null/undefined
    const now = currentTime || new Date();
    if (exam.status === 'Completed') return 'Completed';
    if (exam.status === 'Published' || exam.status === 'Ongoing') {
      if (!exam.start_time || !exam.end_time) return 'Published'; 
      const startTime = parseISO(exam.start_time);
      const endTime = parseISO(exam.end_time);
      if (!isValidDate(startTime) || !isValidDate(endTime)) return 'Published';
      if (now > endTime) return 'Completed';
      if (now >= startTime && now <= endTime) return 'Ongoing'; // Exam is active
      if (now < startTime) return 'Upcoming'; // Exam is scheduled but not yet started
    }
    return exam.status as Exam['status']; // Fallback to DB status
  }

  const effectiveStatus = getEffectiveExamStatusLocal(examDetails);
  const canStartExam = effectiveStatus === 'Ongoing';
  const examEnded = effectiveStatus === 'Completed';
  const examNotReadyForStart = (!examDetails.questions || examDetails.questions.length === 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 text-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl modern-card shadow-2xl bg-card/90 backdrop-blur-xl border-border/30">
        <CardHeader className="text-center border-b border-border/20 pb-6">
          <ShieldCheck className="h-12 w-12 text-primary mx-auto mb-4" />
          <CardTitle className="text-3xl font-bold text-foreground">{examDetails.title}</CardTitle>
          <CardDescription className="text-muted-foreground mt-2">
            Student: {studentName} (ID: {validatedSessionData.student_user_id})
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <Alert variant="default" className="bg-blue-900/30 border-blue-700 text-blue-300">
            <Info className="h-5 w-5 text-blue-400" />
            <AlertTitle className="font-semibold text-blue-300">Exam Instructions</AlertTitle>
            <AlertDescription className="text-blue-400/90 text-sm">
              This exam must be taken in Safe Exam Browser. Ensure you are in a quiet environment.
              Activity is monitored. Do not attempt to exit SEB or switch applications.
              The timer starts once you click "Start Exam & System Checks".
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm p-4 border rounded-lg bg-slate-800/40 text-slate-300 shadow-inner">
            <div><p className="font-medium text-slate-400">Duration:</p><p className="font-semibold">{examDetails.duration} minutes</p></div>
            <div><p className="font-medium text-slate-400">Questions:</p><p className="font-semibold">{examDetails.questions?.length || 0}</p></div>
            <div><p className="font-medium text-slate-400">Status:</p><p className="font-semibold">{effectiveStatus}</p></div>
            {examDetails.start_time && isValidDate(parseISO(examDetails.start_time)) && <div><p className="font-medium text-slate-400">Scheduled Start:</p><p className="font-semibold">{format(parseISO(examDetails.start_time), "dd MMM yyyy, hh:mm a")}</p></div>}
          </div>
          {performingChecks && (
              <div className="text-center p-4">
                  <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-2" />
                  <p className="text-slate-300">Performing system checks...</p>
              </div>
          )}
          {examNotReadyForStart && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Cannot Start Exam</AlertTitle>
                <AlertDescription>This exam currently has no questions. Please contact your instructor.</AlertDescription>
              </Alert>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-3 p-6 border-t border-border/20">
          <Button variant="outline" onClick={handleExitSeb} className="btn-outline-subtle text-slate-300 border-slate-600 hover:bg-slate-700/50 w-full sm:w-auto order-2 sm:order-1">
            <LogOut className="mr-2 h-4 w-4" /> Exit SEB
          </Button>
          {examEnded ? (
              <Badge variant="destructive" className="px-4 py-2 text-base bg-red-700 text-white order-1 sm:order-2">This Exam Has Ended</Badge>
          ) : (
            <Button 
              onClick={handleStartSystemChecksAndExam} 
              className="btn-gradient w-full sm:w-auto py-3 text-base order-1 sm:order-2"
              disabled={authContextLoading || isLoading || performingChecks || !canStartExam || examNotReadyForStart}
            >
              {performingChecks || isLoading || authContextLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <PlayCircle className="mr-2 h-5 w-5" />}
              {examNotReadyForStart ? "No Questions in Exam" :
              !canStartExam ? `Exam is ${effectiveStatus}` : 
              "Start Exam & System Checks"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

