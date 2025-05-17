
// src/components/seb/seb-exam-view-client.tsx
// This entire component and its associated page /seb/exam-view are now DEPRECATED.
// The new flow is /join-exam -> sebs://.../seb/entry/[token] -> /seb/live-test
'use client';

import React, { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation'; 
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';


export function SebExamViewClient() {
  const router = useRouter();
  const { toast } = useToast();
  
  const handleExitSeb = useCallback(() => {
    toast({ title: "Exiting SEB", description: "Safe Exam Browser will attempt to close.", duration: 3000 });
    if (typeof window !== 'undefined') window.location.href = "seb://quit";
  }, [toast]);

  useEffect(() => {
    const effectId = `[SebExamViewClient DEPRECATED ${Date.now().toString().slice(-4)}]`;
    console.warn(`${effectId} This component is deprecated. The new SEB flow uses /seb/entry/[token] which leads to /seb/live-test. Attempting to quit SEB or redirect.`);
    
    toast({
        title: "Page Deprecated",
        description: "This exam view is outdated. SEB will attempt to quit. Please re-initiate the exam.",
        variant: "destructive",
        duration: 10000
    });
    // Give time for toast to show before trying to quit
    const timer = setTimeout(() => {
        handleExitSeb();
    }, 9000); 
    
    return () => clearTimeout(timer);
  }, [router, toast, handleExitSeb]); // Added handleExitSeb to deps

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-slate-800 to-slate-900 text-slate-100">
      <Card className="w-full max-w-lg modern-card text-center shadow-xl bg-card/80 backdrop-blur-lg border-border/30">
        <CardHeader className="pt-8 pb-4">
          <AlertTriangle className="h-16 w-16 text-orange-500 mx-auto mb-5" />
          <CardTitle className="text-2xl text-orange-400">SEB Page Outdated</CardTitle>
        </CardHeader>
        <CardContent className="pb-6 space-y-4">
          <p className="text-muted-foreground">
            This Safe Exam Browser page is no longer in use due to system updates.
          </p>
          <p className="text-sm text-muted-foreground">
            SEB will attempt to quit. Please re-initiate the exam from the ZenTest dashboard or contact support if this issue persists.
            Your SEB configuration might be pointing to an old Start URL.
          </p>
           <Button onClick={handleExitSeb} className="w-full btn-gradient-destructive mt-4">
             <LogOut className="mr-2 h-4 w-4" /> Exit SEB Now
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
