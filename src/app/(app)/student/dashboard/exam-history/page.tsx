
'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
// import type { Exam } from '@/types/supabase'; // If fetching exam details too

// This interface would represent a row in a hypothetical 'ExamSubmissionsX' table
interface ExamHistoryItem {
  submission_id: string; 
  exam_id: string;
  exam_title: string; // Denormalized or fetched via join
  submission_date: string;
  score: number | null;
  status: 'Completed' | 'In Progress' | 'Not Started';
}

export default function ExamHistoryPage() {
  const [examHistory, setExamHistory] = useState<ExamHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const supabase = createSupabaseBrowserClient();

  const fetchHistory = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    
    // TODO: Implement fetching from 'ExamSubmissionsX' table
    // This is a placeholder as the table and submission logic are not yet implemented.
    // Example of what it might look like:
    /*
    try {
      const { data, error } = await supabase
        .from('ExamSubmissionsX') // Assuming a table like this
        .select(`
          submission_id,
          exam_id,
          submitted_at,
          score,
          status,
          ExamX ( title ) 
        `)
        .eq('student_id', user.user_id) // Assuming ExamSubmissionsX has student_id
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      const formattedHistory = data.map(item => ({
        submission_id: item.submission_id,
        exam_id: item.exam_id,
        exam_title: item.ExamX?.title || 'Unknown Exam',
        submission_date: item.submitted_at ? new Date(item.submitted_at).toLocaleDateString() : 'N/A',
        score: item.score,
        status: item.status as ExamHistoryItem['status'],
      }));
      setExamHistory(formattedHistory);
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to fetch exam history.", variant: "destructive" });
      setExamHistory([]);
    } finally {
      setIsLoading(false);
    }
    */
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
    setExamHistory([]); // Initialize with empty array as feature is not complete
    setIsLoading(false);
  }, [user, toast, supabase]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading exam history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Exam History</h1>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Your Past Exams</CardTitle>
          <CardDescription>Review your performance in previous exams. (This feature is upcoming)</CardDescription>
        </CardHeader>
        <CardContent>
          {examHistory.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exam Title</TableHead>
                  <TableHead>Date Submitted</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {examHistory.map((exam) => (
                  <TableRow key={exam.submission_id}>
                    <TableCell className="font-medium">{exam.exam_title}</TableCell>
                    <TableCell>{exam.submission_date}</TableCell>
                    <TableCell>{exam.score !== null ? `${exam.score}%` : 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={
                        exam.status === 'Completed' ? 'default' :
                          exam.status === 'In Progress' ? 'secondary' :
                            'outline'
                      }
                        className={
                          exam.status === 'Completed' ? 'bg-green-500/80 text-white' :
                            exam.status === 'In Progress' ? 'bg-yellow-500/80 text-white' : ''
                        }
                      >
                        {exam.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground">You haven&apos;t completed any exams yet.</p>
              <p className="text-sm text-muted-foreground">Your completed exams will appear here once exam submission is implemented.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
