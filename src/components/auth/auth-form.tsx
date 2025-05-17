
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, EyeOff, User, Mail, Lock, Loader2, Briefcase, ArrowRight, AlertTriangle, LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { CustomUser } from '@/types/supabase';

type AuthAction = 'login' | 'register';

const AUTH_ROUTE = '/auth';

export function AuthForm() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user, isLoading: authContextLoading, authError: contextAuthError, signIn, signUp } = useAuth();

  const initialAction = (searchParams.get('action') as AuthAction) || 'login';
  
  const [action, setAction] = useState<AuthAction>(initialAction);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<CustomUser['role'] | ''>('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const resetFormFields = React.useCallback(() => {
    setEmail(''); setPassword(''); setConfirmPassword(''); setFullName('');
    setRole(''); setShowPassword(false); setShowConfirmPassword(false); setFormError(null);
  }, []);

  useEffect(() => {
    const actionFromParams = (searchParams.get('action') as AuthAction) || 'login';
    const roleFromParams = searchParams.get('role') as CustomUser['role'] || '';
    
    if (actionFromParams !== action) {
      resetFormFields();
      setAction(actionFromParams);
    }
    if (actionFromParams === 'register' && roleFromParams && roleFromParams !== role) {
        setRole(roleFromParams);
    }
  }, [searchParams, action, role, resetFormFields]);
  
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    
    const trimmedEmail = email.trim();
    const trimmedFullName = fullName.trim();

    if (!trimmedEmail || !password) {
      setFormError("Email and password are required.");
      setIsSubmitting(false);
      return;
    }

    let result: { success: boolean; error?: string; user?: CustomUser | null };
    
    if (action === 'register') {
      if (!trimmedFullName) {
        setFormError("Full name is required for registration.");
        setIsSubmitting(false); return;
      }
      const selectedRole = role as CustomUser['role'];
      if (!selectedRole) {
        setFormError("Please select a role (Student or Teacher).");
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

      console.log('[AuthForm] Calling signUp from AuthContext...');
      result = await signUp(trimmedEmail, password, trimmedFullName, selectedRole);

      if (result.success && result.user) {
        toast({ title: "Registration Successful!", description: "Redirecting to dashboard..." });
        // AuthContext now handles navigation
      } else {
        setFormError(result.error || "An unknown error occurred during registration.");
        toast({ title: "Registration Error", description: result.error || "An unknown error occurred.", variant: "destructive" });
      }
    } else { // Login action
      console.log('[AuthForm] Calling signIn from AuthContext...');
      result = await signIn(trimmedEmail, password);
      if (result.success && result.user) {
        toast({ title: "Login Successful!", description: "Redirecting to dashboard..." });
        // AuthContext now handles navigation
      } else {
        setFormError(result.error || "Invalid credentials or server error.");
        toast({ title: "Login Error", description: result.error || "Invalid credentials or server error.", variant: "destructive" });
      }
    }
    setIsSubmitting(false);
  };
  
  if (authContextLoading && pathname === AUTH_ROUTE && user === null) {
    console.log('[AuthForm] AuthContext initial loading state on /auth. Showing AuthForm page loader.');
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)] py-12"> {/* Removed specific bg from wrapper */}
        <Card className="p-6 glass-card text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary mb-3"/>
            <p className="text-md font-medium text-foreground">Verifying session...</p>
        </Card>
      </div>
    );
  }

  if (!authContextLoading && user && pathname === AUTH_ROUTE) {
    console.log(`[AuthForm] User is authenticated (${user.email}), AuthContext loaded, but still on /auth. AuthContext should be redirecting. Displaying "Finalizing..." message.`);
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] py-12"> {/* Removed specific bg from wrapper */}
        <Card className="p-8 glass-card text-center shadow-xl">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary mb-4"/>
          <p className="text-lg font-semibold text-foreground">Finalizing session for {user.email}...</p>
          <p className="mt-1 text-sm text-muted-foreground">Redirecting to dashboard.</p>
        </Card>
      </div>
    );
  }
  
  console.log(`[AuthForm] Rendering form. authContextLoading: ${authContextLoading}, user: ${user?.email}, pathname: ${pathname}`);

  const handleTabChange = (value: string) => {
    setAction(value as AuthAction);
    resetFormFields();
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('action', value);
    
    const currentRoleParam = searchParams.get('role');
    if (value === 'register' && currentRoleParam) {
      newUrl.searchParams.set('role', currentRoleParam);
      setRole(currentRoleParam as CustomUser['role']);
    } else if (value === 'login') {
      newUrl.searchParams.delete('role');
    }
    router.replace(newUrl.toString(), { scroll: false });
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-10rem)] py-12 px-4"> {/* Removed specific bg from wrapper */}
      <Card className="w-full max-w-md modern-card shadow-xl border-border/50">
        <Tabs value={action} onValueChange={handleTabChange} className="w-full">
           <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-3">
            <TabsList className="grid w-full grid-cols-2 bg-muted/70 dark:bg-muted/40 p-1 rounded-md backdrop-blur-sm">
              <TabsTrigger 
                value="login" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:hover:bg-primary/90 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-primary data-[state=inactive]:hover:bg-primary/10 rounded-[0.3rem] py-2 text-sm font-medium transition-all"
              >
                Login
              </TabsTrigger>
              <TabsTrigger 
                value="register" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:hover:bg-primary/90 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-primary data-[state=inactive]:hover:bg-primary/10 rounded-[0.3rem] py-2 text-sm font-medium transition-all"
              >
                Register
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          
          <form onSubmit={handleAuth}>
            { (formError || contextAuthError) && (
              <div className="p-4 pt-0 sm:px-6 sm:pt-0">
                <div className="bg-destructive/10 border border-destructive/30 text-destructive p-3 rounded-md text-sm flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0"/>
                  <div>
                    <p className="font-medium">Authentication Error</p>
                    {formError && <p>{formError}</p>}
                    {contextAuthError && !formError && <p>{contextAuthError}</p>} 
                  </div>
                </div>
              </div>
            )}
            <TabsContent value="login">
              <CardHeader className="text-center pt-4 sm:pt-6 pb-3">
                <CardTitle className="text-2xl font-semibold text-foreground">Welcome Back!</CardTitle>
                <CardDescription className="text-muted-foreground pt-1 text-sm">Access your ZenTest account.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-4 sm:p-6 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="login-email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="login-email" type="email" placeholder="you@example.com" 
                      value={email} onChange={(e) => setEmail(e.target.value)} required 
                      className="pl-10 modern-input" 
                      autoComplete="email" 
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="login-password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" 
                      value={password} onChange={(e) => setPassword(e.target.value)} required 
                      className="pl-10 pr-10 modern-input" 
                      autoComplete="current-password" 
                    />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col p-4 sm:p-6 pt-0 pb-6">
                <Button type="submit" className="btn-gradient w-full text-sm py-2.5 rounded-md" disabled={isSubmitting || authContextLoading}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-1.5 h-4 w-4" />}
                  {isSubmitting ? 'Logging in...' : 'Login'}
                </Button>
                <p className="mt-4 text-center text-xs text-muted-foreground">
                  Don&apos;t have an account?{' '}
                  <button type="button" className="font-medium text-primary hover:underline focus:outline-none" onClick={() => handleTabChange('register')}>
                    Register here
                  </button>
                </p>
              </CardFooter>
            </TabsContent>

            <TabsContent value="register">
              <CardHeader className="text-center pt-4 sm:pt-6 pb-3">
                <CardTitle className="text-2xl font-semibold text-foreground">Create Account</CardTitle>
                <CardDescription className="text-muted-foreground pt-1 text-sm">Join ZenTest. It&apos;s quick and easy.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3.5 p-4 sm:p-6 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="register-fullname">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="register-fullname" placeholder="John Doe" value={fullName} 
                      onChange={(e) => setFullName(e.target.value)} required 
                      className="pl-10 modern-input" 
                      autoComplete="name" 
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="register-email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="register-email" type="email" placeholder="you@example.com" 
                      value={email} onChange={(e) => setEmail(e.target.value)} required 
                      className="pl-10 modern-input" 
                      autoComplete="email" 
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="register-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="register-password" type={showPassword ? 'text' : 'password'} placeholder="•••••••• (min. 6 characters)" 
                      value={password} onChange={(e) => setPassword(e.target.value)} required 
                      className="pl-10 pr-10 modern-input" 
                      autoComplete="new-password" 
                    />
                     <Button type="button" variant="ghost" size="icon" className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="confirm-password" type={showConfirmPassword ? 'text' : 'password'} placeholder="••••••••" 
                      value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required 
                      className="pl-10 pr-10 modern-input" 
                      autoComplete="new-password" 
                    />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label={showConfirmPassword ? "Hide password" : "Show password"}>
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="register-role">Register as</Label>
                  <div className="relative">
                     <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                    <Select value={role || ''} onValueChange={(value) => setRole(value as CustomUser['role'])} required>
                      <SelectTrigger id="register-role" className="pl-10 modern-input"> {/* Added modern-input */}
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border shadow-lg rounded-md">
                        <SelectItem value="student" className="py-2 text-sm hover:bg-primary/10 focus:bg-primary/10 text-popover-foreground">Student</SelectItem>
                        <SelectItem value="teacher" className="py-2 text-sm hover:bg-primary/10 focus:bg-primary/10 text-popover-foreground">Teacher</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col p-4 sm:p-6 pt-0 pb-6">
                <Button type="submit" className="btn-gradient w-full text-sm py-2.5 rounded-md" disabled={isSubmitting || authContextLoading}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <User className="mr-1.5 h-4 w-4" />}
                  {isSubmitting ? 'Registering...' : 'Create Account'}
                </Button>
                <p className="mt-4 text-center text-xs text-muted-foreground">
                  Already have an account?{' '}
                  <button type="button" className="font-medium text-primary hover:underline focus:outline-none" onClick={() => handleTabChange('login')}>
                    Login here
                  </button>
                </p>
              </CardFooter>
            </TabsContent>
          </form>
        </Tabs>
      </Card>
    </div>
  );
}
