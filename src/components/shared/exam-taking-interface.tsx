
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, AlertTriangle, Clock, Check, X, Bookmark, ChevronLeft, ChevronRight, LogOut, CheckCircle } from 'lucide-react';
import { useActivityMonitor, type FlaggedEvent } from '@/hooks/use-activity-monitor';
import { addInputRestrictionListeners } from '@/lib/seb-utils';
import { useToast as useGlobalToast } from '@/hooks/use-toast'; // Renamed to avoid conflict if local toast is used
import type { Question, Exam, QuestionOption } from '@/types/supabase';
import { cn } from "@/lib/utils";
import logoAsset from '../../../logo.png';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface ExamTakingInterfaceProps {
  examDetails: Exam;
  questions: Question[];
  parentIsLoading: boolean;
  onAnswerChange: (questionId: string, optionId: string) => void;
  onSubmitExam: (answers: Record<string, string>, flaggedEvents: FlaggedEvent[]) => Promise<void>;
  onTimeUp: (answers: Record<string, string>, flaggedEvents: FlaggedEvent[]) => Promise<void>;
  isDemoMode?: boolean;
  userIdForActivityMonitor: string;
  studentName?: string | null;
  studentRollNumber?: string | null;
  studentAvatarUrl?: string | null;
  examStarted: boolean;
}

