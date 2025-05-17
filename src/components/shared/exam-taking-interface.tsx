
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, AlertTriangle, Clock, Check, X, Bookmark, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { useActivityMonitor, type FlaggedEvent, addInputRestrictionListeners } from '@/hooks/use-activity-monitor';
import { useToast } from '@/hooks/use-toast';
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
  examStarted: boolean; // Added to ensure it's explicitly started
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
  const { toast } = useToast();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(examDetails.duration * 60);
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});
  const [visitedQuestions, setVisitedQuestions] = useState<Record<string, boolean>>({});
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

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
    if (!isDemoMode) { // Only show toast if not in demo mode
      toast({
        title: "Activity Alert",
        description: `${newEvent.type.replace(/_/g, ' ')} detected. ${newEvent.details || ''}`,
        variant: "destructive",
        duration: 5000,
      });
    }
  }, [isDemoMode, toast, userIdForActivityMonitor, examDetails.exam_id]);


  const handleTimeUpCallback = useCallback(async () => {
    if (parentIsLoading || !examStarted) return; 
    toast({ title: isDemoMode ? "Demo Time's Up!" : "Time's Up!", description: isDemoMode ? "The demo exam duration has ended." : "Auto-submitting your exam.", variant: isDemoMode ? "default" : "destructive" });
    await onTimeUpRef.current(answers, activityFlags); 
  }, [answers, activityFlags, isDemoMode, toast, parentIsLoading, examStarted, onTimeUpRef]); // Added examStarted

  useEffect(() => {
    if (!examStarted) return; // Don't start timer if exam hasn't explicitly started

    if (timeLeftSeconds <= 0) {
      handleTimeUpCallback();
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
  }, [timeLeftSeconds, handleTimeUpCallback, examStarted]); // Added examStarted


  useActivityMonitor({
    studentId: userIdForActivityMonitor,
    examId: examDetails.exam_id,
    enabled: !isDemoMode && examStarted, // Enable only if not demo and exam started
    onFlagEvent: (event) => handleFlagEvent({ type: event.type, details: event.details }),
  });

  useEffect(() => {
    if (isDemoMode || !examStarted) return; // Don't restrict input in demo mode or if exam not started

    const cleanupInputRestriction = addInputRestrictionListeners(handleFlagEvent);
    return cleanupInputRestriction;
  }, [isDemoMode, handleFlagEvent, examStarted]); // Added examStarted


  const handleInternalAnswerChange = useCallback((questionId: string, optionId: string) => {
    setAnswers((prevAnswers) => ({ ...prevAnswers, [questionId]: optionId }));
    onAnswerChange(questionId, optionId);
  }, [onAnswerChange]);

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
    if (parentIsLoading) return;
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

  if (parentIsLoading) { 
    return (
      <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-md p-6 text-center">
          <Loader2 className="h-16 w-16 text-primary animate-spin mb-6" />
          <h2 className="text-xl font-medium text-slate-100 mb-2">Submitting Exam...</h2>
          <p className="text-sm text-slate-300">Please wait.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-slate-900 text-slate-100"> {/* Ensure full screen dark bg */}
      <header className="h-20 px-4 sm:px-6 flex items-center justify-between border-b border-slate-700 bg-slate-800 shadow-md shrink-0">
        <div className="flex items-center gap-2">
          <Image src={logoAsset} alt="ZenTest Logo" width={160} height={45} className="h-auto" />
        </div>
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border-2 border-primary/50">
            <AvatarImage src={studentAvatarUrl || undefined} alt={studentName || 'Student'} />
            <AvatarFallback className="bg-slate-700 text-slate-300">
                {(studentName || "S").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium text-slate-100">{studentName || (isDemoMode ? "Demo Teacher" : "Test Student")}</p>
            <p className="text-xs text-slate-400">ID: {studentRollNumber || (isDemoMode ? "T00000" : "S00000")}</p>
          </div>
        </div>
      </header>

      <div className="h-14 px-4 sm:px-6 flex items-center justify-between border-b border-slate-700 bg-slate-800 shadow-sm shrink-0">
        <div className="flex items-center gap-2 text-slate-300">
          <Clock size={20} className="text-primary" />
          <span className="font-medium text-sm">Time remaining:</span>
          <span className="font-semibold text-md tabular-nums text-primary">{formatTime(timeLeftSeconds)}</span>
        </div>
        <AlertDialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
            <AlertDialogTrigger asChild>
                 <Button
                    variant="destructive"
                    disabled={parentIsLoading}
                    className="px-6 py-2 text-sm rounded-md font-medium shadow-md hover:shadow-lg transition-all btn-gradient-destructive"
                    >
                    <LogOut className="mr-2 h-4 w-4"/>
                    Submit Exam
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-slate-800 border-slate-700 text-slate-100 shadow-xl rounded-lg">
                <AlertDialogHeader>
                <AlertDialogTitle className="text-slate-50">Confirm Submission</AlertDialogTitle>
                <AlertDialogDescription className="text-slate-300">
                    Are you sure you want to submit the exam? This action cannot be undone.
                    {Object.keys(answers).length < totalQuestions && 
                        ` You have ${totalQuestions - Object.keys(answers).length} unanswered question(s).`}
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel className="btn-outline-subtle border-slate-600 text-slate-300 hover:bg-slate-700">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmAndSubmitExam} className="btn-gradient-destructive">
                    Yes, Submit Exam
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </div>

      <main className="flex-1 flex flex-col py-6 px-4 sm:px-8 md:px-12 lg:px-16 xl:px-24 overflow-y-auto bg-slate-900">
        <div className="w-full bg-slate-800 shadow-xl rounded-lg p-6 sm:p-8 mb-6 border border-slate-700">
          <div className="mb-4 flex justify-between items-center">
            <p className="text-lg sm:text-xl font-semibold text-primary">
              Question {currentQuestionIndex + 1} <span className="text-sm font-normal text-slate-400">of {totalQuestions}</span>
            </p>
            <Button variant="ghost" size="icon" onClick={handleToggleMarkForReview} title={markedForReview[currentQuestion?.id || ''] ? "Unmark for Review" : "Mark for Review"} disabled={parentIsLoading} className="text-slate-400 hover:text-yellow-400">
                <Bookmark className={cn("h-5 w-5", markedForReview[currentQuestion?.id || ''] ? "fill-yellow-400 text-yellow-500" : "")} />
            </Button>
          </div>
          <h2 className="text-xl sm:text-2xl font-medium text-slate-50 leading-relaxed">
            {currentQuestion?.text}
          </h2>
        </div>

        {currentQuestion && (
          <div className="w-full bg-slate-800 shadow-xl rounded-lg p-6 sm:p-8 border border-slate-700">
            <RadioGroup
              key={currentQuestion.id}
              value={answers[currentQuestion.id] || ''}
              onValueChange={memoizedOnRadioValueChange}
              className={cn(
                "grid gap-4",
                currentQuestion.options.length <= 2 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
              )}
              disabled={parentIsLoading}
            >
              {currentQuestion.options.map((option) => (
                <Label
                  key={option.id}
                  htmlFor={`opt-${currentQuestion.id}-${option.id}`}
                  className={cn(
                    "flex items-center space-x-3 p-4 border rounded-lg transition-all duration-150 ease-in-out cursor-pointer text-base text-slate-200",
                    "hover:shadow-lg hover:border-primary/70",
                    answers[currentQuestion.id] === option.id
                      ? "bg-primary/20 border-primary ring-2 ring-primary/80 text-slate-50"
                      : "bg-slate-700/50 border-slate-600 hover:bg-slate-700",
                    parentIsLoading && "cursor-not-allowed opacity-70"
                  )}
                >
                  <RadioGroupItem
                    value={option.id}
                    id={`opt-${currentQuestion.id}-${option.id}`}
                    className="h-5 w-5 border-slate-500 text-primary focus:ring-primary disabled:opacity-50 shrink-0"
                    disabled={parentIsLoading}
                  />
                  <span className="font-medium leading-snug">{option.text}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>
        )}
      </main>

      <footer className="h-20 px-4 sm:px-6 flex items-center justify-between border-t border-slate-700 bg-slate-800 shadow-top shrink-0">
        <Button
          variant="outline"
          onClick={handlePreviousQuestion}
          disabled={currentQuestionIndex === 0 || !allowBacktracking || parentIsLoading}
          className="btn-outline-subtle border-slate-600 text-slate-300 hover:bg-slate-700 px-6 py-3 text-md rounded-lg shadow-sm hover:shadow-md"
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
                    ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                    : "btn-outline-subtle border-slate-600 text-slate-300 hover:bg-slate-700",
                  answers[q.id] && currentQuestionIndex !== index ? "bg-green-600/30 border-green-500/70 text-green-200" : "",
                  markedForReview[q.id] && currentQuestionIndex !== index && !answers[q.id] ? "bg-purple-600/30 border-purple-500/70 text-purple-200" : "",
                  markedForReview[q.id] && currentQuestionIndex !== index && answers[q.id] ? "bg-purple-600/30 border-purple-500/70 text-purple-200 ring-2 ring-green-500/70" : "", 
                  (!allowBacktracking && index < currentQuestionIndex) && "opacity-60 cursor-not-allowed"
                )}
                onClick={() => handleQuestionNavigation(index)}
                disabled={(!allowBacktracking && index < currentQuestionIndex) || parentIsLoading}
                title={`Go to Question ${index + 1}`}
              >
                {index + 1}
              </Button>
            ))}
          </div>
        </div>

        <Button
          onClick={handleNextQuestion}
          disabled={currentQuestionIndex === totalQuestions - 1 || parentIsLoading}
          className={cn(
            "px-6 py-3 text-md rounded-lg font-medium shadow-sm hover:shadow-md bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          Next <ChevronRight className="ml-2 h-5 w-5" />
        </Button>
      </footer>
    </div>
  );
}
