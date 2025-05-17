
// src/lib/error-logging.ts
'use client';

import type { ErrorLogInsert } from '@/types/supabase';

// Helper function to safely extract error messages
export function getSafeErrorMessage(e: any, fallbackMessage = "An unknown error occurred."): string {
  if (e && typeof e === 'object') {
    if (e.name === 'AbortError') { // Common for fetch timeouts
      return "The request timed out. Please check your connection and try again.";
    }
    if (typeof e.message === 'string' && e.message.trim() !== '') {
      return e.message;
    }
    // Try to stringify if it's an object but no message, or message is empty
    try {
      const strError = JSON.stringify(e);
      if (strError !== '{}') return `Error object: ${strError}`;
    } catch (stringifyError) {
      // Fall through if stringify fails
    }
  }
  if (e !== null && e !== undefined && String(e).trim() !== '') {
    return String(e);
  }
  return fallbackMessage;
}

export async function logErrorToBackend(error: any, location: string, userContext?: object) {
  try {
    const errorMessage = getSafeErrorMessage(error, "Could not determine error message for logging.");

    let errorName = 'UnknownError';
    let errorStack: string | undefined;
    let originalMessageForDetails: string | undefined;

    if (error && typeof error === 'object') {
      if (typeof error.name === 'string') {
        errorName = error.name;
      }
      if (typeof error.stack === 'string') {
        errorStack = error.stack;
      }
      if (typeof error.message === 'string') {
        originalMessageForDetails = error.message;
      }
    }

    const errorDetailsPayload = {
      name: errorName,
      stack: errorStack,
      originalMessage: originalMessageForDetails,
      rawErrorObjectString: !(error && typeof error === 'object' && typeof error.message === 'string') ? String(error) : undefined,
    };

    const payload: Omit<ErrorLogInsert, 'log_id' | 'timestamp'> = {
      location,
      error_message: errorMessage, // Use the safely extracted message
      error_details: errorDetailsPayload,
      user_context: userContext || null,
    };

    const response = await fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`[${location}] Failed to log error to backend API. Status: ${response.status}. Original error:`, getSafeErrorMessage(error));
    }
  } catch (loggingError: any) {
    const safeLoggingErrorMessage = getSafeErrorMessage(loggingError, "Critical: Exception in logErrorToBackend itself.");
    console.error(`[${location}] ${safeLoggingErrorMessage}`, { originalError: getSafeErrorMessage(error), loggingErrorDetails: getSafeErrorMessage(loggingError) });
  }
}
