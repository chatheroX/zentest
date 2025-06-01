
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ExternalLink, ShieldAlert, LogIn, LinkIcon, PlusCircle, XCircle, Info, ListChecks } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Exam, CustomUser } from '@/types/supabase';
import { getEffectiveExamStatus } from '@/app/(app)/teacher/dashboard/exams/[examId]/details/page';
import { useAuth } from '@/contexts/AuthContext';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function JoinExamPage() {
  const [examCode, setExamCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  
  const [currentLink, setCurrentLink] = useState('');
  const [sessionLinks, setSessionLinks] = useState<string[]>([]);

  const { toast } = useToast();
  const { user: studentUser, isLoading: authLoading, supabase: authSupabase } = useAuth();
  const router = useRouter();

  const handleAddLink = () => {
    if (currentLink.trim()) {
      try {
        new URL(currentLink.trim()); // Validate URL
        if (sessionLinks.length >= 5) {
            toast({ title: "Limit Reached", description: "You can add a maximum of 5 links.", variant: "default" });
            return;
        }
        setSessionLinks(prev => [...prev, currentLink.trim()]);
        setCurrentLink('');
      } catch (_) {
        toast({ title: "Invalid Link", description: "Please enter a valid URL (e.g., https://example.com).", variant: "destructive" });
      }
    }
  };

  const handleRemoveLink = (indexToRemove: number) => {
    setSessionLinks(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const operationId = `[JoinExamPage handleSubmit ${Date.now().toString().slice(-5)}]`;
    console.log(`${operationId} Initiated.`);
    setLocalError(null);

    if (!examCode.trim()) {
      toast({ title: "Error", description: "Please enter an exam code.", variant: "destructive" });
      return;
    }
    if (authLoading || !studentUser?.user_id) {
      toast({ title: "Authentication Error", description: "Please wait for session to load or log in.", variant: "destructive" });
      setIsLoading(false);
      return;
    }
    if (!authSupabase) {
      toast({ title: "Connection Error", description: "Cannot connect to services. Please try again later.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      console.log(`${operationId} Fetching exam with code: ${examCode.trim().toUpperCase()}`);
      const { data: exam, error: examFetchError } = await authSupabase
        .from('ExamX')
        .select('exam_id, title, description, duration, questions, allow_backtracking, status, teacher_id, start_time, end_time, exam_code')
        .eq('exam_code', examCode.trim().toUpperCase())
        .single();

      if (examFetchError || !exam) {
        let errMsg = "Exam code not found or error fetching exam.";
        if (examFetchError?.message && typeof examFetchError.message === 'string') {
          errMsg = examFetchError.message;
        }
        toast({ title: "Invalid Code", description: errMsg, variant: "destructive" });
        setLocalError(errMsg);
        setIsLoading(false);
        console.error(`${operationId} Error fetching exam or exam not found:`, examFetchError);
        return;
      }
      console.log(`${operationId} Exam details fetched:`, exam);

      const effectiveStatus = getEffectiveExamStatus(exam as Exam);
      if (effectiveStatus !== 'Ongoing') {
         const statusMsg = "This exam is currently " + effectiveStatus.toLowerCase() + ".";
         toast({ title: "Exam Not Active", description: statusMsg, variant: "default", duration: 7000 });
         setLocalError(statusMsg);
         setIsLoading(false);
         return;
      }
      if (!exam.questions || exam.questions.length === 0) {
        const noQuestionsMsg = "This exam has no questions. Contact your teacher.";
        toast({ title: "Exam Not Ready", description: noQuestionsMsg, variant: "destructive" });
        setLocalError(noQuestionsMsg);
        setIsLoading(false);
        return;
      }
      
      console.log(`${operationId} Requesting SEB entry JWT from API for student: ${studentUser.user_id}, exam: ${exam.exam_id}. Links:`, sessionLinks);
      
      const tokenResponse = await fetch('/api/generate-seb-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            studentId: studentUser.user_id, 
            examId: exam.exam_id,
            links: sessionLinks.length > 0 ? sessionLinks : undefined 
        }),
      });

      if (!tokenResponse.ok) {
        let errorBodyText = `API error: ${tokenResponse.status}`;
        try {
          const rawText = await tokenResponse.text(); 
          if (rawText && rawText.trim() !== '') {
            try {
              const errorBodyJson = JSON.parse(rawText); 
              if (errorBodyJson && typeof errorBodyJson.error === 'string' && errorBodyJson.error.trim() !== '') {
                errorBodyText = errorBodyJson.error; 
              } else {
                errorBodyText = `Server error (non-JSON): ${rawText.substring(0, 200)}${rawText.length > 200 ? '...' : ''}`;
              }
            } catch (jsonParseError) {
              errorBodyText = `Server error (non-JSON): ${rawText.substring(0, 200)}${rawText.length > 200 ? '...' : ''}`;
            }
          } else if (tokenResponse.statusText) { 
            errorBodyText += ` ${tokenResponse.statusText}`;
          } else {
            errorBodyText += ` (No error message body)`;
          }
        } catch (bodyReadError: any) {
          console.error(`${operationId} Failed to read error response body from /api/generate-seb-token. Status: ${tokenResponse.status}`, bodyReadError);
          const safeBodyReadErrorMsg = (bodyReadError && typeof bodyReadError.message === 'string') ? bodyReadError.message : String(bodyReadError);
          errorBodyText += ` (Could not read error body: ${safeBodyReadErrorMsg})`;
        }
        
        console.error(`${operationId} API Error generating token: ${tokenResponse.status} "${errorBodyText}"`);
        toast({ title: "Launch Error", description: errorBodyText, variant: "destructive" });
        setLocalError(errorBodyText);
        setIsLoading(false);
        return;
      }

      const { token: sebEntryTokenValue } = await tokenResponse.json();

      if (!sebEntryTokenValue) {
        const errMsg = "API did not return a token.";
        console.error(`${operationId} ${errMsg}`);
        toast({ title: "Launch Error", description: errMsg, variant: "destructive" });
        setLocalError(errMsg);
        setIsLoading(false);
        return;
      }
      
      console.log(`${operationId} Received SEB entry JWT from API:`, sebEntryTokenValue ? sebEntryTokenValue.substring(0,20) + "..." : "TOKEN_GENERATION_FAILED_OR_EMPTY");

      const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE_SKIP_SEB_LAUNCH === "true";

      if (isDevMode) {
        console.log(`${operationId} DEV MODE: Skipping SEB launch. Navigating directly to /seb/entry with token in query.`);
        setIsLoading(false);
        router.push(`/seb/entry?token=${sebEntryTokenValue}`); 
        return;
      }

      const appDomain = window.location.origin;
      const sebEntryPageUrl = `${appDomain}/seb/entry?token=${sebEntryTokenValue}`; 
      const domainAndPathForSeb = sebEntryPageUrl.replace(/^https?:\/\//, '');
      const sebLaunchUrl = `sebs://${domainAndPathForSeb}`;
      
      console.log(`${operationId} FINAL SEB LAUNCH URL (Direct to entry page with JWT in query):`, sebLaunchUrl);
      
      toast({
        title: "Launching Exam in SEB",
        description: "Safe Exam Browser should start. Ensure SEB is installed and configured. Your browser will ask for permission to open SEB.",
        duration: 15000,
      });
      
      window.location.href = sebLaunchUrl;

      setTimeout(() => {
        if (window.location.pathname.includes('join-exam')) { 
          setIsLoading(false); 
          const sebFailMsg = "SEB launch may have been blocked or failed. If SEB did not start, check your browser's pop-up settings or SEB installation.";
          setLocalError(sebFailMsg);
          toast({ title: "SEB Launch Issue?", description: "If SEB did not open, please check pop-up blockers and ensure SEB is installed correctly.", variant: "destructive", duration: 10000});
        }
      }, 8000); 

    } catch (e: any) {
      const exceptionMsg = (e && typeof e.message === 'string' ? e.message : String(e));
      console.error(`${operationId} Exception during handleSubmit:`, e);
      toast({ title: "Error", description: exceptionMsg, variant: "destructive" });
      setLocalError(exceptionMsg);
      setIsLoading(false);
    }
  }, [examCode, authSupabase, toast, studentUser, authLoading, router, sessionLinks]);


  useEffect(() => {
    if (!authLoading && !studentUser) {
      console.log("[JoinExamPage] User not authenticated, redirecting to login.");
      router.replace('/auth');
    }
  }, [authLoading, studentUser, router]);


  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading session...</p>
      </div>
    );
  }

  if (!studentUser) {
     return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-4">
          <Card className="w-full max-w-md card-3d text-center">
            <CardHeader>
                <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <CardTitle>Authentication Required</CardTitle>
            </CardHeader>
            <CardContent>
                <CardDescription>You need to be logged in to join an exam.</CardDescription>
                 <Button onClick={() => router.push('/auth')} className="mt-6 w-full bg-blue-500 hover:bg-blue-600 text-white font-medium">
                    <LogIn className="mr-2 h-4 w-4"/> Go to Login
                </Button>
            </CardContent>
          </Card>
        </div>
    );
  }


  return (
    <div className="space-y-8 py-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-800">Join Exam</h1>
        <p className="mt-2 text-lg text-slate-500">Enter your unique exam code and any reference links to begin.</p>
      </div>
      <Card className="w-full max-w-lg mx-auto card-3d shadow-2xl border-slate-200">
        <form onSubmit={handleSubmit}>
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-semibold text-slate-700">Enter Exam Code</CardTitle>
            <CardDescription className="text-slate-500/90 pt-1">
              This will attempt to launch the exam directly in Safe Exam Browser.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="examCode" className="text-sm font-medium text-slate-600">Exam Code</Label>
              <Input
                id="examCode"
                value={examCode}
                onChange={(e) => {
                  setExamCode(e.target.value.toUpperCase());
                  if(localError) setLocalError(null); 
                }}
                placeholder="e.g., EXMCD123"
                required
                className="text-xl tracking-wider h-12 text-center bg-slate-100/70 border-slate-300 focus:border-blue-500 focus:ring-blue-500/50"
                autoComplete="off"
                disabled={isLoading}
              />
            </div>
            {localError && (
                <Alert variant="destructive" className="bg-red-100/70 border-red-400/50 text-red-700">
                    <ShieldAlert className="h-5 w-5 text-red-500"/>
                    <AlertTitle className="font-semibold">Error</AlertTitle>
                    <AlertDescription className="text-sm">{localError}</AlertDescription>
                </Alert>
            )}
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1" className="border-slate-200">
                <AccordionTrigger className="text-sm font-medium text-slate-600 hover:no-underline hover:text-blue-600 py-3">
                  <div className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4"/> Optional: Add Reference Links (Max 5)
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4 space-y-3">
                   <div className="flex gap-2">
                    <Input
                        type="url"
                        value={currentLink}
                        onChange={(e) => setCurrentLink(e.target.value)}
                        placeholder="https://example.com/resource"
                        className="bg-slate-100/70 border-slate-300 focus:border-blue-500"
                    />
                    <Button type="button" variant="outline" size="icon" onClick={handleAddLink} className="border-slate-300 hover:bg-blue-500/10 hover:border-blue-500" title="Add Link">
                        <PlusCircle className="h-5 w-5 text-blue-500"/>
                    </Button>
                   </div>
                   {sessionLinks.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-200 max-h-40 overflow-y-auto pr-1">
                        <p className="text-xs text-slate-500 mb-1">Added links (will be available in SEB):</p>
                        {sessionLinks.map((link, index) => (
                            <div key={index} className="flex items-center justify-between text-xs p-1.5 bg-slate-100 rounded text-slate-600">
                                <a href={link} target="_blank" rel="noopener noreferrer" className="truncate hover:underline" title={link}>
                                  {link.length > 40 ? `${link.substring(0,37)}...` : link}
                                </a>
                                <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveLink(index)} className="h-6 w-6 text-red-500 hover:bg-red-100/50" title="Remove Link">
                                    <XCircle className="h-4 w-4"/>
                                </Button>
                            </div>
                        ))}
                    </div>
                   )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Alert variant="default" className="mt-6 bg-blue-100/70 border-blue-400/50 text-blue-700">
              <ShieldAlert className="h-5 w-5 text-blue-500" />
              <AlertTitle className="font-semibold text-blue-600">SEB Recommended for Production</AlertTitle>
              <AlertDescription className="text-blue-700/90 text-sm">
                For actual exams, this will open in Safe Exam Browser (SEB). Ensure SEB is installed and configured.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="px-6 pb-6 pt-2">
            <Button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 text-base rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ease-in-out transform hover:-translate-y-0.5" disabled={isLoading || authLoading || !examCode.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Preparing Exam Entry...
                </>
              ) : (
                'Proceed to Exam Entry'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
       <div className="text-center max-w-lg mx-auto">
        <p className="text-xs text-slate-500">
          Having trouble with SEB? Ensure you have the latest version installed. You can download it from 
          <a href="https://safeexambrowser.org/download_en.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
            safeexambrowser.org <ExternalLink className="inline h-3 w-3"/>
          </a>.
        </p>
      </div>
    </div>
  );
}
    
