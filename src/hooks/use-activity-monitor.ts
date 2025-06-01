
'use client';
// This hook is likely not needed for the new "Proctor System Compatibility Check" project.
// If detailed activity monitoring within SEB for the compatibility check itself is required,
// it can be adapted. For now, it's a placeholder that can be removed or simplified.

import { useEffect, useRef } from 'react';

// Simplified event types if this hook is kept for basic SEB interaction monitoring
export type BasicFlaggedEventType =
  | 'visibility_hidden'
  | 'visibility_visible'
  | 'fullscreen_exited'; // Example

export interface BasicFlaggedEvent {
  type: BasicFlaggedEventType;
  timestamp: Date;
  userId: string; // From SEB token
  details?: string;
}

interface UseBasicActivityMonitorProps {
  userId: string;
  onFlagEvent: (event: BasicFlaggedEvent) => void;
  enabled?: boolean; 
}

export function useActivityMonitor({
  userId,
  onFlagEvent,
  enabled = true,
}: UseBasicActivityMonitorProps) {
  const onFlagEventRef = useRef(onFlagEvent);

  useEffect(() => {
    onFlagEventRef.current = onFlagEvent;
  }, [onFlagEvent]);

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;

    const createEvent = (type: BasicFlaggedEventType, details?: string): BasicFlaggedEvent => ({
      type,
      timestamp: new Date(),
      userId,
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
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    console.log('[ActivityMonitor] Basic SEB interaction listeners added.');

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      console.log('[ActivityMonitor] Basic SEB interaction listeners removed.');
    };
  }, [enabled, userId]);
}
