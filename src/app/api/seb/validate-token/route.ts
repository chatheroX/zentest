
// src/app/api/seb/validate-token/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import type { Database, CustomUser } from '@/types/supabase';

// Local helper for safe error message extraction
function getLocalSafeErrorMessage(e: any, defaultMessage = "An unknown error occurred."): string {
  if (e && typeof e === 'object') {
    if (e.name === 'AbortError') {
      return "The request timed out.";
    } else if (e.name === 'TokenExpiredError') {
      return "Exam session token has expired.";
    } else if (e.name === 'JsonWebTokenError') {
      return "Invalid or malformed exam session token.";
    } else if (typeof e.message === 'string' && e.message.trim() !== '') {
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

  // Changed from NEXT_PUBLIC_JWT_SECRET to JWT_SECRET
  const jwtSecret = process.env.JWT_SECRET; 

  if (!jwtSecret) {
    const errorMsg = 'Server configuration error (JWT secret). Ensure JWT_SECRET is set.';
    console.error(`${operationId} CRITICAL: JWT_SECRET environment variable is not defined or is empty on the server. This secret is required to validate exam session tokens. Please ensure it is set in your .env file or deployment environment variables, and that the server has been restarted.`);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
  console.log(`${operationId} JWT_SECRET is available for validation (length: ${jwtSecret.length}).`);

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
      const errorMessage = getLocalSafeErrorMessage(jwtError, 'Token validation failed.');
      console.warn(`${operationId} JWT verification failed:`, errorMessage, jwtError);
      return NextResponse.json({ error: errorMessage }, { status: 401 });
    }
    
    // Renamed 'links' from token to 'sessionSpecificLinks' for clarity
    const { studentId, examId, sessionSpecificLinks } = decoded; 
    console.log(`${operationId} JWT decoded. StudentID: ${studentId}, ExamID: ${examId}, SessionSpecificLinks:`, sessionSpecificLinks);

    if (!studentId || !examId) {
        const errMsg = "Token payload incomplete (missing studentId or examId).";
        console.warn(`${operationId} ${errMsg}`);
        return NextResponse.json({ error: 'Token payload incomplete.' }, { status: 400 });
    }

    let validSessionSpecificLinks: string[] = [];
    if (sessionSpecificLinks) {
        if (Array.isArray(sessionSpecificLinks) && sessionSpecificLinks.every(l => typeof l === 'string')) {
            validSessionSpecificLinks = sessionSpecificLinks;
        } else {
            console.warn(`${operationId} Invalid 'sessionSpecificLinks' format in token payload. Expected array of strings. Received:`, sessionSpecificLinks);
        }
    }

    console.log(`${operationId} Fetching user profile for student: ${studentId} to get profile-level saved links.`);
    const { data: userProfile, error: profileError } = await supabaseAdmin
        .from('proctorX')
        .select('saved_links')
        .eq('user_id', studentId)
        .single();

    if (profileError) {
        const profileDbErrorMsg = getLocalSafeErrorMessage(profileError, 'Database error fetching user profile links.');
        console.error(`${operationId} Supabase error fetching user profile links:`, profileDbErrorMsg, profileError);
        // Proceed without profile links, or return error if critical. For now, proceed.
    }
    const profileSavedLinks: string[] = userProfile?.saved_links || [];
    console.log(`${operationId} Profile-level saved links fetched for student ${studentId}:`, profileSavedLinks);


    console.log(`${operationId} Checking for prior submission for student: ${studentId}, exam: ${examId}`);
    const { data: submissionData, error: submissionError } = await supabaseAdmin
      .from('ExamSubmissionsX')
      .select('status') 
      .eq('student_user_id', studentId)
      .eq('exam_id', examId)
      .maybeSingle();

    if (submissionError) {
      const dbErrorMsg = getLocalSafeErrorMessage(submissionError, 'Database error checking prior submission.');
      console.error(`${operationId} Supabase error checking prior submission:`, dbErrorMsg, submissionError);
      return NextResponse.json({ error: 'Error verifying exam status: ' + dbErrorMsg }, { status: 500 });
    }

    const isAlreadyCompleted = submissionData?.status === 'Completed';

    if (isAlreadyCompleted) { 
      console.warn(`${operationId} Exam already completed by this student. (Exam: ${examId}, Student: ${studentId}).`);
    } else if (submissionData?.status === 'In Progress') {
      console.log(`${operationId} Exam 'In Progress' for student ${studentId}, exam ${examId}. Re-entry allowed.`);
    }
    
    console.log(`${operationId} Token ${token.substring(0, 10) + "..."} successfully validated. isAlreadyCompleted: ${isAlreadyCompleted}`);
    return NextResponse.json({
      studentId: studentId, 
      examId: examId,
      isAlreadySubmitted: isAlreadyCompleted, 
      sessionSpecificLinks: validSessionSpecificLinks, 
      profileSavedLinks: profileSavedLinks, 
    }, { status: 200 });

  } catch (e: any) {
    const errorMessage = getLocalSafeErrorMessage(e, 'An unexpected error occurred during token validation.');
    console.error(`${operationId} General exception during token validation:`, errorMessage, e);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
