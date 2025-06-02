
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation'; // Added usePathname
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, EyeOff, User, Lock, Loader2, KeyRound, ArrowRight, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { AuthenticatedUser } from '@/types/supabase';

type AuthAction = 'login' | 'register';

const USER_DASHBOARD_ROUTE = '/user/dashboard';
const ADMIN_DASHBOARD_ROUTE = '/admin/dashboard';


export function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname(); // Get current pathname
  const { toast } = useToast();
  const { user, isLoading: authContextLoading, authError: contextAuthError, signInUser, registerUserWithLicense } = useAuth();

  const initialAction = (searchParams.get('action') as AuthAction) || 'login';
  
  const [action, setAction] = useState<AuthAction>(initialAction);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const resetFormFields = useCallback(() => {
    setUsername(''); setPassword(''); setConfirmPassword(''); setLicenseKey('');
    setShowPassword(false); setShowConfirmPassword(false); setFormError(null);
  }, []);

  useEffect(() => {
    const actionFromParams = (searchParams.get('action') as AuthAction) || 'login';
    if (actionFromParams !== action && (actionFromParams === 'login' || actionFromParams === 'register')) {
      resetFormFields();
      setAction(actionFromParams);
    }
  }, [searchParams, action, resetFormFields]);

  // Removed the useEffect that called router.replace() here.
  // AuthContext now solely handles these lifecycle-based redirects.
  
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    
    const trimmedUsername = username.trim();

    if (!trimmedUsername || !password) {
      setFormError("Username and password are required.");
      setIsSubmitting(false);
      return;
    }

    let result: { success: boolean; error?: string; user?: AuthenticatedUser | null };
    
    if (action === 'register') {
      if (!licenseKey.trim()) {
        setFormError("License key is required for registration.");
        setIsSubmitting(false); return;
      }
      if (password !== confirmPassword) {
        setFormError("Passwords do not match.");
        setIsSubmitting(false); return;
      }
      if (password.length < 6) {
        setFormError("Password must be at least 6 characters.");
        setIsSubmitting(false); return;
      }
      result = await registerUserWithLicense(licenseKey.trim(), trimmedUsername, password);
      if (result.success) {
        toast({ title: "Registration Successful!", description: "Redirecting to your dashboard..." });
         // Redirection handled by AuthContext
      } else {
        setFormError(result.error || "Registration failed.");
        toast({ title: "Registration Error", description: result.error || "An unknown error occurred.", variant: "destructive" });
      }
    } else { // Only 'login' (user login) remains
      result = await signInUser(trimmedUsername, password);
      if (result.success) {
        toast({ title: "Login Successful!", description: "Redirecting to your dashboard..." });
         // Redirection handled by AuthContext
      } else {
        setFormError(result.error || "Invalid credentials or server error.");
        toast({ title: "Login Error", description: result.error || "Invalid credentials or server error.", variant: "destructive" });
      }
    }
    setIsSubmitting(false);
  };
  
  if (authContextLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-12rem)]">
        <Card className="p-6 ui-card text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary mb-3"/><p className="text-md font-medium text-foreground">Verifying session...</p></Card>
      </div>
    );
  }

  // If user is logged in (and not loading), AuthContext will handle redirect. Show "Redirecting..." message.
  if (!authContextLoading && user) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-12rem)]">
        <Card className="p-6 ui-card text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary mb-3"/>
          <p className="text-md font-medium text-foreground">Redirecting...</p>
          <p className="text-xs text-muted-foreground">Loading your dashboard.</p>
        </Card>
      </div>
    );
  }
  
  const handleTabChange = (value: string) => {
    const newAction = value as AuthAction;
    if (newAction === 'login' || newAction === 'register') {
        setAction(newAction);
        resetFormFields();
        // Update URL query param without a full page navigation,
        // letting AuthContext handle any redirects if user state changes.
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('action', value);
        router.replace(currentUrl.toString(), { scroll: false });
    }
  };

  const commonUserPassFields = (idPrefix: string) => (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-username`} className="text-muted-foreground">Username</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/70" />
          <Input id={`${idPrefix}-username`} placeholder="your_username" value={username} onChange={(e) => setUsername(e.target.value)} required className="pl-10 ui-input" autoComplete="username" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-password`} className="text-muted-foreground">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/70" />
          <Input id={`${idPrefix}-password`} type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="pl-10 pr-10 ui-input" autoComplete={action === 'register' ? "new-password" : "current-password"} />
          <Button type="button" variant="ghost" size="icon" className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </>
  );

  // Render form only if not loading and no user
  return (
    <div className="w-full max-w-md">
      <Card className="w-full ui-card shadow-xl border-border/60">
        <Tabs value={action} onValueChange={handleTabChange} className="w-full">
           <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-3">
            <TabsList className="grid w-full grid-cols-2 bg-muted/60 dark:bg-muted/30 p-1 rounded-md">
              {(['login', 'register'] as AuthAction[]).map(tabAction => (
                <TabsTrigger 
                  key={tabAction}
                  value={tabAction} 
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-[0.4rem] py-2 text-xs sm:text-sm font-medium transition-all"
                >
                  {tabAction === 'login' ? 'User Login' : 'Register Key'}
                </TabsTrigger>
              ))}
            </TabsList>
          </CardHeader>
          
          <form onSubmit={handleAuth}>
            { (formError || contextAuthError) && (
              <div className="p-4 pt-0 sm:px-6 sm:pt-0">
                <div className="bg-destructive/10 border border-destructive/40 text-destructive p-3 rounded-md text-sm flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0"/>
                  <div><p className="font-medium">Authentication Error</p>{formError && <p>{formError}</p>}{contextAuthError && !formError && <p>{contextAuthError}</p>}</div>
                </div>
              </div>
            )}

            <TabsContent value="login">
              <CardHeader className="text-center pt-4 sm:pt-6 pb-3"><CardTitle className="text-2xl font-semibold text-foreground flex items-center justify-center gap-2"><User className="h-6 w-6 text-primary"/>User Login</CardTitle><CardDescription className="text-muted-foreground pt-1 text-sm">Access your ProctorChecker account.</CardDescription></CardHeader>
              <CardContent className="space-y-4 p-4 sm:p-6 pt-2">{commonUserPassFields('login')}</CardContent>
              <CardFooter className="flex flex-col p-4 sm:p-6 pt-0 pb-6">
                <Button type="submit" className="btn-gradient w-full text-sm py-2.5 rounded-md" disabled={isSubmitting || authContextLoading}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-1.5 h-4 w-4" />}Login</Button>
                <p className="mt-4 text-center text-xs text-muted-foreground">No account?{' '}<button type="button" className="font-medium text-primary hover:underline focus:outline-none" onClick={() => handleTabChange('register')}>Register with a license key</button></p>
              </CardFooter>
            </TabsContent>

            <TabsContent value="register">
              <CardHeader className="text-center pt-4 sm:pt-6 pb-3"><CardTitle className="text-2xl font-semibold text-foreground flex items-center justify-center gap-2"><User className="h-6 w-6 text-primary"/>Create User Account</CardTitle><CardDescription className="text-muted-foreground pt-1 text-sm">Register with a valid license key.</CardDescription></CardHeader>
              <CardContent className="space-y-3.5 p-4 sm:p-6 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="register-licenseKey" className="text-muted-foreground">License Key</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/70" />
                    <Input id="register-licenseKey" placeholder="XXXX-XXXX-XXXX-XXXX" value={licenseKey} onChange={(e) => setLicenseKey(e.target.value.toUpperCase())} required className="pl-10 ui-input" />
                  </div>
                </div>
                {commonUserPassFields('register')}
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password-register" className="text-muted-foreground">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/70" />
                    <Input id="confirm-password-register" type={showConfirmPassword ? 'text' : 'password'} placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="pl-10 pr-10 ui-input" autoComplete="new-password" />
                     <Button type="button" variant="ghost" size="icon" className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label={showConfirmPassword ? "Hide password" : "Show password"}>
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col p-4 sm:p-6 pt-0 pb-6">
                <Button type="submit" className="btn-gradient w-full text-sm py-2.5 rounded-md" disabled={isSubmitting || authContextLoading}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <User className="mr-1.5 h-4 w-4" />}Register</Button>
                <p className="mt-4 text-center text-xs text-muted-foreground">Already have an account?{' '}<button type="button" className="font-medium text-primary hover:underline focus:outline-none" onClick={() => handleTabChange('login')}>Login here</button></p>
              </CardFooter>
            </TabsContent>
          </form>
        </Tabs>
      </Card>
    </div>
  );
}

    
