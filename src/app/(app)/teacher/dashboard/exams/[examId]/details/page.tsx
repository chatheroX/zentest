
'use client';

import { useParams, notFound, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Share2, Trash2, Clock, CheckSquare, ListChecks, Copy, Loader2, AlertTriangle, Users2, CalendarClock, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Exam, Question, ExamStatus } from '@/types/supabase';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Link from 'next/link';
import { format, parseISO, isBefore, isAfter, isValid, type Duration } from 'date-fns';


export const getEffectiveExamStatus = (exam: Exam | null | undefined, currentTime?: Date): ExamStatus => {
  if (!exam) { // Removed !exam.status as status is now mandatory
    return 'Published'; // Default or handle as error if exam is totally null
  }

  const now = currentTime || new Date(); // Use provided current time or system current time

  // If already Completed in DB, it's Completed.
  if (exam.status === 'Completed') return 'Completed';

  // For 'Published' or 'Ongoing' exams, timings are crucial.
  if (exam.status === 'Published' || exam.status === 'Ongoing') {
    if (!exam.start_time || !exam.end_time) {
      // This case should ideally not happen for 'Published' exams per form validation.
      // If it does, treat as 'Published' (effectively upcoming/needs proper scheduling).
      console.warn(`Exam ${exam.exam_id} is ${exam.status} but missing start/end times.`);
      return 'Published'; 
    }
    const startTime = parseISO(exam.start_time);
    const endTime = parseISO(exam.end_time);

    if (!isValid(startTime) || !isValid(endTime)) {
      console.warn(`Exam ${exam.exam_id} has invalid start/end times.`);
      return 'Published'; // Invalid dates, treat as not yet properly scheduled
    }

    if (isAfter(now, endTime)) return 'Completed'; 
    if (isAfter(now, startTime) && isBefore(now, endTime)) return 'Ongoing'; 
    if (isBefore(now, startTime)) return 'Published'; // Effectively 'Upcoming'
  }
  
  // Fallback to database status if none of the above conditions met (e.g. for any new statuses)
  // Or if it's 'Published' but start time hasn't arrived and end time hasn't passed.
  return exam.status as ExamStatus; 
};


