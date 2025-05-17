
// src/app/api/seb/validate-token/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const jwtSecret = process.env.JWT_SECRET; // Server-side secret

const initLogPrefix = '[API Validate JWT Token Init]';
let missingVarsMessage = "CRITICAL: Required server environment variable(s) are missing: ";
let criticalError = false;
if (!supabaseUrl) { missingVarsMessage += "NEXT_PUBLIC_SUPABASE_URL "; criticalError = true; }
if (!supabaseServiceKey) { missingVarsMessage += "SUPABASE_SERVICE_ROLE_KEY "; criticalError = true; }
if (!jwtSecret) { missingVarsMessage += "JWT_SECRET "; criticalError = true; }

if (criticalError) {
  missingVarsMessage += "Please check server environment configuration.";
  console.error(`${initLogPrefix} ${missingVarsMessage}`);
}

const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient<Database>(supabaseUrl, supabaseServiceKey)
  : null;

export async function GET(request: NextRequest) {
  const operationId = `[API Validate JWT Token ${Date.now().toString().slice(-5)}]`;
  console.log(`${operationId} Received request.`);

  if (criticalError || !supabaseAdmin || !jwtSecret) {
    let detailedErrorForLog = "Server configuration error for token validation. ";
    if (!supabaseAdmin) detailedErrorForLog += "Supabase admin client not initialized. ";
    if (!jwtSecret) detailedErrorForLog += "JWT_SECRET (server-side) is missing. ";
    detailedErrorForLog += missingVarsMessage;
    console.error(`${operationId} ${detailedErrorForLog}`);
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
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
      decoded = jwt.verify(token, jwtSecret);
    } catch (jwtError: any) {
      let errorMessage = 'Invalid or malformed exam session token.';
      let errorStatus = 401;

      // Check error type by its 'name' property
      if (jwtError && typeof jwtError === 'object' && typeof jwtError.name === 'string') {
        if (jwtError.name === 'TokenExpiredError') {
          errorMessage = 'Exam session token has expired.';
          console.warn(`${operationId} JWT verification failed: TokenExpiredError`);
        } else if (jwtError.name === 'JsonWebTokenError') {
          errorMessage = `Invalid token: ${jwtError.message || 'Malformed token'}`;
          console.warn(`${operationId} JWT verification failed: JsonWebTokenError - ${jwtError.message}`);
        } else {
          // For other errors that might have a name and message
          errorMessage = `Token validation error: ${jwtError.message || jwtError.name}`;
          console.warn(`${operationId} JWT verification failed with other error: ${jwtError.name} - ${jwtError.message}`);
        }
      } else {
         console.warn(`${operationId} JWT verification failed with non-standard error object:`, jwtError);
      }
      return NextResponse.json({ error: errorMessage }, { status: errorStatus });
    }
    
    const { studentId, examId } = decoded;
    console.log(`${operationId} JWT decoded. StudentID: ${studentId}, ExamID: ${examId}`);

    if (!studentId || !examId) {
        console.warn(`${operationId} JWT missing studentId or examId after decoding.`);
        return NextResponse.json({ error: 'Token payload incomplete.' }, { status: 400 });
    }

    // Check if student has already completed this exam
    const { data: submissionData, error: submissionError } = await supabaseAdmin
      .from('ExamSubmissionsX')
      .select('status')
      .eq('student_user_id', studentId)
      .eq('exam_id', examId)
      .eq('status', 'Completed') 
      .maybeSingle();

    if (submissionError) {
      console.error(`${operationId} Supabase error checking prior submission for student ${studentId}, exam ${examId}:`, submissionError.message);
      return NextResponse.json({ error: 'Error verifying exam status: ' + submissionError.message }, { status: 500 });
    }

    if (submissionData) { 
      console.warn(`${operationId} Exam ${examId} already completed by student ${studentId}.`);
      return NextResponse.json({ error: 'Exam already submitted.' }, { status: 403 }); 
    }

    console.log(`${operationId} Token ${token.substring(0, 10) + "..."} successfully validated. No prior completion found.`);
    return NextResponse.json({
      studentId: studentId, 
      examId: examId,
    }, { status: 200 });

  } catch (e: any) {
    let errorMessage = 'An unexpected error occurred during token validation.';
    if (e && typeof e === 'object' && typeof e.message === 'string') {
        errorMessage = e.message;
    } else if (e) {
        errorMessage = String(e);
    }
    console.error(`${operationId} Exception during token validation:`, errorMessage, e);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
