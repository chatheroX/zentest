
// src/app/seb/entry/[token]/page.tsx
// This page is now DEPRECATED. The token will be passed as a query parameter to /seb/entry
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SebEntryTokenPathPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const token = params.token;

  useEffect(() => {
    console.warn(`[SebEntryTokenPathPage DEPRECATED] Accessed with token in path. Redirecting to /seb/entry?token=${token}`);
    if (token) {
      router.replace(`/seb/entry?token=${token}`);
    } else {
      router.replace('/auth'); // Fallback if no token
    }
  }, [token, router]);

  return (
    <div className="min-h-screen bg-seb-entry text-foreground flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-lg glass-pane text-center">
        <CardHeader className="pt-8 pb-4">
          <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
          <CardTitle className="text-2xl">Redirecting...</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-muted-foreground">
            Updating to new SEB entry point. Please wait.
          </CardDescription>
           <Button onClick={() => router.replace(`/seb/entry?token=${token}`)} className="mt-4 btn-primary">
             Proceed Manually
           </Button>
        </CardContent>
      </Card>
    </div>
  );
}
