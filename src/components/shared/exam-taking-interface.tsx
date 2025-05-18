
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
import { useToast as useGlobalToast } from '@/hooks/use-toast';
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
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  if (parentIsLoading && !isSubmittingInternally) { 
    return (
      <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-background/80 backdrop-blur-md p-6 text-center text-foreground">
          <Loader2 className="h-16 w-16 text-primary animate-spin mb-6 stroke-width-1.5" />
          <h2 className="text-xl font-medium mb-2">Submitting Exam...</h2>
          <p className="text-sm text-muted-foreground">Please wait.</p>
      </div>
    );
  }
  if (isSubmittingInternally && !parentIsLoading) { 
     return (
      <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-background/80 backdrop-blur-md p-6 text-center text-foreground">
          <Loader2 className="h-16 w-16 text-primary animate-spin mb-6 stroke-width-1.5" />
          <h2 className="text-xl font-medium mb-2">Processing Submission...</h2>
          <p className="text-sm text-muted-foreground">Please wait.</p>
      </div>
    );
  }

  // Main container defaults to bg-background and text-foreground from SEB layout
  return (
    <div className="min-h-screen w-full flex flex-col bg-background text-foreground">
      {/* Header: Use bg-card for light theme */}
      <header className="h-20 px-4 sm:px-6 flex items-center justify-between border-b border-border bg-card shadow-sm shrink-0">
        <div className="flex items-center gap-2">
          <Image src={logoAsset} alt="ZenTest Logo" width={180} height={45} className="h-16 w-auto" />
        </div>
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border-2 border-primary/60">
            <AvatarImage src={studentAvatarUrl || undefined} alt={studentName || 'Student'} />
            <AvatarFallback className="bg-muted text-muted-foreground">
                {(studentName || "S").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium text-foreground">{studentName || (isDemoMode ? "Demo Teacher" : "Test Student")}</p>
            <p className="text-xs text-muted-foreground">ID: {studentRollNumber || (isDemoMode ? "T00000" : "S00000")}</p>
          </div>
        </div>
      </header>

      {/* Timer and Submit Button Bar: Use bg-card */}
      <div className="h-14 px-4 sm:px-6 flex items-center justify-between border-b border-border bg-card shadow-sm shrink-0">
        <div className="flex items-center gap-2 text-foreground">
          <Clock size={20} className="text-primary stroke-width-1.5" />
          <span className="font-medium text-sm">Time remaining:</span>
          <span className="font-semibold text-md tabular-nums text-primary">{formatTime(timeLeftSeconds)}</span>
        </div>
        <AlertDialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
            <AlertDialogTrigger asChild>
                 <Button
                    variant="destructive"
                    disabled={parentIsLoading || isSubmittingInternally}
                    className="px-6 py-2 text-sm rounded-md font-medium shadow-md hover:shadow-lg transition-all btn-gradient-destructive"
                    >
                    <LogOut className="mr-2 h-4 w-4 stroke-width-1.5"/>
                    Submit Exam
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="glass-card border-border bg-card text-card-foreground">
                <AlertDialogHeader>
                <AlertDialogTitle className="text-foreground">Confirm Submission</AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                    Are you sure you want to submit the exam? This action cannot be undone.
                    {Object.keys(answers).length < totalQuestions &&
                        ` You have ${totalQuestions - Object.keys(answers).length} unanswered question(s).`}
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel className="btn-outline-subtle" disabled={isSubmittingInternally || parentIsLoading}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmAndSubmitExam} className="btn-gradient-destructive" disabled={isSubmittingInternally || parentIsLoading}>
                    {(isSubmittingInternally || parentIsLoading) && <Loader2 className="animate-spin mr-2 h-4 w-4 stroke-width-1.5" />}
                    Yes, Submit Exam
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Main Content Area: Question display */}
      <main className="flex-1 flex flex-col py-6 px-4 sm:px-8 md:px-12 lg:px-16 xl:px-24 overflow-y-auto">
        {/* Question Text Card: Use bg-card */}
        <div className="w-full bg-card border border-border rounded-lg shadow-lg p-6 sm:p-8 mb-6">
          <div className="mb-4 flex justify-between items-center">
            <p className="text-lg sm:text-xl font-semibold text-primary">
              Question {currentQuestionIndex + 1} <span className="text-sm font-normal text-muted-foreground">of {totalQuestions}</span>
            </p>
            <Button variant="ghost" size="icon" onClick={handleToggleMarkForReview} title={markedForReview[currentQuestion?.id || ''] ? "Unmark for Review" : "Mark for Review"} disabled={parentIsLoading || isSubmittingInternally} className="text-muted-foreground hover:text-yellow-500">
                <Bookmark className={cn("h-5 w-5 stroke-width-1.5", markedForReview[currentQuestion?.id || ''] ? "fill-yellow-400 text-yellow-500" : "")} />
            </Button>
          </div>
          <h2 className="text-xl sm:text-2xl font-medium text-foreground leading-relaxed">
            {currentQuestion?.text}
          </h2>
        </div>

        {/* Options Card: Use bg-card */}
        {currentQuestion && (
          <div className="w-full bg-card border border-border rounded-lg shadow-lg p-6 sm:p-8">
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
                    "flex items-center space-x-3 p-4 border rounded-lg transition-all duration-150 ease-in-out cursor-pointer text-base",
                    "hover:shadow-md",
                    answers[currentQuestion.id] === option.id
                      ? "bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-700 dark:border-blue-500 dark:text-blue-100" // Selected styles
                      : "bg-card border-border text-card-foreground hover:bg-muted/30 dark:hover:bg-muted/10", // Unselected styles
                    (parentIsLoading || isSubmittingInternally) && "cursor-not-allowed opacity-70"
                  )}
                >
                  <RadioGroupItem
                    value={option.id}
                    id={`opt-${currentQuestion.id}-${option.id}`}
                    className="h-5 w-5 border-muted-foreground text-primary focus:ring-primary disabled:opacity-50 shrink-0 stroke-width-1.5"
                    disabled={parentIsLoading || isSubmittingInternally}
                  />
                  <span className="font-medium leading-snug">{option.text}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>
        )}
      </main>

      {/* Footer: Navigation, Use bg-card */}
      <footer className="h-20 px-4 sm:px-6 flex items-center justify-between border-t border-border bg-card shadow-sm shrink-0">
        <Button
          variant="outline"
          onClick={handlePreviousQuestion}
          disabled={currentQuestionIndex === 0 || !allowBacktracking || parentIsLoading || isSubmittingInternally}
          className="px-6 py-3 text-md rounded-lg shadow-sm btn-outline-subtle"
        >
          <ChevronLeft className="mr-2 h-5 w-5 stroke-width-1.5" /> Previous
        </Button>

        <div className="flex-1 mx-4 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent py-2">
          <div className="flex items-center justify-center gap-2 px-2">
            {questions.map((q, index) => (
              <Button
                key={q.id}
                variant={currentQuestionIndex === index ? "default" : "outline"}
                size="icon"
                className={cn(
                  "h-10 w-10 text-sm rounded-md shrink-0 font-medium shadow",
                  currentQuestionIndex === index
                    ? "btn-primary-solid" 
                    : "bg-card border-border text-foreground hover:bg-muted",
                  answers[q.id] && currentQuestionIndex !== index ? "bg-green-100 border-green-500 text-green-700 hover:bg-green-200 dark:bg-green-700/30 dark:border-green-600 dark:text-green-300" : "",
                  markedForReview[q.id] && currentQuestionIndex !== index && !answers[q.id] ? "bg-purple-100 border-purple-500 text-purple-700 hover:bg-purple-200 dark:bg-purple-700/30 dark:border-purple-600 dark:text-purple-300" : "",
                  markedForReview[q.id] && currentQuestionIndex !== index && answers[q.id] ? "bg-purple-100 border-purple-500 text-purple-700 ring-1 ring-green-500 hover:bg-purple-200 dark:bg-purple-700/30 dark:border-purple-600 dark:text-purple-300 dark:ring-green-400" : "",
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

        {isLastQuestion ? (
          <Button
            onClick={() => setShowSubmitConfirm(true)}
            disabled={parentIsLoading || isSubmittingInternally}
            className={cn(
              "px-6 py-3 text-md rounded-lg font-medium shadow-sm btn-gradient-destructive"
            )}
          >
            <LogOut className="mr-2 h-5 w-5 stroke-width-1.5" /> Submit Exam
          </Button>
        ) : (
          <Button
            onClick={handleNextQuestion}
            disabled={currentQuestionIndex === totalQuestions - 1 || parentIsLoading || isSubmittingInternally}
            className={cn(
              "px-6 py-3 text-md rounded-lg font-medium shadow-sm btn-primary-solid"
            )}
          >
            Next <ChevronRight className="ml-2 h-5 w-5 stroke-width-1.5" />
          </Button>
        )}
      </footer>
    </div>
  );
}

    