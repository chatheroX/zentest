
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Eye, Users, Percent, Loader2, Info } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Exam } from '@/types/supabase';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface ExamResultSummary {
  exam_id: string; 
  title: string;
  participants: number; 
  averageScore: number | null; 
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
      
      <Card className="modern-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Exam Performance Summary
          </CardTitle>
          <CardDescription>
            Review exams you&apos;ve created. Detailed student scores require exam submissions.
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
                  <TableHead className="text-center"><Users className="inline-block mr-1 h-4 w-4" /> Participants</TableHead>
                  <TableHead className="text-center"><Percent className="inline-block mr-1 h-4 w-4" /> Average Score</TableHead>
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
                        className={
                            result.status === 'Published' ? 'bg-blue-500 text-white hover:bg-blue-600' : 
                            result.status === 'Completed' ? 'bg-green-500 text-white hover:bg-green-600' : 
                            result.status === 'Ongoing' ? 'bg-yellow-500 text-black hover:bg-yellow-600' : ''
                        }
                      >
                        {result.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{result.participants} (N/A)</TableCell>
                    <TableCell className="text-center">
                      {result.averageScore !== null ? `${result.averageScore}%` : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild className="btn-outline-subtle">
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
            <Alert className="modern-card border-primary/20 bg-blue-50 dark:bg-blue-500/10 mt-4">
                <Info className="h-5 w-5 text-primary" />
                <AlertTitle className="font-semibold text-primary/90">No Results Available</AlertTitle>
                <AlertDescription className="text-primary/80">
                No exams found or no results available yet. Results for completed exams will appear here once students start submitting their attempts.
                </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