export function ExamTakingInterface({
  examDetails,
  questions,
  parentIsLoading,
  onAnswerChange,
  onSubmitExam: parentOnSubmitExam,
  onTimeUp: parentOnTimeUp,
  isDemoMode = false,
  userIdForActivityMonitor,
  studentName,
  studentRollNumber,
  studentAvatarUrl,
  examStarted,
}: ExamTakingInterfaceProps) {
  const { toast } = useGlobalToast();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(examDetails.duration * 60);
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});
  const [visitedQuestions, setVisitedQuestions] = useState<Record<string, boolean>>({});
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isSubmittingInternally, setIsSubmittingInternally] = useState(false);

  const onSubmitExamRef = useRef(parentOnSubmitExam);
  const onTimeUpRef = useRef(parentOnTimeUp);

  const currentQuestion = useMemo(() => questions[currentQuestionIndex], [questions, currentQuestionIndex]);
  const allowBacktracking = useMemo(() => examDetails.allow_backtracking === true, [examDetails.allow_backtracking]);

  useEffect(() => { onSubmitExamRef.current = parentOnSubmitExam; }, [parentOnSubmitExam]);
  useEffect(() => { onTimeUpRef.current = parentOnTimeUp; }, [parentOnTimeUp]);

  useEffect(() => {
    if (currentQuestion?.id && !visitedQuestions[currentQuestion.id]) {
      setVisitedQuestions(prev => ({ ...prev, [currentQuestion.id!]: true }));
    }
  }, [currentQuestion, visitedQuestions]);

  const [activityFlags, setActivityFlags] = useState<FlaggedEvent[]>([]);
  const handleFlagEvent = useCallback((eventData: Pick<FlaggedEvent, 'type' | 'details'>) => {
    const newEvent: FlaggedEvent = {
        ...eventData,
        timestamp: new Date(),
        studentId: userIdForActivityMonitor,
        examId: examDetails.exam_id,
    };
    setActivityFlags((prev) => [...prev, newEvent]);
    if (!isDemoMode) {
      toast({
        title: "Activity Alert",
        description: `${newEvent.type.replace(/_/g, ' ')} detected. ${newEvent.details || ''}`,
        variant: "destructive",
        duration: 5000,
      });
    }
  }, [isDemoMode, toast, userIdForActivityMonitor, examDetails.exam_id]);


  const handleTimeUpCallback = useCallback(async () => {
    if (parentIsLoading || !examStarted || isSubmittingInternally) return;
    setIsSubmittingInternally(true);
    toast({ title: isDemoMode ? "Demo Time's Up!" : "Time's Up!", description: isDemoMode ? "The demo exam duration has ended." : "Auto-submitting your exam.", variant: isDemoMode ? "default" : "destructive" });
    await onTimeUpRef.current(answers, activityFlags);
  }, [answers, activityFlags, isDemoMode, toast, parentIsLoading, examStarted, isSubmittingInternally, onTimeUpRef]);

  useEffect(() => {
    if (!examStarted) return;

    if (timeLeftSeconds <= 0) {
      if (!isSubmittingInternally) { 
        handleTimeUpCallback();
      }
      return;
    }
    const intervalId = setInterval(() => {
      setTimeLeftSeconds(prevTime => {
        if (prevTime <= 1) {
          clearInterval(intervalId);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
    return () => clearInterval(intervalId);
  }, [timeLeftSeconds, handleTimeUpCallback, examStarted, isSubmittingInternally]);


  useActivityMonitor({
    studentId: userIdForActivityMonitor,
    examId: examDetails.exam_id,
    enabled: !isDemoMode && examStarted,
    onFlagEvent: (event) => handleFlagEvent({ type: event.type, details: event.details }),
  });

  useEffect(() => {
    if (isDemoMode || !examStarted) return;

    const cleanupInputRestriction = addInputRestrictionListeners(handleFlagEvent);
    return cleanupInputRestriction;
  }, [isDemoMode, handleFlagEvent, examStarted]);


  const handleInternalAnswerChange = useCallback((questionId: string, optionId: string) => {
    if (isSubmittingInternally) return;
    setAnswers((prevAnswers) => ({ ...prevAnswers, [questionId]: optionId }));
    onAnswerChange(questionId, optionId);
  }, [onAnswerChange, isSubmittingInternally]);

  const handleNextQuestion = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  }, [currentQuestionIndex, questions.length]);

  const handlePreviousQuestion = useCallback(() => {
    if (allowBacktracking && currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else if (!allowBacktracking) {
      toast({ description: "Backtracking is not allowed for this exam.", variant: "default" });
    }
  }, [allowBacktracking, currentQuestionIndex, toast]);

  const handleQuestionNavigation = useCallback((index: number) => {
    if (index >= 0 && index < questions.length) {
      if (!allowBacktracking && index < currentQuestionIndex) {
        toast({ description: "Backtracking is not allowed for this exam.", variant: "default" });
        return;
      }
      setCurrentQuestionIndex(index);
    }
  }, [allowBacktracking, currentQuestionIndex, questions.length, toast]);

  const handleToggleMarkForReview = useCallback(() => {
    if (currentQuestion?.id) {
      setMarkedForReview(prev => ({ ...prev, [currentQuestion.id!]: !prev[currentQuestion.id!] }));
    }
  }, [currentQuestion?.id]);

  const confirmAndSubmitExam = async () => {
    if (parentIsLoading || isSubmittingInternally) return;
    setIsSubmittingInternally(true);
    setShowSubmitConfirm(false);
    await onSubmitExamRef.current(answers, activityFlags);
  };

  const currentQuestionId = currentQuestion?.id;
  const memoizedOnRadioValueChange = useCallback((optionId: string) => {
    if (currentQuestionId) {
      handleInternalAnswerChange(currentQuestionId, optionId);
    }
  }, [currentQuestionId, handleInternalAnswerChange]);

  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const totalQuestions = questions.length;

  if (parentIsLoading && !isSubmittingInternally) { 
    return (
      <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-md p-6 text-center text-white">
          <Loader2 className="h-16 w-16 text-blue-400 animate-spin mb-6" />
          <h2 className="text-xl font-medium mb-2">Submitting Exam...</h2>
          <p className="text-sm text-slate-300">Please wait.</p>
      </div>
    );
  }
  if (isSubmittingInternally && !parentIsLoading) { 
     return (
      <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-md p-6 text-center text-white">
          <Loader2 className="h-16 w-16 text-blue-400 animate-spin mb-6" />
          <h2 className="text-xl font-medium mb-2">Processing Submission...</h2>
          <p className="text-sm text-slate-300">Please wait.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col text-slate-100"> {/* Removed bg-seb-gradient, assuming parent provides it */}
      <header className="h-20 px-4 sm:px-6 flex items-center justify-between border-b border-white/20 glass-pane shrink-0">
        <div className="flex items-center gap-2">
          <Image src={logoAsset} alt="ZenTest Logo" width={180} height={50} className="h-16 w-auto" />
        </div>
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border-2 border-blue-400/70">
            <AvatarImage src={studentAvatarUrl || undefined} alt={studentName || 'Student'} />
            <AvatarFallback className="bg-slate-700 text-slate-200">
                {(studentName || "S").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium text-slate-100">{studentName || (isDemoMode ? "Demo Teacher" : "Test Student")}</p>
            <p className="text-xs text-slate-300">ID: {studentRollNumber || (isDemoMode ? "T00000" : "S00000")}</p>
          </div>
        </div>
      </header>

      <div className="h-14 px-4 sm:px-6 flex items-center justify-between border-b border-white/20 glass-pane shrink-0">
        <div className="flex items-center gap-2 text-slate-200">
          <Clock size={20} className="text-blue-300" />
          <span className="font-medium text-sm">Time remaining:</span>
          <span className="font-semibold text-md tabular-nums text-blue-300">{formatTime(timeLeftSeconds)}</span>
        </div>
        <AlertDialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
            <AlertDialogTrigger asChild>
                 <Button
                    variant="destructive"
                    disabled={parentIsLoading || isSubmittingInternally}
                    className="px-6 py-2 text-sm rounded-md font-medium shadow-md hover:shadow-lg transition-all bg-red-600 hover:bg-red-700 text-white"
                    >
                    <LogOut className="mr-2 h-4 w-4"/>
                    Submit Exam
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="glass-pane text-slate-100 border-slate-600">
                <AlertDialogHeader>
                <AlertDialogTitle className="text-slate-50">Confirm Submission</AlertDialogTitle>
                <AlertDialogDescription className="text-slate-300">
                    Are you sure you want to submit the exam? This action cannot be undone.
                    {Object.keys(answers).length < totalQuestions &&
                        ` You have ${totalQuestions - Object.keys(answers).length} unanswered question(s).`}
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel className="bg-slate-700 hover:bg-slate-600 text-slate-100 border-slate-500" disabled={isSubmittingInternally}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmAndSubmitExam} className="bg-red-600 hover:bg-red-700 text-white" disabled={isSubmittingInternally || parentIsLoading}>
                    {(isSubmittingInternally || parentIsLoading) && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                    Yes, Submit Exam
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </div>

      <main className="flex-1 flex flex-col py-6 px-4 sm:px-8 md:px-12 lg:px-16 xl:px-24 overflow-y-auto">
        <div className="w-full glass-pane p-6 sm:p-8 mb-6">
          <div className="mb-4 flex justify-between items-center">
            <p className="text-lg sm:text-xl font-semibold text-blue-300">
              Question {currentQuestionIndex + 1} <span className="text-sm font-normal text-slate-400">of {totalQuestions}</span>
            </p>
            <Button variant="ghost" size="icon" onClick={handleToggleMarkForReview} title={markedForReview[currentQuestion?.id || ''] ? "Unmark for Review" : "Mark for Review"} disabled={parentIsLoading || isSubmittingInternally} className="text-slate-300 hover:text-yellow-400">
                <Bookmark className={cn("h-5 w-5", markedForReview[currentQuestion?.id || ''] ? "fill-yellow-400 text-yellow-500" : "")} />
            </Button>
          </div>
          <h2 className="text-xl sm:text-2xl font-medium text-slate-100 leading-relaxed">
            {currentQuestion?.text}
          </h2>
        </div>

        {currentQuestion && (
          <div className="w-full glass-pane p-6 sm:p-8">
            <RadioGroup
              key={currentQuestion.id}
              value={answers[currentQuestion.id] || ''}
              onValueChange={memoizedOnRadioValueChange}
              className={cn(
                "grid gap-4",
                currentQuestion.options.length <= 2 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
              )}
              disabled={parentIsLoading || isSubmittingInternally}
            >
              {currentQuestion.options.map((option) => (
                <Label
                  key={option.id}
                  htmlFor={`opt-${currentQuestion.id}-${option.id}`}
                  className={cn(
                    "flex items-center space-x-3 p-4 border rounded-lg transition-all duration-150 ease-in-out cursor-pointer text-base text-slate-100",
                    "hover:shadow-lg hover:border-blue-400/70",
                    answers[currentQuestion.id] === option.id
                      ? "bg-blue-500/30 border-blue-400 ring-2 ring-blue-400/80 text-blue-200"
                      : "bg-white/5 border-slate-600 hover:bg-white/10",
                    (parentIsLoading || isSubmittingInternally) && "cursor-not-allowed opacity-70"
                  )}
                >
                  <RadioGroupItem
                    value={option.id}
                    id={`opt-${currentQuestion.id}-${option.id}`}
                    className="h-5 w-5 border-slate-400 text-blue-300 focus:ring-blue-300 disabled:opacity-50 shrink-0"
                    disabled={parentIsLoading || isSubmittingInternally}
                  />
                  <span className="font-medium leading-snug">{option.text}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>
        )}
      </main>

      <footer className="h-20 px-4 sm:px-6 flex items-center justify-between border-t border-white/20 glass-pane shrink-0">
        <Button
          variant="outline"
          onClick={handlePreviousQuestion}
          disabled={currentQuestionIndex === 0 || !allowBacktracking || parentIsLoading || isSubmittingInternally}
          className="px-6 py-3 text-md rounded-lg shadow-sm bg-white/10 hover:bg-white/20 border-slate-400 text-slate-100"
        >
          <ChevronLeft className="mr-2 h-5 w-5" /> Previous
        </Button>

        <div className="flex-1 mx-4 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent py-2">
          <div className="flex items-center justify-center gap-2 px-2">
            {questions.map((q, index) => (
              <Button
                key={q.id}
                variant={currentQuestionIndex === index ? "default" : "outline"}
                size="icon"
                className={cn(
                  "h-10 w-10 text-sm rounded-md shrink-0 font-medium shadow",
                  currentQuestionIndex === index
                    ? "bg-blue-500 text-white hover:bg-blue-600"
                    : "bg-slate-700/50 border-slate-600 text-slate-200 hover:bg-slate-600/70",
                  answers[q.id] && currentQuestionIndex !== index ? "bg-green-600/40 border-green-500 text-green-100 hover:bg-green-600/60" : "",
                  markedForReview[q.id] && currentQuestionIndex !== index && !answers[q.id] ? "bg-purple-600/40 border-purple-500 text-purple-100 hover:bg-purple-600/60" : "",
                  markedForReview[q.id] && currentQuestionIndex !== index && answers[q.id] ? "bg-purple-600/40 border-purple-500 text-purple-100 ring-2 ring-green-500 hover:bg-purple-600/60" : "",
                  (!allowBacktracking && index < currentQuestionIndex) && "opacity-60 cursor-not-allowed"
                )}
                onClick={() => handleQuestionNavigation(index)}
                disabled={(!allowBacktracking && index < currentQuestionIndex) || parentIsLoading || isSubmittingInternally}
                title={`Go to Question ${index + 1}`}
              >
                {index + 1}
              </Button>
            ))}
          </div>
        </div>

        <Button
          onClick={handleNextQuestion}
          disabled={currentQuestionIndex === totalQuestions - 1 || parentIsLoading || isSubmittingInternally}
          className={cn(
            "px-6 py-3 text-md rounded-lg font-medium shadow-sm bg-blue-500 hover:bg-blue-600 text-white"
          )}
        >
          Next <ChevronRight className="ml-2 h-5 w-5" />
        </Button>
      </footer>
    </div>
  );
}
