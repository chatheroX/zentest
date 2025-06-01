
'use client';
// This is a simplified layout for authenticated (user/admin) areas.
// It will likely be further customized or split for user vs admin specific sidebars/headers if needed.
// For now, it provides a basic structure.

import { AppHeader } from '@/components/shared/header'; // Simplified header
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const AUTH_ROUTE = '/auth';

export default function AuthenticatedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading: authLoading, authError } = useAuth();
  const router = useRouter();

  if (authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading session...</p>
      </div>
    );
  }

  if (!user) {
    // This case should ideally be handled by middleware redirecting to AUTH_ROUTE.
    // If somehow reached, provide a way to go to login.
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background p-4">
            <Card className="p-6 ui-card text-center shadow-xl">
              <CardHeader>
                <AlertTriangle className="mx-auto h-10 w-10 text-destructive mb-3"/>
                <CardTitle className="text-xl text-foreground">Session Expired or Invalid</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {authError || "Your session may have expired. Please log in again."}
                </p>
                 <Button onClick={() => router.replace(AUTH_ROUTE)} className="mt-4 btn-primary w-full">
                    Go to Login
                </Button>
              </CardContent>
            </Card>
        </div>
    );
  }
  
  // Basic structure for authenticated areas.
  // Specific dashboards (user/admin) will implement their own sidebars/navigation if complex.
  return (
    <div className="flex min-h-screen flex-col bg-muted/30 dark:bg-background">
      <AppHeader /> {/* Header will show Dashboard/Logout */}
      <div className="flex flex-1 container mx-auto px-4 py-6 md:px-6 md:py-8">
        {/* 
          A simple sidebar could be introduced here or within specific user/admin layouts.
          For now, main content takes full width within the container.
        */}
        <main className="w-full">
          {children}
        </main>
      </div>
      {/* Footer can be added back if needed, or specific footers per dashboard */}
    </div>
  );
}
