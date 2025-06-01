
'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { AppHeader } from '@/components/shared/header';
import { AppFooter } from '@/components/shared/footer';

export default function UnsupportedBrowserPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex flex-col items-center justify-center flex-grow p-4">
        <Card className="w-full max-w-md ui-card text-center shadow-xl">
          <CardHeader className="pt-8 pb-4">
            <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-5" />
            <CardTitle className="text-2xl text-destructive-foreground">Unsupported Environment</CardTitle>
          </CardHeader>
          <CardContent className="pb-6 space-y-4">
            <CardDescription className="text-muted-foreground">
              This compatibility check must be run using Safe Exam Browser (SEB).
              Please ensure SEB is installed and launch the check again through the ProctorChecker platform.
            </CardDescription>
            <p className="text-sm text-muted-foreground">
              If you are seeing this message in error within SEB, please contact support.
            </p>
            <Button asChild className="w-full btn-primary mt-4">
              <Link href="/">
                Return to Homepage
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full btn-outline mt-2">
              <a href="https://safeexambrowser.org/download_en.html" target="_blank" rel="noopener noreferrer">
                Download Safe Exam Browser <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </main>
      <AppFooter />
    </div>
  );
}
