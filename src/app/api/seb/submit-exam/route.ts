
// src/app/api/seb/submit-exam/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database, ExamSubmissionInsert } from '@/types/supabase';

// Helper to get a safe error message (could be moved to a shared util if used elsewhere)
function getSafeErrorMessage(e: any, fallbackMessage = "An unknown error occurred."): string {
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
    return fallbackMessage;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const initLogPrefix = '[API SubmitExam Init]';
let missingVarsMessage = "CRITICAL: Required Supabase environment variable(s) are missing: ";
let criticalError = false;

if (!supabaseUrl) { missingVarsMessage += "NEXT_PUBLIC_SUPABASE_URL "; criticalError = true; }
if (!supabaseServiceKey) { missingVarsMessage += "SUPABASE_SERVICE_ROLE_KEY "; criticalError = true; }

if (criticalError) {
  missingVarsMessage += "Please check server environment configuration.";
  console.error(`${initLogPrefix} ${missingVarsMessage}`);
}

const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient<Database>(supabaseUrl, supabaseServiceKey)
  : null;

export async function POST(request: NextRequest) {
  const operationId = `[API SubmitExam POST ${Date.now().toString().slice(-5)}]`;
  if (!supabaseAdmin) {
    let detailedErrorForLog = "Supabase admin client not initialized for submission. ";
    if (!supabaseUrl) detailedErrorForLog += "NEXT_PUBLIC_SUPABASE_URL is missing. ";
    if (!supabaseServiceKey) detailedErrorForLog += "SUPABASE_SERVICE_ROLE_KEY is missing. ";
    detailedErrorForLog += "Check server environment variables.";
    console.error(`${operationId} ${detailedErrorForLog}`);
    return NextResponse.json({ error: 'Server configuration error for submission.' }, { status: 500 });
  }

  try {
    const submissionData = (await request.json()) as Omit<ExamSubmissionInsert, 'submission_id' | 'started_at'>;

    if (!submissionData.exam_id || !submissionData.student_user_id) {
      const errMsg = "Missing exam_id or student_user_id in submission.";
      console.warn(`${operationId} ${errMsg} Data:`, submissionData);
      return NextResponse.json({ error: 'Missing exam ID or student ID.' }, { status: 400 });
    }

    const dataToUpsert: ExamSubmissionInsert = {
      exam_id: submissionData.exam_id,
      student_user_id: submissionData.student_user_id,
      answers: submissionData.answers || null,
      status: submissionData.status || 'Completed', 
      submitted_at: submissionData.submitted_at || new Date().toISOString(),
      flagged_events: submissionData.flagged_events || null,
      started_at: submissionData.started_at || new Date().toISOString(), // Best guess if not provided
    };
    
    console.log(`${operationId} Attempting to upsert submission for student: ${submissionData.student_user_id}, exam: ${submissionData.exam_id}`);

    const { data, error } = await supabaseAdmin
      .from('ExamSubmissionsX')
      .upsert(dataToUpsert, {
        onConflict: 'exam_id, student_user_id', // Ensure this unique constraint exists
      })
      .select()
      .single();

    if (error) {
      const upsertErrorMsg = getSafeErrorMessage(error, 'Supabase upsert failed.');
      console.error(`${operationId} Supabase error during submission upsert:`, upsertErrorMsg, error);
      return NextResponse.json({ error: 'Failed to save exam submission: ' + upsertErrorMsg }, { status: 500 });
    }
    
    console.log(`${operationId} Submission successful for student: ${submissionData.student_user_id}, exam: ${submissionData.exam_id}, Result:`, data);
    return NextResponse.json({ message: 'Exam submitted successfully.', submission_id: data?.submission_id }, { status: 200 });

  } catch (e: any) {
    const errorMessage = getSafeErrorMessage(e, 'An unexpected error occurred during submission.');
    console.error(`${operationId} Exception:`, errorMessage, e);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
