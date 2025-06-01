
'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, User, Lock, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { AppHeader } from '@/components/shared/header';
import { AppFooter } from '@/components/shared/footer';

const ADMIN_DASHBOARD_ROUTE = '/admin/dashboard';
const USER_DASHBOARD_ROUTE = '/user/dashboard'; // For non-admin users

export default function AdminLoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoading: authContextLoading, signInAdmin, authError: contextAuthError } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!authContextLoading && user) {
      if (user.role === 'admin') {
        router.replace(ADMIN_DASHBOARD_ROUTE);
      } else {
        // If a non-admin user somehow lands here, redirect them appropriately
        router.replace(USER_DASHBOARD_ROUTE); 
      }
    }
  }, [user, authContextLoading, router]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    if (!username.trim() || !password) {
      setFormError("Username and password are required.");
      setIsSubmitting(false);
      return;
    }

    const result = await signInAdmin(username.trim(), password);
    if (result.success) {
      toast({ title: "Admin Login Successful!", description: "Redirecting to admin dashboard..." });
      // router.replace(ADMIN_DASHBOARD_ROUTE); // Redirection handled by useEffect
    } else {
      setFormError(result.error || "Invalid admin credentials.");
      toast({ title: "Admin Login Error", description: result.error || "Invalid admin credentials.", variant: "destructive" });
    }
    setIsSubmitting(false);
  };
  
  if (authContextLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <AppHeader />
        <main className="flex-grow flex items-center justify-center p-4 bg-muted/30 dark:bg-background">
          <Card className="p-6 ui-card text-center shadow-xl">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary mb-4"/>
            <p className="text-lg font-medium text-foreground">Verifying session...</p>
            <p className="text-sm text-muted-foreground">Please wait.</p>
          </Card>
        </main>
        <AppFooter />
      </div>
    );
  }
  
  if (user) { // If user exists and not loading, useEffect will handle redirect.
     return (
        <div className="flex flex-col min-h-screen">
          <AppHeader />
          <main className="flex-grow flex items-center justify-center p-4 bg-muted/30 dark:bg-background">
            <Card className="p-6 ui-card text-center shadow-xl">
                <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary mb-4"/>
                <CardTitle className="text-xl">Redirecting...</CardTitle>
                <CardDescription className="mt-2">Please wait.</CardDescription>
            </Card>
          </main>
          <AppFooter />
        </div>
     );
  }

  // Render admin login form if not loading and no user (i.e. not about to redirect)
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background via-muted to-secondary dark:from-slate-900 dark:via-slate-800 dark:to-background">
      <AppHeader />
      <main className="flex-grow flex items-center justify-center p-4">
        <Card className="w-full max-w-md ui-card shadow-xl border-border/60">
          <form onSubmit={handleAdminLogin}>
            <CardHeader className="text-center pt-6 pb-3">
              <ShieldCheck className="h-12 w-12 text-primary mx-auto mb-3 stroke-[1.5]" />
              <CardTitle className="text-2xl font-semibold text-foreground">Admin Portal</CardTitle>
              <CardDescription className="text-muted-foreground pt-1 text-sm">Authorized access only.</CardDescription>
            </CardHeader>

            {(formError || contextAuthError) && (
              <div className="px-6 pb-3">
                <div className="bg-destructive/10 border border-destructive/40 text-destructive p-3 rounded-md text-sm flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0"/>
                  <div>
                    <p className="font-medium">Authentication Error</p>
                    {formError && <p>{formError}</p>}
                    {contextAuthError && !formError && <p>{contextAuthError}</p>}
                  </div>
                </div>
              </div>
            )}

            <CardContent className="space-y-4 px-6 pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="admin-username" className="text-muted-foreground">Admin Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/70" />
                  <Input id="admin-username" placeholder="admin_username" value={username} onChange={(e) => setUsername(e.target.value)} required className="pl-10 ui-input" autoComplete="username" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-password" className="text-muted-foreground">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/70" />
                  <Input id="admin-password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="pl-10 pr-10 ui-input" autoComplete="current-password" />
                  <Button type="button" variant="ghost" size="icon" className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="px-6 pt-2 pb-6">
              <Button type="submit" className="btn-gradient w-full text-base py-2.5 rounded-md" disabled={isSubmitting || authContextLoading}>
                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShieldCheck className="mr-2 h-5 w-5" />}
                Login as Admin
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
      <AppFooter />
    </div>
  );
}

    