
// src/lib/error-logging.ts
'use client';

import type { ErrorLogInsert } from '@/types/supabase';

// Updated getSafeErrorMessage to strictly follow the robust pattern
export function getSafeErrorMessage(e: any, fallbackMessage = "An unknown error occurred."): string {
  if (e && typeof e === 'object') {
    // Handle specific known error names first
    if (e.name === 'AbortError') { // Common for fetch timeouts
      return "The request timed out. Please check your connection and try again.";
    }
    // Potentially add other specific e.name checks here if needed, e.g.:
    // if (e.name === 'TokenExpiredError') return "Token has expired.";
    // if (e.name === 'JsonWebTokenError') return "Invalid token format.";
    // if (e.name === 'OperationError') return "An operation error occurred.";

    // If it's an object and has a message property, use that.
    if (typeof e.message === 'string' && e.message.trim() !== '') {
      return e.message;
    }

    // If no specific name or message, try to stringify the object
    try {
      const strError = JSON.stringify(e);
      // Avoid returning "{}" for empty objects or very short meaningless strings
      if (strError !== '{}' && strError.length > 2) return `Error object: ${strError}`;
    } catch (stringifyError) {
      // Fall through if stringify fails
    }
  }
  // If 'e' is not an object (or object processing failed), try converting to string
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
    const errorMessageForDisplay = getSafeErrorMessage(error, `Logged error at ${location} but could not determine specific message.`);

    let errorName = 'UnknownError';
    let errorStack: string | undefined;
    let originalMessageForDetails: string | undefined; // This would be the raw message if available
    let rawErrorObjectString: string | undefined;

    if (error && typeof error === 'object') {
      if (typeof error.name === 'string' && error.name.trim() !== '') errorName = error.name;
      if (typeof error.stack === 'string') errorStack = error.stack;
      if (typeof error.message === 'string' && error.message.trim() !== '') originalMessageForDetails = error.message;
      
      // If no distinct message, and it's an object, try to stringify it.
      if (!originalMessageForDetails && !errorStack) { // Only stringify if no other useful info
        try {
          const tempStr = JSON.stringify(error);
          if (tempStr !== '{}' && tempStr.length > 2) rawErrorObjectString = tempStr;
        } catch { /* ignore stringify error */ }
      }
    } else if (error !== null && error !== undefined) { // If not an object but has a value
      const tempStr = String(error);
      if (tempStr.trim() !== '' && tempStr !== '[object Object]') {
          rawErrorObjectString = tempStr;
          if (originalMessageForDetails === undefined) originalMessageForDetails = tempStr;
      }
    }
    
    const errorDetailsPayload = {
      name: errorName,
      stack: errorStack,
      originalMessage: originalMessageForDetails, // The most direct message we could get
      rawErrorObjectString: rawErrorObjectString, // For anything else
    };

    const payload: Omit<ErrorLogInsert, 'log_id' | 'timestamp'> = {
      location,
      error_message: errorMessageForDisplay, // The user-friendly or best-effort extracted message
      error_details: errorDetailsPayload,
      user_context: userContext || null,
    };

    const response = await fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const responseText = await response.text().catch(() => "Could not read error response body from /api/log.");
      console.error(`[${location}] Failed to log error to backend API. Status: ${response.status}. Response: ${responseText}. Original error:`, getSafeErrorMessage(error));
    }
  } catch (loggingError: any) {
    // Use the robust getSafeErrorMessage for the loggingError itself
    const safeLoggingErrorMessage = getSafeErrorMessage(loggingError, "Critical: Exception in logErrorToBackend itself.");
    console.error(`[${location}] ${safeLoggingErrorMessage}`, { originalErrorToLog: getSafeErrorMessage(error), loggingErrorDetails: getSafeErrorMessage(loggingError, "Could not stringify logging error details.") });
  }
}
