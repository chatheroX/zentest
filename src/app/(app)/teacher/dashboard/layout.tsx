
'use client';
import { SidebarProvider } from '@/components/ui/sidebar';
import { SidebarElements, NavItem } from '@/components/shared/dashboard-sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard, BookOpenCheck, Brain, BarChart3, Loader2, AlertTriangle } from 'lucide-react';
import { useCallback, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button'; // Added Button import
import { useRouter } from 'next/navigation'; // Added useRouter for redirect

const teacherNavItems: NavItem[] = [
  { href: '/teacher/dashboard/overview', label: 'Overview', icon: LayoutDashboard },
  { href: '/teacher/dashboard/exams', label: 'Manage Exams', icon: BookOpenCheck },
  { href: '/teacher/dashboard/ai-assistant', label: 'AI Assistant', icon: Brain },
  { href: '/teacher/dashboard/results', label: 'Student Results', icon: BarChart3 },
];

const AUTH_ROUTE = '/auth';

export default function TeacherDashboardLayout({
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
         <p className="ml-3 text-muted-foreground">Loading teacher session...</p>
      </div>
    );
  }
  
  if (!user) {
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
  
  if (user.role !== 'teacher') {
     return (
        <div className="flex h-screen w-full items-center justify-center bg-slate-100 dark:bg-slate-900 p-4">
             <Card className="p-6 modern-card text-center shadow-xl">
                 <CardHeader>
                    <AlertTriangle className="mx-auto h-10 w-10 text-destructive mb-3"/>
                    <CardTitle className="text-xl text-foreground">Access Denied</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">Your role ({user.role || 'Unknown'}) does not permit access to this teacher dashboard.</p>
                </CardContent>
            </Card>
        </div>
    );
  }
  
  return (
    <SidebarProvider 
        defaultOpen 
        className="bg-slate-100 dark:bg-slate-900 min-h-screen" // Updated background to a simpler one
    > 
      <SidebarElements
        navItems={teacherNavItems}
        userRoleDashboard="teacher"
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
