
'use client';

import { useEffect, useRef } from 'react';
import type { FlaggedEvent, FlaggedEventType } from '@/types/supabase';

interface UseActivityMonitorProps {
  studentId: string; 
  examId: string;
  onFlagEvent: (event: FlaggedEvent) => void;
  enabled?: boolean; 
}

export function useActivityMonitor({
  studentId,
  examId,
  onFlagEvent,
  enabled = true,
}: UseActivityMonitorProps) {
  const onFlagEventRef = useRef(onFlagEvent);

  useEffect(() => {
    onFlagEventRef.current = onFlagEvent;
  }, [onFlagEvent]);

  useEffect(() => {
    if (!enabled) return;

    const createEvent = (type: FlaggedEventType, details?: string): FlaggedEvent => ({
      type,
      timestamp: new Date(),
      studentId,
      examId,
      details,
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        onFlagEventRef.current(createEvent('visibility_hidden'));
      } else {
        onFlagEventRef.current(createEvent('visibility_visible'));
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        onFlagEventRef.current(createEvent('fullscreen_exited'));
      } else {
        onFlagEventRef.current(createEvent('fullscreen_entered'));
      }
    };
    
    const handleBlur = () => {
      onFlagEventRef.current(createEvent('blur', "Window lost focus"));
    };

    const handleFocus = () => {
      onFlagEventRef.current(createEvent('focus', "Window gained focus"));
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    if (document.fullscreenElement) {
        onFlagEventRef.current(createEvent('fullscreen_entered', "Initial state: fullscreen"));
    }


    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [enabled, studentId, examId]);
}
