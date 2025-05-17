
// src/app/api/seb/submit-exam/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database, ExamSubmissionInsert } from '@/types/supabase';
import { getSafeErrorMessage } from '@/lib/error-logging'; // Import helper

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const initLogPrefix = '[API SubmitExam Init]';
console.log(`${initLogPrefix} NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? supabaseUrl.substring(0, 20) + '...' : 'NOT SET'}`);
console.log(`${initLogPrefix} SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? 'SET (value hidden)' : 'NOT SET'}`);

if (!supabaseUrl || !supabaseServiceKey) {
  let missingVarsMessage = "CRITICAL: Required Supabase environment variable(s) are missing: ";
  if (!supabaseUrl) missingVarsMessage += "NEXT_PUBLIC_SUPABASE_URL ";
  if (!supabaseServiceKey) missingVarsMessage += "SUPABASE_SERVICE_ROLE_KEY ";
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
      console.warn(`${operationId} Missing exam_id or student_user_id in submission.`);
      return NextResponse.json({ error: 'Missing exam ID or student ID.' }, { status: 400 });
    }

    const dataToUpsert: ExamSubmissionInsert = {
      exam_id: submissionData.exam_id,
      student_user_id: submissionData.student_user_id,
      answers: submissionData.answers || null,
      status: submissionData.status || 'Completed', 
      submitted_at: submissionData.submitted_at || new Date().toISOString(),
      flagged_events: submissionData.flagged_events || null,
      // score would be calculated later or set if it's self-graded for some types
      // started_at should have been set when the exam was initiated by SebLiveTestClient
      // If we need to ensure started_at, we might need to fetch the "In Progress" record first or adjust upsert.
      // For simplicity, assuming started_at is set. If not, a direct update is needed.
      started_at: new Date().toISOString(), // Placeholder if not passed, ideally it's from an earlier 'In Progress' record
    };
    
    console.log(`${operationId} Attempting to upsert submission for student: ${submissionData.student_user_id}, exam: ${submissionData.exam_id}`);

    const { data, error } = await supabaseAdmin
      .from('ExamSubmissionsX')
      .upsert(dataToUpsert, {
        onConflict: 'exam_id, student_user_id',
      })
      .select()
      .single();

    if (error) {
      console.error(`${operationId} Supabase error during submission upsert:`, error);
      return NextResponse.json({ error: 'Failed to save exam submission: ' + error.message }, { status: 500 });
    }
    
    console.log(`${operationId} Submission successful for student: ${submissionData.student_user_id}, exam: ${submissionData.exam_id}, Result:`, data);
    return NextResponse.json({ message: 'Exam submitted successfully.', submission_id: data?.submission_id }, { status: 200 });

  } catch (e: any) {
    const errorMessage = getSafeErrorMessage(e, 'An unexpected error occurred during submission.');
    console.error(`${operationId} Exception:`, errorMessage, e);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
