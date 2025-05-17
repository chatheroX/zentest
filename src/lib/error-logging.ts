
// src/lib/error-logging.ts
'use client';

import type { ErrorLogInsert } from '@/types/supabase';

// Helper function to safely extract error messages
// This version strictly checks typeof before accessing properties.
export function getSafeErrorMessage(e: any, fallbackMessage = "An unknown error occurred."): string {
  if (e && typeof e === 'object') { // Ensure 'e' is an object first
    if ('name' in e && e.name === 'AbortError') { // Common for fetch timeouts
      return "The request timed out. Please check your connection and try again.";
    }
    if ('message' in e && typeof e.message === 'string' && e.message.trim() !== '') {
      return e.message;
    }
    // Try to stringify if it's an object but no recognizable message
    try {
      const strError = JSON.stringify(e);
      // Avoid returning "{}" for empty objects that couldn't be stringified meaningfully
      if (strError !== '{}' && strError.length > 2) return `Error object: ${strError}`;
    } catch (stringifyError) {
      // Fall through if stringify fails
    }
  }
  // If 'e' is not an object or object processing failed, try converting to string
  if (e !== null && e !== undefined) {
    const stringifiedError = String(e);
    if (stringifiedError.trim() !== '' && stringifiedError !== '[object Object]') { // Avoid generic object string
        return stringifiedError;
    }
  }
  return fallbackMessage;
}

export async function logErrorToBackend(error: any, location: string, userContext?: object) {
  try {
    const errorMessageForDisplay = getSafeErrorMessage(error, "Could not determine error message for logging.");

    let errorName = 'UnknownError';
    let errorStack: string | undefined;
    let originalMessageForDetails: string | undefined;
    let rawErrorObjectString: string | undefined;

    if (error && typeof error === 'object') {
      errorName = ('name' in error && typeof error.name === 'string') ? error.name : 'UnknownObjectError';
      errorStack = ('stack' in error && typeof error.stack === 'string') ? error.stack : undefined;
      originalMessageForDetails = ('message' in error && typeof error.message === 'string') ? error.message : undefined;
      
      if (!originalMessageForDetails) { // If message wasn't found, try stringifying the object.
        try {
          const tempStr = JSON.stringify(error);
          if (tempStr !== '{}' && tempStr.length > 2) rawErrorObjectString = tempStr;
        } catch { /* ignore stringify error */ }
      }
    } else if (error !== null && error !== undefined) {
      const tempStr = String(error);
      if (tempStr.trim() !== '' && tempStr !== '[object Object]') {
          rawErrorObjectString = tempStr;
          if (originalMessageForDetails === undefined) originalMessageForDetails = tempStr; // Use string as message
      }
    }
    
    // Use the message derived by getSafeErrorMessage for the main `error_message` field
    const errorDetailsPayload = {
      name: errorName,
      stack: errorStack,
      originalMessage: originalMessageForDetails, // This could be from error.message or String(error)
      rawErrorObjectString: rawErrorObjectString, // This is for anything that wasn't a clear message
    };

    const payload: Omit<ErrorLogInsert, 'log_id' | 'timestamp'> = {
      location,
      error_message: errorMessageForDisplay, // The user-friendly message
      error_details: errorDetailsPayload,
      user_context: userContext || null,
    };

    const response = await fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const responseText = await response.text().catch(() => "Could not read error response body.");
      console.error(`[${location}] Failed to log error to backend API. Status: ${response.status}. Response: ${responseText}. Original error:`, getSafeErrorMessage(error));
    }
  } catch (loggingError: any) {
    const safeLoggingErrorMessage = getSafeErrorMessage(loggingError, "Critical: Exception in logErrorToBackend itself.");
    console.error(`[${location}] ${safeLoggingErrorMessage}`, { originalErrorToLog: getSafeErrorMessage(error), loggingErrorDetails: getSafeErrorMessage(loggingError) });
  }
}
