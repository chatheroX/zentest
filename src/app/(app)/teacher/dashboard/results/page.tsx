
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Eye, Users, Percent, Loader2 } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Exam } from '@/types/supabase';

interface ExamResultSummary {
  exam_id: string; // Changed from id to exam_id
  title: string;
  // dateCompleted: string; // This would come from submissions, not directly from ExamX
  participants: number; // This would be calculated from submissions
  averageScore: number | null; // This would be calculated from submissions
  status: Exam['status'];
  exam_code: string;
}

export default function StudentResultsPage() {
  const [results, setResults] = useState<ExamResultSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createSupabaseBrowserClient();
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchResultsSummary = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    // This page should summarize results across multiple exams.
    // Actual participants and average scores require an ExamSubmissionsX table.
    // For now, we'll fetch exams created by the teacher and display them.
    // The 'participants' and 'averageScore' will be placeholders.
    try {
      const { data: exams, error } = await supabase
        .from('ExamX')
        .select('exam_id, title, status, exam_code')
        .eq('teacher_id', user.user_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedResults = exams.map(exam => ({
        exam_id: exam.exam_id,
        title: exam.title,
        participants: 0, // Placeholder - requires submissions data
        averageScore: null, // Placeholder - requires submissions data
        status: exam.status,
        exam_code: exam.exam_code,
      }));
      setResults(formattedResults);

    } catch (e: any) {
      toast({title: "Error", description: `Failed to load exam list: ${e.message}`, variant: "destructive"})
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, user, toast]);

  useEffect(() => {
    fetchResultsSummary();
  }, [fetchResultsSummary]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading exam results summary...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Student Results Overview</h1>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Exam Performance Summary</CardTitle>
          <CardDescription>
            Review exams you've created. Detailed student scores require exam submissions.
            (This feature is upcoming for individual exam results)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {results.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exam Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center flex items-center gap-1 justify-center"><Users className="h-4 w-4" /> Participants</TableHead>
                  <TableHead className="text-center flex items-center gap-1 justify-center"><Percent className="h-4 w-4" /> Average Score</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result) => (
                  <TableRow key={result.exam_id}>
                    <TableCell className="font-medium">{result.title}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={result.status === 'Published' ? 'default' : result.status === 'Completed' ? 'outline' : 'secondary'}
                        className={result.status === 'Published' ? 'bg-blue-500 text-white' : result.status === 'Completed' ? 'bg-green-500 text-white' : ''}
                      >
                        {result.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{result.participants} (N/A)</TableCell>
                    <TableCell className="text-center">
                      {result.averageScore !== null ? `${result.averageScore}%` : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/teacher/dashboard/results/${result.exam_id}`}>
                          <Eye className="mr-2 h-4 w-4" /> View Details
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground">No exams found or no results available yet.</p>
              <p className="text-sm text-muted-foreground">Results for completed exams will appear here.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
