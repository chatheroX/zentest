
'use client';

import { useParams, notFound, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Download, User, Hash, Percent, CalendarCheck2, Users, Loader2, AlertTriangle, FileText } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Exam } from '@/types/supabase';

// This interface would represent a row in a hypothetical 'ExamSubmissionsX' table
interface StudentScore {
  student_id: string;
  student_name: string; // Would need to join with proctorX or store denormalized
  score: number; // percentage
  submission_date: string;
}

interface ExamDetailedResult {
  exam_id: string;
  exam_title: string;
  overallAverage: number | null; // Calculated from submissions
  totalParticipants: number; // Calculated from submissions
  scores: StudentScore[]; // Fetched from submissions
}

export default function ExamSpecificResultsPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const { toast } = useToast();
  const examId = params.examId as string;

  const [examDetails, setExamDetails] = useState<Exam | null>(null);
  const [resultData, setResultData] = useState<ExamDetailedResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExamAndResults = useCallback(async () => {
    if (!examId) {
      setIsLoading(false);
      notFound();
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // Fetch exam details first
      const { data: examData, error: examError } = await supabase
        .from('ExamX')
        .select('exam_id, title, status')
        .eq('exam_id', examId)
        .single();

      if (examError) throw examError;
      if (!examData) throw new Error("Exam not found.");
      setExamDetails(examData as Exam);

      // TODO: Fetch actual student submissions and scores from 'ExamSubmissionsX' table
      // This is a placeholder as the submission logic and table are not yet implemented.
      // For now, we'll simulate an empty result set.
      // Example:
      /*
      const { data: submissions, error: submissionError } = await supabase
        .from('ExamSubmissionsX')
        .select('student_id, score, submitted_at, proctorX(name)') // Assuming join with proctorX for name
        .eq('exam_id', examId);
      
      if (submissionError) throw submissionError;

      const scores: StudentScore[] = submissions.map(sub => ({
        student_id: sub.student_id,
        student_name: sub.proctorX?.name || 'Unknown Student',
        score: sub.score,
        submission_date: new Date(sub.submitted_at).toLocaleString(),
      }));

      const totalParticipants = scores.length;
      const overallAverage = totalParticipants > 0 
        ? scores.reduce((sum, s) => sum + s.score, 0) / totalParticipants 
        : null;
      
      setResultData({
        exam_id: examData.exam_id,
        exam_title: examData.title,
        overallAverage: overallAverage,
        totalParticipants: totalParticipants,
        scores: scores,
      });
      */
      
      // Simulate no submissions for now
      setResultData({
        exam_id: examData.exam_id,
        exam_title: examData.title,
        overallAverage: null,
        totalParticipants: 0,
        scores: [],
      });

    } catch (e: any) {
      console.error("Error fetching exam results:", e);
      setError(e.message || "Failed to load results.");
      setResultData(null);
    } finally {
      setIsLoading(false);
    }
  }, [examId, supabase, toast]);

  useEffect(() => {
    fetchExamAndResults();
  }, [fetchExamAndResults]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading results...</p>
      </div>
    );
  }
  
  if (error) {
     return (
       <div className="space-y-6 text-center py-10">
         <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
         <h1 className="text-2xl font-semibold">Error Loading Results</h1>
         <p className="text-muted-foreground">{error}</p>
         <Button variant="outline" onClick={() => router.push('/teacher/dashboard/results')}>
           <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Results
         </Button>
       </div>
    );
  }


  if (!resultData || !examDetails) {
    return (
      <div className="space-y-6 text-center py-10">
        <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-semibold">Results Not Found</h1>
        <p className="text-muted-foreground">Detailed results for this exam could not be loaded.</p>
        <Button variant="outline" onClick={() => router.push('/teacher/dashboard/results')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Results
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => router.push('/teacher/dashboard/results')} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Results
      </Button>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl">Results for: {resultData.exam_title}</CardTitle>
          <CardDescription>
            Detailed performance of students in this exam. (Submission data is currently placeholder)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/30">
            <div>
              <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Hash className="h-4 w-4" /> Exam ID</Label>
              <p className="text-lg font-semibold">{resultData.exam_id}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Users className="h-4 w-4" /> Total Participants</Label>
              <p className="text-lg font-semibold">{resultData.totalParticipants} (N/A)</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Percent className="h-4 w-4" /> Overall Average</Label>
              <p className="text-lg font-semibold text-primary">{resultData.overallAverage !== null ? `${resultData.overallAverage.toFixed(2)}%` : 'N/A'}</p>
            </div>
          </div>

          <h3 className="text-xl font-semibold">Individual Student Scores</h3>
          {resultData.scores.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="flex items-center gap-1"><User className="h-4 w-4" /> Student Name</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead className="text-center flex items-center gap-1 justify-center"><Percent className="h-4 w-4" /> Score</TableHead>
                    <TableHead className="flex items-center gap-1"><CalendarCheck2 className="h-4 w-4" /> Submission Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resultData.scores.sort((a, b) => b.score - a.score).map((score) => (
                    <TableRow key={score.student_id}>
                      <TableCell className="font-medium">{score.student_name}</TableCell>
                      <TableCell>{score.student_id}</TableCell>
                      <TableCell className="text-center font-semibold">{score.score}%</TableCell>
                      <TableCell>{score.submission_date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-md text-muted-foreground">No student submissions found for this exam yet.</p>
                <p className="text-sm text-muted-foreground">Student scores will appear here once submissions are recorded.</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t pt-6">
          <Button variant="outline" disabled>
            <Download className="mr-2 h-4 w-4" /> Export Results (CSV) - Coming Soon
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
