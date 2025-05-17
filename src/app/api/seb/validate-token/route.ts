// src/app/api/seb/validate-token/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Local safe error message getter since error-logging.ts was removed
function getLocalSafeErrorMessage(e: any, defaultMessage = "An unknown error occurred."): string {
  const prefix = "[API ValidateToken getLocalSafeErrorMessage]";
  console.log(prefix, "Processing error:", e);
  if (e && typeof e === 'object') {
    if (e.name === 'AbortError') { // Common for fetch timeouts
      console.log(prefix, "Identified AbortError.");
      return "The request timed out. Please check your connection and try again.";
    }
    if (typeof e.message === 'string' && e.message.trim() !== '') {
      console.log(prefix, "Using e.message:", e.message);
      return e.message;
    }
    try {
      const strError = JSON.stringify(e);
      if (strError !== '{}' && strError.length > 2) {
        console.log(prefix, "Using stringified error:", strError);
        return `Error details: ${strError}`;
      }
    } catch (stringifyError) {
      console.warn(prefix, "Could not stringify error object:", stringifyError);
    }
  }
  if (e !== null && e !== undefined) {
    const stringifiedError = String(e);
    console.log(prefix, "Using String(e):", stringifiedError);
    if (stringifiedError.trim() !== '' && stringifiedError !== '[object Object]') {
      return stringifiedError;
    }
  }
  console.log(prefix, "Falling back to default message:", defaultMessage);
  return defaultMessage;
}


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const jwtSecret = process.env.JWT_SECRET;

const initLogPrefix = '[API ValidateToken Init]';
if (!supabaseUrl || !supabaseServiceKey || !jwtSecret) {
  let missingVarsMessage = "CRITICAL: Required server environment variable(s) are missing for token validation: ";
  if (!supabaseUrl) missingVarsMessage += "NEXT_PUBLIC_SUPABASE_URL ";
  if (!supabaseServiceKey) missingVarsMessage += "SUPABASE_SERVICE_ROLE_KEY ";
  if (!jwtSecret) missingVarsMessage += "JWT_SECRET ";
  missingVarsMessage += "Please check server environment configuration.";
  console.error(`${initLogPrefix} ${missingVarsMessage}`);
  // This error occurs at module load time, so requests to this endpoint will fail until fixed.
}

const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient<Database>(supabaseUrl, supabaseServiceKey)
  : null;

export async function GET(request: NextRequest) {
  const operationId = `[API ValidateToken GET ${Date.now().toString().slice(-5)}]`;
  console.log(`${operationId} Received request.`);

  if (!supabaseAdmin) {
    console.error(`${operationId} Supabase admin client not initialized. Check server logs for init errors.`);
    return NextResponse.json({ error: 'Server configuration error (Supabase client).' }, { status: 500 });
  }
  if (!jwtSecret) {
    console.error(`${operationId} JWT_SECRET is not configured on the server.`);
    return NextResponse.json({ error: 'Server configuration error (JWT secret).' }, { status: 500 });
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
      console.log(`${operationId} Attempting to verify JWT with secret (length: ${jwtSecret.length}).`);
      decoded = jwt.verify(token, jwtSecret);
    } catch (jwtError: any) {
      let errorMessage = 'Invalid or malformed exam session token.';
      let errorStatus = 401; // Unauthorized

      // Check error.name for specific JWT errors
      if (jwtError && typeof jwtError === 'object') {
        if (jwtError.name === 'TokenExpiredError') {
          errorMessage = 'Exam session token has expired.';
          console.warn(`${operationId} JWT verification failed: TokenExpiredError`);
        } else if (jwtError.name === 'JsonWebTokenError') {
          errorMessage = `Invalid token signature or payload: ${getLocalSafeErrorMessage(jwtError.message, 'Malformed token')}`;
          console.warn(`${operationId} JWT verification failed: JsonWebTokenError - ${errorMessage}`);
        } else {
          // For other errors that might not have a 'name' or are unexpected
          errorMessage = `Token validation error: ${getLocalSafeErrorMessage(jwtError, 'Unknown JWT error')}`;
          console.warn(`${operationId} JWT verification failed with other error: ${jwtError.name || 'Unknown error name'} - ${errorMessage}`, jwtError);
        }
      } else if (jwtError) { // If jwtError is not a typical error object
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
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
