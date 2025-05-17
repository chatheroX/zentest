
// src/app/api/seb/submit-exam/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database, ExamSubmissionInsert } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("CRITICAL: Supabase URL or Service Key missing for exam submission API.");
}
const supabaseAdmin = supabaseUrl && supabaseServiceKey 
  ? createClient<Database>(supabaseUrl, supabaseServiceKey) 
  : null;

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error for submission.' }, { status: 500 });
  }

  try {
    const submissionData = (await request.json()) as Omit<ExamSubmissionInsert, 'submission_id' | 'started_at'>;

    if (!submissionData.exam_id || !submissionData.student_user_id) {
      return NextResponse.json({ error: 'Missing exam ID or student ID.' }, { status: 400 });
    }

    const dataToUpsert: ExamSubmissionInsert = {
      exam_id: submissionData.exam_id,
      student_user_id: submissionData.student_user_id,
      answers: submissionData.answers || null,
      status: submissionData.status || 'Completed', // Ensure status is set
      submitted_at: submissionData.submitted_at || new Date().toISOString(),
      flagged_events: submissionData.flagged_events || null,
      // score would be calculated later or set if it's self-graded for some types
    };
    
    console.log('[API Submit Exam] Attempting to upsert submission for student:', submissionData.student_user_id, 'exam:', submissionData.exam_id);

    // Upsert into ExamSubmissionsX table
    // Using exam_id and student_user_id as conflict target to update if "In Progress" record exists
    const { data, error } = await supabaseAdmin
      .from('ExamSubmissionsX')
      .upsert(dataToUpsert, {
        onConflict: 'exam_id, student_user_id', // Assumes you have a unique constraint on these two
        // ignoreDuplicates: false, // Default is true, which means update if conflict, insert if not. Set to false for explicit update.
      })
      .select()
      .single();

    if (error) {
      console.error('[API Submit Exam] Supabase error during submission upsert:', error);
      return NextResponse.json({ error: 'Failed to save exam submission: ' + error.message }, { status: 500 });
    }
    
    console.log('[API Submit Exam] Submission successful for student:', submissionData.student_user_id, 'exam:', submissionData.exam_id, 'Result:', data);
    return NextResponse.json({ message: 'Exam submitted successfully.', submission_id: data?.submission_id }, { status: 200 });

  } catch (e: any) {
    console.error('[API Submit Exam] Exception:', e.message, e);
    return NextResponse.json({ error: 'An unexpected error occurred during submission.' }, { status: 500 });
  }
}
