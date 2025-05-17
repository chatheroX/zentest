
'use client';
import { SidebarProvider } from '@/components/ui/sidebar';
import { SidebarElements, NavItem } from '@/components/shared/dashboard-sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard, Edit3, History, Loader2, AlertTriangle } from 'lucide-react';
import React, { useCallback, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button'; // Added Button import for consistency
import { useRouter } from 'next/navigation'; // Added useRouter for redirect

const studentNavItems: NavItem[] = [
  { href: '/student/dashboard/overview', label: 'Overview', icon: LayoutDashboard },
  { href: '/student/dashboard/join-exam', label: 'Join Exam', icon: Edit3 },
  { href: '/student/dashboard/exam-history', label: 'Exam History', icon: History },
];

const AUTH_ROUTE = '/auth';

export default function StudentDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, signOut, isLoading: authLoading, authError } = useAuth();
  const router = useRouter();

  const handleSignOut = useCallback(async () => {
    await signOut();
    // router.replace(AUTH_ROUTE); // AuthContext's route guard will handle this
  }, [signOut]);

  if (authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-100 dark:bg-slate-900">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading student session...</p>
      </div>
    );
  }

  if (!user) {
    // This state implies middleware allowed access, but client-side AuthContext found no user.
    // AuthContext's route guard effect should eventually redirect to /auth.
    // Show a more informative message while that happens.
    return (
        <div className="flex h-screen w-full items-center justify-center bg-slate-100 dark:bg-slate-900 p-4">
            <Card className="p-6 modern-card text-center shadow-xl">
              <CardHeader>
                <AlertTriangle className="mx-auto h-10 w-10 text-destructive mb-3"/>
                <CardTitle className="text-xl text-foreground">Session Not Found</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {authError ? authError : "Your session may have expired or is invalid."}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Please try logging in again.</p>
                 <Button onClick={() => router.replace(AUTH_ROUTE)} className="mt-4 btn-primary-solid w-full">
                    Go to Login
                </Button>
              </CardContent>
            </Card>
        </div>
    );
  }
  
  if (user.role !== 'student') {
     return (
        <div className="flex h-screen w-full items-center justify-center bg-slate-100 dark:bg-slate-900 p-4">
             <Card className="p-6 modern-card text-center shadow-xl">
                <CardHeader>
                    <AlertTriangle className="mx-auto h-10 w-10 text-destructive mb-3"/>
                    <CardTitle className="text-xl text-foreground">Access Denied</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">Your role ({user.role || 'Unknown'}) does not permit access to this student dashboard.</p>
                </CardContent>
            </Card>
        </div>
    );
  }
  
  return (
    <SidebarProvider 
        defaultOpen 
        className="bg-slate-100 dark:bg-slate-900 min-h-screen" // Updated to match teacher
    > 
      <SidebarElements
        navItems={studentNavItems}
        userRoleDashboard="student"
        user={user} 
        signOut={handleSignOut}
        authLoading={authLoading}
      />
      <main className="flex-1 flex flex-col overflow-y-auto p-6 md:p-8 bg-transparent min-w-0"> 
        {children}
      </main>
    </SidebarProvider>
  );
}
