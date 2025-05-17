
'use client';

import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Clock, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button'; // Added for End Test button

interface ExamTimerWarningProps {
  totalDurationSeconds: number;
  onTimeUp: () => void;
  examTitle?: string;
}

const WARNING_THRESHOLDS = [
  { thresholdFraction: 0.5, message: (timeLeft: string) => `Half time remaining: ${timeLeft}` },
  { thresholdSeconds: 15 * 60, message: (timeLeft: string) => `15 minutes remaining` },
  { thresholdSeconds: 5 * 60, message: (timeLeft: string) => `5 minutes remaining` },
  { thresholdSeconds: 1 * 60, message: (timeLeft: string) => `1 minute remaining` },
  { thresholdSeconds: 10, message: (timeLeft: string) => `10 seconds remaining!`}, // Critical
];

export function ExamTimerWarning({ totalDurationSeconds, onTimeUp, examTitle }: ExamTimerWarningProps) {
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(totalDurationSeconds);
  const [currentWarningMessage, setCurrentWarningMessage] = useState<string | null>(null);

  const onTimeUpRef = useRef(onTimeUp);

  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  useEffect(() => {
    if (timeLeftSeconds <= 0) {
      setCurrentWarningMessage('Time is up! Submitting...');
      onTimeUpRef.current(); // Call the ref's current value
      return; // Stop further processing/intervals
    }

    const intervalId = setInterval(() => {
      setTimeLeftSeconds(prevTime => Math.max(0, prevTime - 1)); // Ensure it doesn't go negative
    }, 1000);

    return () => clearInterval(intervalId);
  }, [timeLeftSeconds, totalDurationSeconds]); // Removed onTimeUpRef from deps as it's stable via ref

  useEffect(() => {
    let activeWarning: string | null = null;
    for (const warning of WARNING_THRESHOLDS) {
      if (warning.thresholdFraction) {
        const thresholdTime = totalDurationSeconds * warning.thresholdFraction;
        // Trigger if time left is at or just below the threshold fraction
        if (timeLeftSeconds <= thresholdTime && timeLeftSeconds > thresholdTime - 60) { // Show for up to a minute past threshold
          activeWarning = warning.message(formatTime(timeLeftSeconds));
          break;
        }
      } else if (warning.thresholdSeconds) {
        // Trigger if time left is at or just below the specific seconds threshold
        if (timeLeftSeconds <= warning.thresholdSeconds && timeLeftSeconds > warning.thresholdSeconds - 5) { // Show for 5s for this specific threshold
          activeWarning = warning.message(formatTime(timeLeftSeconds));
          break;
        }
      }
    }
    // Set warning message if a new one is found, or clear if no longer applicable
    setCurrentWarningMessage(activeWarning);

    if (timeLeftSeconds <= 0) {
      setCurrentWarningMessage("Time is up! Submitting...");
    }

  }, [timeLeftSeconds, totalDurationSeconds]);


  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    const pad = (num: number) => String(num).padStart(2, '0');

    if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
    return `${pad(m)}:${pad(s)}`;
  };
  
  const getBannerVariantClasses = () => {
    if (timeLeftSeconds <= 0) return "bg-destructive text-destructive-foreground";
    if (timeLeftSeconds <= 60) return "bg-destructive text-destructive-foreground animate-pulse"; // 1 minute or less with pulse
    if (timeLeftSeconds <= 5 * 60) return "bg-yellow-500 text-black"; // 5 minutes or less
    return "bg-primary text-primary-foreground"; // Default
  }

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 p-2.5 text-white shadow-lg transition-all duration-300",
        "flex items-center justify-between text-sm font-medium",
        getBannerVariantClasses()
      )}
    >
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5" />
        <span className="font-semibold hidden sm:inline">{examTitle ? `Exam: ${examTitle}` : 'Exam In Progress'}</span>
      </div>
      <div className="flex items-center gap-2 text-center flex-grow justify-center">
        {currentWarningMessage && (
            <>
            <AlertTriangle className="h-5 w-5 shrink-0"/>
            <span className="font-semibold text-xs sm:text-sm">{currentWarningMessage}</span>
            </>
        )}
        <span className={cn("font-bold text-base tabular-nums", currentWarningMessage && "ml-2")}>
            {formatTime(timeLeftSeconds)}
        </span>
      </div>
      <Button 
        variant="destructive" 
        size="sm" 
        className="px-2 py-1 h-auto text-xs bg-white/10 hover:bg-white/20 border border-white/30"
        onClick={() => {
            if(window.confirm("Are you sure you want to end the test? This action cannot be undone.")) {
                onTimeUpRef.current(); // Treat as time up for submission
            }
        }}
        title="End Test"
      >
        <LogOut className="h-4 w-4 mr-1 sm:mr-1.5" />
        <span className="hidden sm:inline">End Test</span>
      </Button>
    </div>
  );
}
