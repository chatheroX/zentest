
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Question, Exam, FlaggedEvent } from '@/types/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ExamTakingInterface } from '@/components/shared/exam-taking-interface';
import { Loader2, AlertTriangle, PlayCircle, ShieldCheck, Info, ServerCrash } from 'lucide-react'; 
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';


export default function TeacherDemoExamPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createSupabaseBrowserClient();
  const { user: teacherUser, isLoading: authIsLoading } = useAuth();

  const examId = params.examId as string;

  const [examDetails, setExamDetails] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [pageIsLoading, setPageIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [examLocallyStarted, setExamLocallyStarted] = useState(false); 

  const teacherUserId = teacherUser?.user_id;
  const teacherName = teacherUser?.name;
  const teacherAvatarUrl = teacherUser?.avatar_url;


  const fetchExamData = useCallback(async () => {
    console.log(`[TeacherDemoPage] fetchExamData triggered. examId: ${examId}, teacherUserId: ${teacherUserId}`);
    if (!examId || !supabase || !teacherUserId) { 
      const errorMsg = !examId ? "Exam ID is missing for demo." : 
                       !supabase ? "Supabase client not available for demo." : 
                       "Teacher details not available for demo.";
      console.warn(`[TeacherDemoPage] Aborting fetch: ${errorMsg}`);
      setPageError(errorMsg);
      setPageIsLoading(false);
      return;
    }
    
    setPageIsLoading(true);
    setPageError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('ExamX')
        .select('*') 
        .eq('exam_id', examId)
        .single();

      if (fetchError) throw fetchError;
      if (!data) throw new Error("Exam not found for demo.");
      
      const currentExam = data as Exam;
      console.log("[TeacherDemoPage] Exam data fetched for demo:", currentExam);
      setExamDetails(currentExam);
      setQuestions(currentExam.questions || []);

      if (!currentExam.questions || currentExam.questions.length === 0) {
        setPageError("This exam has no questions. Please add questions to run a demo.");
      }
    } catch (e: any) {
      console.error("[TeacherDemoPage] Failed to fetch exam data for demo:", e);
      setPageError(e.message || "Failed to load exam data for demo.");
      setQuestions([]);
      setExamDetails(null);
    } finally {
      setPageIsLoading(false);
    }
  }, [examId, supabase, teacherUserId]);


  useEffect(() => {
    console.log("[TeacherDemoPage] Fetch Effect. authIsLoading:", authIsLoading, "teacherUserId:", teacherUserId, "examId:", examId, "examDetails:", !!examDetails, "pageError:", pageError, "pageIsLoading:", pageIsLoading);
    if (!authIsLoading && teacherUserId && examId) { 
      if (!examDetails && !pageError && pageIsLoading) { 
        console.log("[TeacherDemoPage] Conditions met, calling fetchExamData.");
        fetchExamData();
      } else if (examDetails || pageError) { 
         if(pageIsLoading) setPageIsLoading(false); 
      }
    } else if (!pageIsLoading && (!teacherUserId || !examId) && !authIsLoading) { 
      if (!teacherUserId) setPageError("Teacher details not available for demo.");
      else if (!examId) setPageError("Exam ID missing for demo.");
      if(pageIsLoading) setPageIsLoading(false); 
    }
  }, [examId, authIsLoading, teacherUserId, examDetails, pageError, pageIsLoading, fetchExamData]);


  const handleStartDemoExam = useCallback(() => {
    console.log('[TeacherDemoPage] handleStartDemoExam called. ExamDetails:', !!examDetails, 'Questions count:', questions?.length);
    if (!examDetails) {
      toast({ title: "Error", description: "Exam details not loaded for demo.", variant: "destructive" });
      return;
    }
    if (!questions || questions.length === 0) {
      console.log('[TeacherDemoPage] Aborting demo start: No questions for demo.');
      toast({ title: "No Questions", description: "This exam has no questions to demo.", variant: "destructive" });
      setPageError("This exam has no questions. Add questions to run a demo."); 
      return;
    }
    console.log('[TeacherDemoPage] Starting demo locally.');
    setPageError(null); 
    setExamLocallyStarted(true);
  }, [examDetails, questions, toast]);


  const handleDemoAnswerChange = useCallback((questionId: string, optionId: string) => {
    console.log(`[TeacherDemoPage] Demo Answer for QID ${questionId}: OptionID ${optionId}`);
  }, []);

  const handleDemoSubmitExam = useCallback(async (answers: Record<string, string>, flaggedEvents: FlaggedEvent[]) => {
    console.log('[TeacherDemoPage] Demo exam submitted with answers:', answers);
    console.log('[TeacherDemoPage] Demo flagged events:', flaggedEvents);
    toast({ title: "Demo Exam Ended", description: "The demo exam has been submitted (simulated)." });
    setExamLocallyStarted(false); 
  }, [toast]);

  const handleDemoTimeUp = useCallback(async (answers: Record<string, string>, flaggedEvents: FlaggedEvent[]) => {
    console.log("[TeacherDemoPage] Demo time is up. Auto-submitting answers:", answers);
    console.log("[TeacherDemoPage] Demo time is up. Auto-submitting flagged events:", flaggedEvents);
    toast({ title: "Demo Time Up!", description: "The demo exam time has ended (simulated)." });
    setExamLocallyStarted(false);
  }, [toast]);


  if (authIsLoading || (pageIsLoading && !examDetails && !pageError)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 p-4">
        <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
        <p className="text-lg text-slate-300">Loading demo exam: {examId}...</p>
      </div>
    );
  }

  if (pageError && !examDetails && !examLocallyStarted) {
     return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 p-4">
        <Card className="w-full max-w-md modern-card text-center shadow-xl bg-card/80 backdrop-blur-lg border-border/30">
           <CardHeader className="pt-8 pb-4">
            <ServerCrash className="h-16 w-16 text-destructive mx-auto mb-5" />
            <CardTitle className="text-2xl text-destructive">Cannot Load Demo</CardTitle>
          </CardHeader>
          <CardContent className="pb-6">
            <p className="text-sm text-muted-foreground mb-6">{pageError}</p>
            <Button onClick={() => router.back()} className="w-full btn-primary-solid">Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!examDetails && !pageIsLoading && !examLocallyStarted) {
     return (
       <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 p-4">
        <Card className="w-full max-w-md modern-card text-center shadow-xl bg-card/80 backdrop-blur-lg border-border/30">
           <CardHeader className="pt-8 pb-4">
            <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-5" />
            <CardTitle className="text-2xl text-destructive">Demo Exam Not Found</CardTitle>
          </CardHeader>
          <CardContent className="pb-6">
            <p className="text-sm text-muted-foreground mb-6">Could not load details for this demo exam.</p>
            <Button onClick={() => router.back()} className="w-full btn-primary-solid">Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!examLocallyStarted && examDetails) {
    const cantStartReasonForDemo = pageError; 
    
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-lg modern-card shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl md:text-3xl font-bold text-foreground">
              Ready to Start Demo: {examDetails.title}
            </CardTitle>
            {examDetails.description && <CardDescription className="text-muted-foreground mt-1">{examDetails.description}</CardDescription>}
            <p className="text-sm text-orange-500 font-semibold mt-2">(DEMO MODE - Status: {examDetails.status})</p>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
             <div className="grid grid-cols-2 gap-4 p-3 border rounded-lg bg-background/50 dark:bg-slate-800/50 shadow-sm text-sm">
                <div>
                    <p className="font-medium text-muted-foreground">Duration</p>
                    <p className="text-lg font-semibold text-foreground">{examDetails.duration || 'N/A'} minutes</p>
                </div>
                <div>
                    <p className="font-medium text-muted-foreground">Questions</p>
                    <p className="text-lg font-semibold text-foreground">{questions?.length || 0}</p>
                </div>
             </div>
            <Alert variant="default" className="bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300">
              <Info className="h-5 w-5 text-blue-500 dark:text-blue-400" />
              <AlertTitle className="font-semibold text-blue-600 dark:text-blue-300">Demo Environment</AlertTitle>
              <AlertDescription>
                This is a simulation of the student exam environment. Activity monitoring will be noted for informational purposes in the console and via toasts.
              </AlertDescription>
            </Alert>
            {cantStartReasonForDemo && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{cantStartReasonForDemo.includes("no questions") ? "Cannot Start Demo" : "Error"}</AlertTitle>
                <AlertDescription>{cantStartReasonForDemo}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex flex-col items-center gap-3 pt-6 border-t">
            <Button
              onClick={handleStartDemoExam}
              className="w-full btn-primary-solid py-3 text-lg"
              disabled={pageIsLoading || !examDetails || !!cantStartReasonForDemo } 
            >
              {pageIsLoading ? <Loader2 className="animate-spin mr-2" /> : <PlayCircle className="mr-2" />}
              Start Demo Exam
            </Button>
            <Button variant="outline" onClick={() => router.back()} className="w-full">
              Cancel / Back to Exam Details
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  if (examLocallyStarted && examDetails) {
    return (
      <ExamTakingInterface
        examDetails={examDetails}
        questions={questions || []} 
        parentIsLoading={pageIsLoading && !examDetails} 
        examLoadingError={pageError} 
        persistentError={null} 
        cantStartReason={pageError && questions.length === 0 ? pageError : null}
        onAnswerChange={handleDemoAnswerChange}
        onSubmitExam={handleDemoSubmitExam}
        onTimeUp={handleDemoTimeUp}
        isDemoMode={true}
        userIdForActivityMonitor={teacherUserId || 'anonymous_teacher_demo'}
        studentName={teacherName}
        studentRollNumber={teacherUserId} 
        studentAvatarUrl={teacherAvatarUrl}
        examStarted={true}
      />
    );
  }

  return (
     <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 p-4">
        <Card className="w-full max-w-md modern-card text-center shadow-xl bg-card/80 backdrop-blur-lg border-border/30">
           <CardHeader className="pt-8 pb-4">
            <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-5" />
            <CardTitle className="text-2xl text-destructive">Error in Demo Setup</CardTitle>
          </CardHeader>
          <CardContent className="pb-6">
            <p className="text-sm text-muted-foreground mb-6">Could not initialize the demo exam interface correctly.</p>
            <Button onClick={() => router.back()} className="w-full btn-primary-solid">Go Back</Button>
          </CardContent>
        </Card>
      </div>
  );
}
