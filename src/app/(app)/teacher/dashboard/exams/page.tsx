
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PlusCircle, MoreHorizontal, Edit, Trash2, Share2, Eye, Copy, BookOpenCheck, Loader2, Users2, CalendarClock, ClockIcon, CheckCircleIcon, PlayCircleIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Exam, ExamStatus } from '@/types/supabase';
import { format, parseISO, isBefore, isAfter, isValid } from 'date-fns';
import { getEffectiveExamStatus } from './[examId]/details/page';

interface CategorizedExams {
  ongoing: Exam[];
  upcoming: Exam[];
  completed: Exam[];
  // No 'Drafts' as it's removed
}

export default function ManageExamsPage() {
  const supabase = createSupabaseBrowserClient();
  const { user } = useAuth();
  const [categorizedExams, setCategorizedExams] = useState<CategorizedExams>({ ongoing: [], upcoming: [], completed: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const fetchAndCategorizeExams = useCallback(async () => {
    if (!user || !user.user_id) {
      setIsLoading(false);
      setCategorizedExams({ ongoing: [], upcoming: [], completed: [] });
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ExamX')
        .select('*')
        .eq('teacher_id', user.user_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const examsData = data || [];
      const newCategorizedExams: CategorizedExams = { ongoing: [], upcoming: [], completed: [] };

      examsData.forEach(exam => {
        const effectiveStatus = getEffectiveExamStatus(exam);

        if (effectiveStatus === 'Ongoing') newCategorizedExams.ongoing.push(exam);
        else if (effectiveStatus === 'Published') newCategorizedExams.upcoming.push(exam);
        else if (effectiveStatus === 'Completed') newCategorizedExams.completed.push(exam);
        // No 'Draft' status handling
      });

      setCategorizedExams(newCategorizedExams);

    } catch (error: any) {
      toast({ title: "Error", description: `Failed to fetch exams: ${error.message}`, variant: "destructive" });
      setCategorizedExams({ ongoing: [], upcoming: [], completed: [] });
    } finally {
      setIsLoading(false);
    }
  }, [user, supabase, toast]);

  useEffect(() => {
    if (user) {
      fetchAndCategorizeExams();
    } else {
      setIsLoading(false);
      setCategorizedExams({ ongoing: [], upcoming: [], completed: [] });
    }
  }, [user, fetchAndCategorizeExams]);


  const handleDeleteExam = async () => {
    if (!examToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('ExamX')
        .delete()
        .eq('exam_id', examToDelete.exam_id);

      if (error) throw error;
      toast({ title: "Exam Deleted", description: `Exam "${examToDelete.title}" has been deleted.` });
      fetchAndCategorizeExams();
      setExamToDelete(null);
    } catch (error: any) {
      toast({ title: "Error", description: `Failed to delete exam: ${error.message}`, variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const openDeleteDialog = (exam: Exam) => {
    setExamToDelete(exam);
    setShowDeleteDialog(true);
  };

  const copyExamCode = (code: string) => {
    if (!code) {
      toast({ description: "No exam code to copy.", variant: "default" });
      return;
    }
    navigator.clipboard.writeText(code).then(() => {
      toast({ description: `Exam code "${code}" copied to clipboard!` });
    }).catch(err => {
      toast({ description: "Failed to copy code.", variant: "destructive" });
    });
  };

  const getStatusBadgeVariant = (status: ExamStatus): "default" | "secondary" | "destructive" | "outline" => {
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

  const formatTableDateTime = (isoString: string | null | undefined) => {
    if (!isoString) return 'N/A';
    try {
      const date = parseISO(isoString);
      if(!isValid(date)) return 'Invalid Date';
      return format(date, "MMM d, yyyy HH:mm");
    } catch {
      return "Invalid Date";
    }
  };

  const renderExamTable = (exams: Exam[], categoryTitle: string) => {
    if (exams.length === 0) {
      return (
        <div className="py-4 text-center text-muted-foreground">
          No {categoryTitle.toLowerCase().replace(' exams', '')} exams.
        </div>
      );
    }
    return (
      <Table>
        <TableHeader>
          <TableRow>{/* Ensure no whitespace directly inside TableRow */}
            <TableHead>Title</TableHead>
            <TableHead>Effective Status</TableHead>
            <TableHead><CalendarClock className="inline mr-1 h-4 w-4"/>Start Time</TableHead>
            <TableHead><CalendarClock className="inline mr-1 h-4 w-4"/>End Time</TableHead>
            <TableHead>Questions</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Exam Code</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {exams.map((exam) => {
            const effectiveStatus = getEffectiveExamStatus(exam);
            return (
            <TableRow key={exam.exam_id}>{/* Ensure no whitespace directly inside TableRow */}
              <TableCell className="font-medium">{exam.title}</TableCell>
              <TableCell>
                 <Badge
                  variant={getStatusBadgeVariant(effectiveStatus)}
                  className={getStatusBadgeClass(effectiveStatus)}
                >
                  {effectiveStatus}
                </Badge>
              </TableCell>
              <TableCell>{formatTableDateTime(exam.start_time)}</TableCell>
              <TableCell>{formatTableDateTime(exam.end_time)}</TableCell>
              <TableCell>{exam.questions?.length || 0}</TableCell>
              <TableCell>{exam.duration} min</TableCell>
              <TableCell>
                <Button variant="ghost" size="sm" onClick={() => copyExamCode(exam.exam_code!)} className="p-1 h-auto" disabled={!exam.exam_code}>
                  {exam.exam_code || 'N/A'} <Copy className="ml-2 h-3 w-3" />
                </Button>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                      <Link href={`/teacher/dashboard/exams/${exam.exam_id}/edit`}><Edit className="mr-2 h-4 w-4" /> Edit</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/teacher/dashboard/exams/${exam.exam_id}/details`}><Eye className="mr-2 h-4 w-4" /> View Details</Link>
                    </DropdownMenuItem>
                    {effectiveStatus === 'Ongoing' && (
                       <DropdownMenuItem asChild>
                         <Link href={`/teacher/dashboard/exams/${exam.exam_id}/monitor`}><PlayCircleIcon className="mr-2 h-4 w-4" /> Monitor Exam</Link>
                       </DropdownMenuItem>
                    )}
                     <DropdownMenuItem asChild>
                      <Link href={`/teacher/dashboard/results/${exam.exam_id}`}><Users2 className="mr-2 h-4 w-4" /> View Results</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => copyExamCode(exam.exam_code!)} disabled={effectiveStatus === 'Completed' || !exam.exam_code}>
                      <Share2 className="mr-2 h-4 w-4" /> Share Code
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => openDeleteDialog(exam)}
                      className="text-destructive focus:text-destructive focus:bg-destructive/10"
                      disabled={effectiveStatus === 'Ongoing'}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
        </TableBody>
      </Table>
    );
  };

  const examCategories = [
    { title: "Ongoing Exams", data: categorizedExams.ongoing, icon: <PlayCircleIcon className="h-5 w-5 text-yellow-500" />, defaultOpen: true },
    { title: "Upcoming Exams", data: categorizedExams.upcoming, icon: <ClockIcon className="h-5 w-5 text-blue-500" />, defaultOpen: true },
    { title: "Completed Exams", data: categorizedExams.completed, icon: <CheckCircleIcon className="h-5 w-5 text-green-500" /> },
  ];


  if (isLoading && Object.values(categorizedExams).every(arr => arr.length === 0)) {
    return (
      <div className="flex justify-center items-center h-full py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading exams...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Manage Exams</h1>
        <Button asChild>
          <Link href="/teacher/dashboard/exams/create">
            <PlusCircle className="mr-2 h-5 w-5" /> Create New Exam
          </Link>
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Your Exams Dashboard</CardTitle>
          <CardDescription>View, edit, and manage all your created exams, categorized by their current status.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
          {!isLoading && Object.values(categorizedExams).every(arr => arr.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BookOpenCheck className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground">No exams created yet.</p>
              <p className="text-sm text-muted-foreground">Click "Create New Exam" to get started.</p>
            </div>
          ) : (
            <Accordion type="multiple" defaultValue={examCategories.filter(c=>c.defaultOpen).map(c => c.title)} className="w-full">
              {examCategories.map(category => (
                <AccordionItem value={category.title} key={category.title}>
                  <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                    <div className="flex items-center gap-2">
                        {category.icon} {category.title} ({category.data.length})
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {renderExamTable(category.data, category.title)}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the exam
              "{examToDelete?.title}" and all its associated data (questions, submissions). Ongoing exams cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setExamToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteExam}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              disabled={isDeleting || getEffectiveExamStatus(examToDelete) === 'Ongoing'}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, delete exam
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
