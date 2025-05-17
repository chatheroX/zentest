
'use client';

import { ExamForm, ExamFormData } from '@/components/teacher/exam-form';
import { notFound, useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Loader2, ArrowLeft, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Exam, ExamUpdate } from '@/types/supabase'; // Use ExamUpdate
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { parseISO, isValid } from 'date-fns';

export default function EditExamPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const { user } = useAuth();
  const { toast } = useToast();

  const examId = params.examId as string;
  const [initialExamData, setInitialExamData] = useState<ExamFormData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExamToEdit = useCallback(async () => {
    if (!examId) {
      setIsLoading(false);
      notFound();
      return;
    }
    if (!user) {
      setIsLoading(false);
      setError("User not authenticated.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const { data: exam, error: fetchError } = await supabase
        .from('ExamX')
        .select('*')
        .eq('exam_id', examId)
        .eq('teacher_id', user.user_id) 
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') { 
          setError("Exam not found or you're not authorized to edit it.");
        } else {
          throw fetchError;
        }
        setInitialExamData(null);
      } else if (exam) {
        const startTimeDate = exam.start_time && isValid(parseISO(exam.start_time)) ? parseISO(exam.start_time) : null;
        const endTimeDate = exam.end_time && isValid(parseISO(exam.end_time)) ? parseISO(exam.end_time) : null;

        setInitialExamData({
          exam_id: exam.exam_id,
          title: exam.title,
          description: exam.description || '',
          duration: exam.duration,
          allowBacktracking: exam.allow_backtracking,
          questions: exam.questions || [],
          exam_code: exam.exam_code,
          // Status will always be 'Published' for editing via this form.
          // Actual live status (Ongoing, Completed) is derived, not directly edited here.
          status: 'Published', 
          startTime: startTimeDate,
          endTime: endTimeDate,
        });
      } else {
        setError("Exam not found.");
        setInitialExamData(null);
      }
    } catch (e: any) {
      console.error("Error fetching exam for editing:", e);
      setError(e.message || "Failed to load exam data.");
      setInitialExamData(null);
    } finally {
      setIsLoading(false);
    }
  }, [examId, supabase, user]);

  useEffect(() => {
    fetchExamToEdit();
  }, [fetchExamToEdit]);

  const handleUpdateExam = async (data: ExamFormData): Promise<{ success: boolean; error?: string; examId?: string }> => {
    if (!user || !initialExamData?.exam_id) {
      return { success: false, error: "User not authenticated or exam ID missing." };
    }
     if (!data.startTime || !data.endTime) {
      return { success: false, error: "Start and end times are required for published exams."};
    }

    // When updating, status might change programmatically elsewhere (e.g. to Ongoing/Completed)
    // This form primarily updates content and Published settings.
    const updatedExamData: ExamUpdate = {
      title: data.title,
      description: data.description || null,
      duration: data.duration,
      allow_backtracking: data.allowBacktracking,
      questions: data.questions,
      status: 'Published', // Keep as Published, actual status is dynamic
      start_time: data.startTime.toISOString(),
      end_time: data.endTime.toISOString(),
      updated_at: new Date().toISOString(), // Manually set updated_at
    };

    try {
      const { data: updatedExam, error: updateError } = await supabase
        .from('ExamX')
        .update(updatedExamData)
        .eq('exam_id', initialExamData.exam_id)
        .eq('teacher_id', user.user_id) 
        .select('exam_id') // only select exam_id
        .single();

      if (updateError) {
        throw updateError;
      }
      if (!updatedExam) {
         return { success: false, error: "Failed to update exam, no data returned." };
      }
      
      return { success: true, examId: updatedExam.exam_id };

    } catch (e: any) {
      console.error('Error updating exam:', e);
      return { success: false, error: e.message || "An unexpected error occurred." };
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-full py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 mt-2 text-muted-foreground">Loading exam data for editing...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 text-center py-10">
        <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-semibold">Error Loading Exam</h1>
        <p className="text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={() => router.push('/teacher/dashboard/exams')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Exams List
        </Button>
      </div>
    );
  }
  
  if (!initialExamData) {
     return ( 
       <div className="space-y-6 text-center py-10">
         <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
         <h1 className="text-2xl font-semibold">Exam Not Found</h1>
         <p className="text-muted-foreground">The exam could not be loaded for editing.</p>
         <Button variant="outline" onClick={() => router.push('/teacher/dashboard/exams')}>
           <ArrowLeft className="mr-2 h-4 w-4" /> Back to Exams List
         </Button>
       </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>
      <ExamForm initialData={initialExamData} onSave={handleUpdateExam} isEditing={true} />
    </div>
  );
}
