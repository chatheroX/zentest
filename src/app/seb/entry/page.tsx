
// src/app/seb/entry/page.tsx
// This page is now DEPRECATED as the primary SEB entry point.
// The flow now uses /seb/entry/[token]/page.tsx
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DeprecatedSebEntryPage() {
  const router = useRouter();

  useEffect(() => {
    console.warn("[DeprecatedSebEntryPage] This page is deprecated. SEB flow now uses /seb/entry/[token]. Redirecting to unsupported browser page or dashboard if not in SEB.");
    // If somehow reached, it's an invalid state for the new flow.
    router.replace('/unsupported-browser'); 
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
       <Card className="w-full max-w-lg modern-card text-center shadow-xl bg-card/80 backdrop-blur-lg border-border/30">
        <CardHeader className="pt-8 pb-4">
          <AlertTriangle className="h-16 w-16 text-orange-500 mx-auto mb-5" />
          <CardTitle className="text-2xl text-orange-400">SEB Entry Point Changed</CardTitle>
        </CardHeader>
        <CardContent className="pb-6 space-y-4">
          <CardDescription className="text-muted-foreground">
            The exam entry method has been updated. Exams are now launched directly to a secure token-based entry page.
          </CardDescription>
          <p className="text-sm text-muted-foreground">
            You will be redirected. If SEB doesn't proceed, please re-initiate the exam from the ZenTest dashboard.
          </p>
          <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mt-4" />
        </CardContent>
      </Card>
    </div>
  );
}
    