
// src/lib/error-logging.ts
'use client';

import type { ErrorLogInsert } from '@/types/supabase';

export async function logErrorToBackend(error: any, location: string, userContext?: object) {
  try {
    let errorMessage = 'Unknown error structure';
    if (error && typeof error.message === 'string') {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else {
      errorMessage = JSON.stringify(error); // Fallback for non-standard errors
    }

    let errorName = 'UnknownError';
    if (error && typeof error.name === 'string') {
      errorName = error.name;
    }

    let errorStack: string | undefined;
    if (error && typeof error.stack === 'string') {
      errorStack = error.stack;
    }

    const isErrorConstructorValid = typeof Error === 'function';
    const isInstanceOfError = isErrorConstructorValid && error instanceof Error;

    const errorDetailsPayload = {
      name: errorName,
      stack: errorStack,
      isInstanceOfError: isInstanceOfError,
      originalMessage: isInstanceOfError ? (error as Error).message : undefined,
      rawErrorObject: isInstanceOfError ? undefined : error, // Log the raw error if not an Error instance
    };

    const payload: Omit<ErrorLogInsert, 'log_id' | 'timestamp'> = {
      location,
      error_message: errorMessage,
      error_details: errorDetailsPayload,
      user_context: userContext || null,
    };

    const response = await fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      // Log a simpler error to console if logging to backend fails, to avoid loops
      console.error(`[${location}] Failed to log error to backend API. Status: ${response.status}. Original error:`, error);
    }
  } catch (loggingError: any) {
    let loggingErrorMessage = "Critical: Exception in logErrorToBackend itself.";
    if (loggingError && typeof loggingError.message === 'string') {
        loggingErrorMessage += `: ${loggingError.message}`;
    }
    console.error(`[${location}] ${loggingErrorMessage}`, { originalError: error, loggingErrorDetails: loggingError });
  }
}
