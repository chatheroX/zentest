
// src/app/api/seb/validate-token/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Simplified local error message helper since src/lib/error-logging.ts was removed
function getLocalSafeErrorMessage(e: any, defaultMessage = "An unknown error occurred."): string {
  if (e && typeof e === 'object') {
    if (e.name === 'AbortError') {
      return "The request timed out. Please check your connection and try again.";
    }
    if (typeof e.message === 'string' && e.message.trim() !== '') {
      return e.message;
    }
    try {
      const strError = JSON.stringify(e);
      if (strError !== '{}' && strError.length > 2) return `Error object: ${strError}`;
    } catch (stringifyError) { /* Fall through */ }
  }
  if (e !== null && e !== undefined) {
    const stringifiedError = String(e);
    if (stringifiedError.trim() !== '' && stringifiedError !== '[object Object]') {
      return stringifiedError;
    }
  }
  return defaultMessage;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const initLogPrefix = '[API ValidateToken Init]';
let criticalInitError = false;
let initErrorDetails = "CRITICAL: Server environment variable(s) are missing for token validation: ";

if (!supabaseUrl) { initErrorDetails += "NEXT_PUBLIC_SUPABASE_URL "; criticalInitError = true; }
if (!supabaseServiceKey) { initErrorDetails += "SUPABASE_SERVICE_ROLE_KEY "; criticalInitError = true; }

if (criticalInitError) {
  initErrorDetails += "Please check server environment configuration.";
  console.error(`${initLogPrefix} ${initErrorDetails}`);
}

const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient<Database>(supabaseUrl, supabaseServiceKey)
  : null;

export async function GET(request: NextRequest) {
  const operationId = `[API ValidateToken GET ${Date.now().toString().slice(-5)}]`;
  console.log(`${operationId} Handler started.`);

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    const errorMsg = 'Server configuration error (JWT secret).';
    console.error(`${operationId} CRITICAL: JWT_SECRET environment variable is not defined or is empty on the server. This secret is required to validate exam session tokens. Please ensure it is set in your .env file (e.g., .env.local for development) or in your deployment environment variables, and that the server has been restarted.`);
    // Do not call logErrorToBackend here if it was removed or might also fail
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
  console.log(`${operationId} JWT_SECRET is available (length: ${jwtSecret.length}).`);

  if (!supabaseAdmin) {
    console.error(`${operationId} Supabase admin client not initialized. Check server logs for init errors. Details: ${initErrorDetails}`);
    return NextResponse.json({ error: 'Server configuration error (Supabase client).' }, { status: 500 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');
    console.log(`${operationId} Token received for validation:`, token ? token.substring(0, 20) + "..." : "UNDEFINED_OR_EMPTY");

    if (!token || typeof token !== 'string') {
      console.warn(`${operationId} Invalid or missing token in request query.`);
      return NextResponse.json({ error: 'Invalid token provided.' }, { status: 400 });
    }

    let decoded: any;
    try {
      console.log(`${operationId} Attempting to verify JWT with secret.`);
      decoded = jwt.verify(token, jwtSecret);
    } catch (jwtError: any) {
      let errorMessage = 'Invalid or malformed exam session token.';
      let errorStatus = 401;

      if (jwtError && typeof jwtError === 'object') {
        if (jwtError.name === 'TokenExpiredError') {
          errorMessage = 'Exam session token has expired.';
          console.warn(`${operationId} JWT verification failed: TokenExpiredError`);
        } else if (jwtError.name === 'JsonWebTokenError') {
          errorMessage = `Invalid token signature or payload: ${getLocalSafeErrorMessage(jwtError.message, 'Malformed token')}`;
          console.warn(`${operationId} JWT verification failed: JsonWebTokenError - ${errorMessage}`);
        } else {
          errorMessage = `Token validation error: ${getLocalSafeErrorMessage(jwtError, 'Unknown JWT error')}`;
          console.warn(`${operationId} JWT verification failed with other error: ${jwtError.name || 'Unknown error name'} - ${errorMessage}`, jwtError);
        }
      } else {
         const strError = String(jwtError);
         if (strError.trim() !== '' && strError !== '[object Object]') errorMessage = strError;
         console.warn(`${operationId} JWT verification failed with non-standard error:`, errorMessage);
      }
      return NextResponse.json({ error: errorMessage }, { status: errorStatus });
    }
    
    const { studentId, examId } = decoded;
    console.log(`${operationId} JWT decoded. StudentID: ${studentId}, ExamID: ${examId}`);

    if (!studentId || !examId) {
        const errMsg = "Token payload incomplete (missing studentId or examId).";
        console.warn(`${operationId} ${errMsg}`);
        return NextResponse.json({ error: 'Token payload incomplete.' }, { status: 400 });
    }

    // Check if student has already completed this exam
    console.log(`${operationId} Checking for prior submission for student: ${studentId}, exam: ${examId}`);
    const { data: submissionData, error: submissionError } = await supabaseAdmin
      .from('ExamSubmissionsX')
      .select('status')
      .eq('student_user_id', studentId)
      .eq('exam_id', examId)
      .eq('status', 'Completed') 
      .maybeSingle();

    if (submissionError) {
      const dbErrorMsg = getLocalSafeErrorMessage(submissionError, 'Database error checking prior submission.');
      console.error(`${operationId} Supabase error checking prior submission:`, dbErrorMsg, submissionError);
      // Do not call logErrorToBackend here
      return NextResponse.json({ error: 'Error verifying exam status: ' + dbErrorMsg }, { status: 500 });
    }

    if (submissionData) { 
      const alreadySubmittedMsg = "Exam already submitted by this student.";
      console.warn(`${operationId} ${alreadySubmittedMsg} (Exam: ${examId}, Student: ${studentId})`);
      return NextResponse.json({ error: alreadySubmittedMsg }, { status: 403 }); // Forbidden
    }

    console.log(`${operationId} Token ${token.substring(0, 10) + "..."} successfully validated. No prior completion found.`);
    return NextResponse.json({
      studentId: studentId, 
      examId: examId,
    }, { status: 200 });

  } catch (e: any) {
    const errorMessage = getLocalSafeErrorMessage(e, 'An unexpected error occurred during token validation.');
    console.error(`${operationId} General exception during token validation:`, errorMessage, e);
    // Do not call logErrorToBackend here
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