export default function ExamDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createSupabaseBrowserClient();
  const examId = params.examId as string;

  const [exam, setExam] = useState<Exam | null>(null);
  const [effectiveStatus, setEffectiveStatus] = useState<ExamStatus>('Published');
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchExamDetails = useCallback(async () => {
    if (!examId) {
      setIsLoading(false);
      notFound();
      return;
    }
    setIsLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('ExamX')
        .select('*, teacher_id') 
        .eq('exam_id', examId)
        .single();

      if (fetchError) throw fetchError;
      setExam(data);
      if (data) {
        setEffectiveStatus(getEffectiveExamStatus(data));
      } else {
        notFound();
      }
    } catch (error: any) {
      toast({ title: "Error", description: `Failed to fetch exam details: ${error.message}`, variant: "destructive" });
      setExam(null);
    } finally {
      setIsLoading(false);
    }
  }, [examId, supabase, toast]);

  useEffect(() => {
    fetchExamDetails();
  }, [fetchExamDetails]);

  useEffect(() => {
    if (exam) {
      const interval = setInterval(() => {
        const newEffectiveStatus = getEffectiveExamStatus(exam);
        if (newEffectiveStatus !== effectiveStatus) {
          setEffectiveStatus(newEffectiveStatus);
        }
      }, 30000); // Check every 30 seconds for more responsive status updates

      const handleFocus = () => {
         const newEffectiveStatus = getEffectiveExamStatus(exam);
         if (newEffectiveStatus !== effectiveStatus) {
            setEffectiveStatus(newEffectiveStatus);
         }
      };
      window.addEventListener('focus', handleFocus);

      return () => {
        clearInterval(interval);
        window.removeEventListener('focus', handleFocus);
      };
    }
  }, [exam, effectiveStatus]); 


  const copyExamCode = () => {
    if (exam?.exam_code) {
      navigator.clipboard.writeText(exam.exam_code).then(() => {
        toast({ description: `Exam code "${exam.exam_code}" copied to clipboard!` });
      }).catch(err => {
        toast({ description: "Failed to copy code.", variant: "destructive" });
      });
    }
  };

  const handleDeleteExam = async () => {
    if (!exam) return;
    setIsDeleting(true);
    try {
      const { error: deleteError } = await supabase
        .from('ExamX')
        .delete()
        .eq('exam_id', exam.exam_id);
      if (deleteError) throw deleteError;
      toast({ title: "Exam Deleted", description: `Exam "${exam.title}" has been deleted successfully.` });
      router.push('/teacher/dashboard/exams');
    } catch (error: any) {
      toast({ title: "Error", description: `Failed to delete exam: ${error.message}`, variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const getStatusBadgeVariant = (status: ExamStatus) => {
    switch (status) {
      case 'Published': return 'default'; 
      case 'Ongoing': return 'destructive'; 
      case 'Completed': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusBadgeClass = (status: ExamStatus) => {
     switch (status) {
      case 'Published': return 'bg-blue-500 hover:bg-blue-600 text-white'; 
      case 'Ongoing': return 'bg-yellow-500 hover:bg-yellow-600 text-black';
      case 'Completed': return 'bg-green-500 hover:bg-green-600 text-white';
      default: return '';
    }
  }

  const formatDateTime = (isoString: string | null | undefined) => {
    if (!isoString) return 'Not set';
    try {
      const date = parseISO(isoString);
      if (!isValid(date)) return 'Invalid Date';
      return format(date, "MMM d, yyyy, hh:mm a");
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid Date";
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading exam details...</p>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="space-y-6 text-center py-10">
        <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-semibold">Exam Not Found</h1>
        <p className="text-muted-foreground">The exam details could not be loaded. It might have been deleted or the ID is incorrect.</p>
        <Button variant="outline" onClick={() => router.push('/teacher/dashboard/exams')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Exams List
        </Button>
      </div>
    );
  }

  const questionsList = exam.questions || [];
  const isShareable = effectiveStatus !== 'Completed';


  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => router.push('/teacher/dashboard/exams')} className="mb-4 btn-outline-subtle">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Exams List
      </Button>

      <Card className="shadow-xl modern-card">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-3xl text-foreground">{exam.title}</CardTitle>
              <CardDescription className="mt-1 text-muted-foreground">{exam.description || "No description provided."}</CardDescription>
            </div>
            <Badge
              variant={getStatusBadgeVariant(effectiveStatus)}
              className={`text-sm px-3 py-1 ${getStatusBadgeClass(effectiveStatus)}`}
            >
              Status: {effectiveStatus}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4 border border-border/30 rounded-lg bg-background/50">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Exam Code</Label>
              <div className="flex items-center gap-2">
                <p className="text-lg font-semibold text-primary">{exam.exam_code}</p>
                <Button variant="ghost" size="icon" onClick={copyExamCode} className="h-7 w-7 text-muted-foreground hover:text-primary">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Clock className="h-4 w-4" /> Duration</Label>
              <p className="text-lg font-semibold text-foreground">{exam.duration} minutes</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1"><CheckSquare className="h-4 w-4" /> Backtracking</Label>
              <p className="text-lg font-semibold text-foreground">{exam.allow_backtracking ? 'Allowed' : 'Not Allowed'}</p>
            </div>
             <div>
              <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1"><CalendarClock className="h-4 w-4" /> Start Time</Label>
              <p className="text-lg font-semibold text-foreground">{formatDateTime(exam.start_time)}</p>
            </div>
             <div>
              <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1"><CalendarClock className="h-4 w-4" /> End Time</Label>
              <p className="text-lg font-semibold text-foreground">{formatDateTime(exam.end_time)}</p>
            </div>
             <div>
                <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1"><AlertCircle className="h-4 w-4" /> Database Status</Label>
                <p className="text-lg font-semibold text-foreground">{exam.status}</p>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-3 flex items-center gap-2 text-foreground"><ListChecks className="h-5 w-5 text-primary" /> Questions ({questionsList.length})</h3>
            {questionsList.length > 0 ? (
              <ul className="space-y-4 max-h-96 overflow-y-auto pr-2 rounded-md">
                {questionsList.map((q: Question, index: number) => (
                  <li key={q.id || index} className="p-4 border border-border/20 rounded-md bg-background/70 shadow-sm">
                    <p className="font-medium text-md mb-1 text-foreground">Q{index + 1}: {q.text}</p>
                    <ul className="list-disc list-inside text-sm space-y-1 pl-4">
                      {q.options.map((opt, i) => (
                        <li key={opt.id || i} className={opt.id === q.correctOptionId ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-muted-foreground'}>
                          {opt.text} {opt.id === q.correctOptionId && "(Correct)"}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground p-4 text-center border border-border/20 rounded-md bg-background/30">No questions have been added to this exam yet.</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 border-t border-border/30 pt-6 flex-wrap">
          <Button variant="outline" onClick={() => router.push(`/teacher/dashboard/exams/${exam.exam_id}/edit`)} className="btn-outline-subtle">
            <Edit className="mr-2 h-4 w-4" /> Edit Exam
          </Button>
          <Button variant="outline" asChild disabled={effectiveStatus === 'Completed'}>
            <Link href={`/teacher/dashboard/results/${exam.exam_id}`} className="btn-outline-subtle disabled:opacity-50">
                <Users2 className="mr-2 h-4 w-4" /> View Results
            </Link>
          </Button>
          <Button variant="outline" onClick={copyExamCode} disabled={!isShareable} className="btn-outline-subtle">
            <Share2 className="mr-2 h-4 w-4" /> Share Exam Code
          </Button>
          <Button variant="destructive" onClick={() => setShowDeleteDialog(true)} disabled={isDeleting || effectiveStatus === 'Ongoing'} className="btn-gradient-destructive">
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Trash2 className="mr-2 h-4 w-4" /> Delete Exam
          </Button>
        </CardFooter>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This action cannot be undone. This will permanently delete the exam
              "{exam?.title}" and all its associated data. Ongoing exams cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="btn-outline-subtle">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteExam} className="btn-gradient-destructive" disabled={isDeleting || effectiveStatus === 'Ongoing'}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, delete exam
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
