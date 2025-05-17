
'use client';

import { ExamForm, ExamFormData } from '@/components/teacher/exam-form';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { ExamInsert } from '@/types/supabase'; // Use ExamInsert type
import { useMemo } from 'react'; // Import useMemo

const generateExamCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Define defaultFormData outside the component or memoize it
const defaultFormDataObject: ExamFormData = {
  title: '',
  description: '',
  duration: 60,
  allowBacktracking: true,
  questions: [],
  startTime: null,
  endTime: null,
  status: 'Published', // All exams created via form are initially 'Published'
};

export default function CreateExamPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const supabase = createSupabaseBrowserClient();

  // Memoize defaultFormData to ensure stable reference
  const defaultFormData = useMemo(() => defaultFormDataObject, []);

  const handleCreateExam = async (data: ExamFormData): Promise<{ success: boolean; error?: string; examId?: string }> => {
    if (!user || user.role !== 'teacher') {
      return { success: false, error: "You must be logged in as a teacher to create exams." };
    }
    if (!data.startTime || !data.endTime) {
      return { success: false, error: "Start and end times are required for published exams."};
    }
    if (data.startTime >= data.endTime) {
      return { success: false, error: "End time must be after start time." };
    }
    if (data.questions.length === 0) {
      return { success: false, error: "Please add at least one question to the exam." };
    }

    const newExamData: ExamInsert = {
      teacher_id: user.user_id,
      title: data.title,
      description: data.description || null,
      duration: data.duration,
      allow_backtracking: data.allowBacktracking,
      questions: data.questions,
      exam_code: generateExamCode(), // Initial generation
      status: 'Published',
      start_time: data.startTime.toISOString(),
      end_time: data.endTime.toISOString(),
    };

    try {
      let insertedExamId: string | undefined = undefined;
      let attemptError: any = null;

      // Retry mechanism for unique exam_code
      for (let i = 0; i < 3; i++) { 
        const { data: attemptData, error: dbError } = await supabase
          .from('ExamX')
          .insert(newExamData)
          .select('exam_id')
          .single();
        
        if (dbError) {
          attemptError = dbError;
          if (dbError.code === '23505' && dbError.message.includes('ExamX_exam_code_key')) {
            console.warn('Exam code collision, generating new code and retrying...');
            newExamData.exam_code = generateExamCode(); // Generate new code
            continue; // Retry insertion
          }
          // For other errors, break and handle below
          break; 
        }
        // Success
        insertedExamId = attemptData?.exam_id;
        attemptError = null; // Clear error if successful
        break; // Exit loop on success
      }

      if (attemptError) {
        console.error('Error creating exam after retries (if any):', attemptError);
        // Specific message for unique constraint failure after retries
        if (attemptError.code === '23505' && attemptError.message.includes('ExamX_exam_code_key')) {
             return { success: false, error: "Failed to generate a unique exam code after multiple attempts. Please try again." };
        }
        // General error message
        return { success: false, error: attemptError.message || "Failed to create exam."};
      }

      if (!insertedExamId) {
        // This case should ideally be caught by attemptError handling above
        return { success: false, error: "Failed to create exam, no exam ID returned after insert attempt." };
      }
      
      return { success: true, examId: insertedExamId };

    } catch (e: any) {
      // Catch any unexpected errors not handled by Supabase client's error object
      console.error('Unexpected error during exam creation process:', e);
      return { success: false, error: e.message || "An unexpected error occurred during exam creation." };
    }
  };

  return (
    <div className="space-y-6">
      <ExamForm initialData={defaultFormData} onSave={handleCreateExam} />
    </div>
  );
}
